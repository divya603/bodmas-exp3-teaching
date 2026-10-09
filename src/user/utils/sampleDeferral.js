// Draws one participant's trials for the DEFERRAL experiment (deferral
// branch; HANDOFF "Deferral experiment"). Same paradigm as the function task's
// deferral study (Func-Smile-deferral): three phases, one AI per participant.
//   Phase 1: the participant does each trial (open, mark, choose advice).
//   Phase 2: the participant does each trial, then sees the AI's work on it.
//   Phase 3: one choice for the whole phase: do it themselves, or defer to the
//            AI and watch it do the trials.
// Pool: data/stimuli_exp3.json. Advice: data/advice_exp3.json. Tests:
// tests/vitest/user/sampleDeferral.test.js.
//
// Each block (phase) of N_BLOCK trials, with the default 6:
//   - every misconception once, each on a set never used elsewhere in the session
//   - 3 systematic + 3 slip; the misconceptions that are systematic in block 1
//     are the slips in block 2 (so each misconception meets both error types);
//     block 3 is a fresh random split
//   - slip positions 1, 2, 3 once each, shuffled
//   - pairings: each of the 4 (policy x instance) pairings once, plus 2 drawn at
//     random (user, 2026-10-08); left/right random
//   - order shuffled; no misconception on consecutive trials across a block edge
//
// The AI (one per participant, a between-subjects condition set in design.js)
// both marks each problem and picks one of the two advice options. Four types
// (user, 2026-10-09):
//   right      policy advice for systematic, instance for slip (the H1 pattern);
//              every mark right
//   markslip   the same advice as `right`, but exactly one of its three marks is
//              wrong on every trial (which one is random)
//   agree      RUNTIME: in Phase 2, the participant's own marks and advice pick
//   disagree   RUNTIME: in Phase 2, every mark flipped and the other advice option
// `right` / `markslip` are fixed here at sampling time. `agree` / `disagree`
// leave the ai_* fields null: Phase 2 is computed from the participant's
// answer (runtimeAIPhase2) and Phase 3 is fixed at the Phase 3 choice
// (phase3AIAnswers), count-matched to the participant's Phases 1+2, as the
// function task's aligned / misaligned arms are to its Part 2.

import { STUDENT_NAMES, makeRng, evenSpread, buildProblems, adviceOption } from './sampleTrialsExp3'

export const N_BLOCK = { 1: 6, 2: 6, 3: 6 }
export const BLOCK_MODE = { 1: 'self', 2: 'self_then_ai', 3: 'choose' }

const H1 = { systematic: 'policy', slip: 'instance' }
export const AI_TYPES = {
  right: { advice: H1, marks: 'all_right' },
  markslip: { advice: H1, marks: 'one_wrong' },
  agree: { runtime: 'agree' },
  disagree: { runtime: 'disagree' },
}
export const AI_ARMS = Object.keys(AI_TYPES) // assigned between subjects in design.js
export const isRuntimeAI = (aiType) => Boolean(AI_TYPES[aiType]?.runtime)

const POLICY = ['rule', 'example']
const INSTANCE = ['flag', 'correction']
const PAIRINGS = POLICY.flatMap((p) => INSTANCE.map((i) => [p, i]))
const SLIP_POSITIONS = [1, 2, 3]

const truthOf = (p) => (p.is_error ? 'wrong' : 'right')
const flip = (m) => (m === 'wrong' ? 'right' : 'wrong')
const roundHalfUp = (x) => Math.floor(x + 0.5 + 1e-9)

// ai_* fields for a trial, given the AI's marks and advice pick
function aiFields(trial, aiType, marks, code) {
  const opt = trial.options.find((o) => o.code === code)
  return {
    ai_type: aiType,
    ai_marks: marks,
    ai_marks_correct: marks.map((m, i) => m === truthOf(trial.problems[i])),
    ai_choice: code,
    ai_choice_scope: opt.scope,
    ai_choice_side: trial.left_option === code ? 'left' : 'right',
  }
}
const nullAI = (aiType) => ({
  ai_type: aiType, ai_marks: null, ai_marks_correct: null, ai_choice: null, ai_choice_scope: null, ai_choice_side: null,
})

