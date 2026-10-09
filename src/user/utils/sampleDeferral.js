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
// both marks each problem and picks one of the two advice options. Which AI
// types to run is NOT decided yet (user, 2026-10-08): AI_ARMS lists the four
// candidates, and AI_MARK_ACCURACY sets how often its marks are right.

import { STUDENT_NAMES, makeRng, evenSpread, buildProblems, adviceOption } from './sampleTrialsExp3'

export const N_BLOCK = { 1: 6, 2: 6, 3: 6 }
export const BLOCK_MODE = { 1: 'self', 2: 'self_then_ai', 3: 'choose' }

// Candidate AIs: which advice scope each picks for a systematic / slip trial.
export const AI_TYPES = {
  right: { systematic: 'policy', slip: 'instance' }, // the H1 pattern
  wrong: { systematic: 'instance', slip: 'policy' }, // the reverse
  policy: { systematic: 'policy', slip: 'policy' }, // always policy advice
  instance: { systematic: 'instance', slip: 'instance' }, // always instance advice
}
export const AI_ARMS = ['right', 'wrong', 'policy', 'instance'] // TBD: which arms to run
export const AI_MARK_ACCURACY = 1.0 // P(each AI mark is correct); TBD

const POLICY = ['rule', 'example']
const INSTANCE = ['flag', 'correction']
const PAIRINGS = POLICY.flatMap((p) => INSTANCE.map((i) => [p, i]))
const SLIP_POSITIONS = [1, 2, 3]

// The AI's work on one trial: a right/wrong mark per problem and an advice pick.
export function aiResponse(trial, aiType, rng, markAccuracy = AI_MARK_ACCURACY) {
  const scope = AI_TYPES[aiType][trial.error_type]
  const marks = trial.problems.map((p) => {
    const truth = p.is_error ? 'wrong' : 'right'
    if (rng.next() < markAccuracy) return truth
    return truth === 'wrong' ? 'right' : 'wrong'
  })
  const code = scope === 'policy' ? trial.policy_option : trial.instance_option
  return {
    ai_type: aiType,
    ai_marks: marks,
    ai_marks_correct: marks.map((m, i) => m === (trial.problems[i].is_error ? 'wrong' : 'right')),
    ai_choice: code,
    ai_choice_scope: scope,
    ai_choice_side: trial.left_option === code ? 'left' : 'right',
  }
}

function pickSystematic(rng, misconceptions, block, prev) {
  const half = misconceptions.length / 2
  if (block === 2) return misconceptions.filter((m) => !prev.has(m)) // the complement of block 1
  return new Set(rng.shuffle(misconceptions.slice()).slice(0, half))
}

export function sampleDeferral(pool, advice, seed, aiType, opts = {}) {
  const nBlock = opts.nBlock ?? N_BLOCK
  const markAccuracy = opts.markAccuracy ?? AI_MARK_ACCURACY
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
        ...aiResponse(t, aiType, rng, markAccuracy),
      })
    })
  }
  return out.map((t, i) => ({ trial_index: i, ...t }))
}