// Precomputed AI (right / markslip): its work on one trial.
export function aiResponse(trial, aiType, rng) {
  const def = AI_TYPES[aiType]
  if (def.runtime) return nullAI(aiType)
  const marks = trial.problems.map(truthOf)
  if (def.marks === 'one_wrong') {
    const k = Math.floor(rng.next() * marks.length)
    marks[k] = flip(marks[k])
  }
  const scope = def.advice[trial.error_type]
  return aiFields(trial, aiType, marks, scope === 'policy' ? trial.policy_option : trial.instance_option)
}

// Runtime AI, Phase 2: from the participant's submitted marks ('right' | 'wrong'
// per problem) and advice pick (an option code).
export function runtimeAIPhase2(trial, aiType, ownMarks, ownChoice) {
  const other = trial.options.find((o) => o.code !== ownChoice).code
  if (aiType === 'agree') return aiFields(trial, aiType, ownMarks.slice(), ownChoice)
  if (aiType === 'disagree') return aiFields(trial, aiType, ownMarks.map(flip), other)
  throw new Error(`runtimeAIPhase2: not a runtime AI: ${aiType}`)
}

// One history entry per Phase 1-2 trial the participant answered.
export function historyEntry(trial, ownMarks, ownChoice) {
  return {
    error_type: trial.error_type,
    problems: trial.problems.map((p, i) => ({ is_error: p.is_error, mark_correct: ownMarks[i] === truthOf(p) })),
    choose_policy: trial.options.find((o) => o.code === ownChoice).scope === 'policy',
  }
}

// pick n of the items at random (the rest are the complement)
function pickN(items, n, rng) {
  return new Set(rng.shuffle(items.slice()).slice(0, n))
}

// Runtime AI, Phase 3: fixed at the Phase 3 choice from the participant's
// Phases 1+2 (`history`), count-matched:
//   marks   for actually-wrong problems and actually-right problems separately,
//           `agree` marks correctly round-half-up(own accuracy x m) of the m
//           Phase 3 problems of that kind; `disagree` the complement
//   advice  for systematic and slip trials separately, `agree` picks policy
//           on round-half-up(own policy share x m) of the m Phase 3 trials of
//           that type; `disagree` the complement
// Returns { byTrial: {trial_index: ai_* fields}, summary }.
export function phase3AIAnswers(phase3Trials, aiType, history, seed) {
  if (!isRuntimeAI(aiType)) throw new Error(`phase3AIAnswers: not a runtime AI: ${aiType}`)
  const rng = makeRng((seed ^ 0x5eed3) >>> 0)
  const agree = aiType === 'agree'
  const summary = { phase3_rule: 'count_matched_phases_1_2', ai_type: aiType }

  // marks
  const slots = phase3Trials.flatMap((t) => t.problems.map((p, i) => ({ t, i, kind: p.is_error ? 'wrong' : 'right' })))
  const marksOf = new Map(phase3Trials.map((t) => [t.trial_index, t.problems.map(truthOf)]))
  const allOwn = history.flatMap((h) => h.problems)
  for (const kind of ['wrong', 'right']) {
    const own = allOwn.filter((p) => (p.is_error ? 'wrong' : 'right') === kind)
    const base = own.length ? own : allOwn
    const acc = base.length ? base.filter((p) => p.mark_correct).length / base.length : 1
    const ks = slots.filter((s) => s.kind === kind)
    const nAgree = roundHalfUp(acc * ks.length)
    const nRight = agree ? nAgree : ks.length - nAgree
    const rightSet = pickN(ks, nRight, rng)
    for (const s of ks) if (!rightSet.has(s)) marksOf.get(s.t.trial_index)[s.i] = flip(kind)
    summary[`own_mark_accuracy_${kind}_problems`] = acc
    summary[`ai_marks_right_${kind}_problems`] = `${nRight}/${ks.length}`
  }

  // advice
  const pickOf = new Map()
  for (const et of ['systematic', 'slip']) {
    const own = history.filter((h) => h.error_type === et)
    const share = own.length ? own.filter((h) => h.choose_policy).length / own.length : 0.5
    const ts = phase3Trials.filter((t) => t.error_type === et)
    const nAgree = roundHalfUp(share * ts.length)
    const nPolicy = agree ? nAgree : ts.length - nAgree
    const policySet = pickN(ts, nPolicy, rng)
    for (const t of ts) pickOf.set(t.trial_index, policySet.has(t) ? t.policy_option : t.instance_option)
    summary[`own_policy_share_${et}`] = share
    summary[`ai_policy_${et}`] = `${nPolicy}/${ts.length}`
  }

  const byTrial = {}
  for (const t of phase3Trials) byTrial[t.trial_index] = aiFields(t, aiType, marksOf.get(t.trial_index), pickOf.get(t.trial_index))
  return { byTrial, summary }
}

function pickSystematic(rng, misconceptions, block, prev) {
  const half = misconceptions.length / 2
  if (block === 2) return misconceptions.filter((m) => !prev.has(m)) // the complement of block 1
  return new Set(rng.shuffle(misconceptions.slice()).slice(0, half))
}

export function sampleDeferral(pool, advice, seed, aiType, opts = {}) {
  const nBlock = opts.nBlock ?? N_BLOCK
  if (!AI_TYPES[aiType]) throw new Error(`unknown AI type ${aiType}`)
  const rng = makeRng(seed)
  const misconceptions = [...new Set(pool.sets.map((s) => s.misconception))]
  const blocks = Object.keys(nBlock).map(Number)

  // one distinct set per misconception per block
  const setsFor = {}
  for (const m of misconceptions) {
    const sets = rng.shuffle(pool.sets.filter((s) => s.misconception === m))
    if (sets.length < blocks.length) throw new Error(`pool has only ${sets.length} sets for ${m}`)
    setsFor[m] = sets
  }

  const names = rng.shuffle(STUDENT_NAMES.slice())
  const out = []
  let systematic = new Set()
  for (const [bi, block] of blocks.entries()) {
    const n = nBlock[block]
    if (n !== misconceptions.length) throw new Error(`block ${block}: ${n} trials, but ${misconceptions.length} misconceptions`)
    const sysSet = new Set(pickSystematic(rng, misconceptions, block, systematic))
    systematic = sysSet

    const slipPositions = evenSpread(rng, SLIP_POSITIONS, n - sysSet.size)
    const pairs = rng.shuffle([
      ...PAIRINGS,
      ...Array.from({ length: n - PAIRINGS.length }, () => PAIRINGS[Math.floor(rng.next() * PAIRINGS.length)]),
    ])

    let slipK = 0
    let trials = misconceptions.map((m, k) => {
      const errorType = sysSet.has(m) ? 'systematic' : 'slip'
      const slipPosition = errorType === 'slip' ? slipPositions[slipK++] : null
      const set = setsFor[m][bi]
      const [policy, instance] = pairs[k]
      const { problems, target } = buildProblems(set, errorType, slipPosition)
      const opts2 = [adviceOption(policy, m, target, advice), adviceOption(instance, m, target, advice)]
      if (rng.next() < 0.5) opts2.reverse()
      return {
        block,
        mode: BLOCK_MODE[block],
        misconception_id: m,
        set_id: set.set_id,
        error_type: errorType,
        slip_position: slipPosition,
        policy_option: policy,
        instance_option: instance,
        left_option: opts2[0].code,
        right_option: opts2[1].code,
        options: opts2,
        problems,
        target,
      }
    })

    // shuffle; avoid repeating the previous block's last misconception first
    const lastM = out.length ? out[out.length - 1].misconception_id : null
    do rng.shuffle(trials)
    while (trials[0].misconception_id === lastM)

    trials.forEach((t, i) => {
      out.push({
        ...t,
        block_index: i,
        student_name: names[out.length % names.length],
        ...aiResponse(t, aiType, rng),
      })
    })
  }
  return out.map((t, i) => ({ trial_index: i, ...t }))
}
