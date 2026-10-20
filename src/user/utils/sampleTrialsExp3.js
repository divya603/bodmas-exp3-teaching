// Draws one participant's trial list for Experiment 3, design v2 (HANDOFF.md
// §0, agreed 2026-10-02). Pool: data/stimuli_exp3.json (built by
// base-task/stimuli_exp3.py). Advice: data/advice_exp3.json. Unit tests:
// tests/vitest/user/sampleTrialsExp3.test.js.
//
// Per participant (with the default CONFIG, 12 trials):
//   - every misconception appears once per error type (6 systematic, 6 slip),
//     each trial on a DIFFERENT set, so no problem is ever shown twice
//   - systematic: all 3 problems show the misconceived work
//     slip: one problem shows it, the other two the correct work; the wrong
//     problem's position is spread evenly over 1, 2, 3 (2 each), shuffled
//   - six-pairs branch (pilot, 2026-10-20): each trial shows 2 of the 4
//     advice types, and all 6 pair types are used: rule vs flag, rule vs
//     example, rule vs correction, example vs flag, example vs correction,
//     flag vs correction. So 4 pairs cross scope (policy vs instance) and 2
//     stay within it (rule vs example, flag vs correction). Each pair type
//     appears once among the systematic trials and once among the slip
//     trials, randomly matched to misconceptions; left/right is random
//   - flag and correction always point at the SAME problem and its error step.
//     slip: the wrong problem. systematic (six-pairs change, 2026-10-20; main
//     always used problem 1): one of the 3 wrong problems, spread evenly
//     over 1, 2, 3 (2 each over the 6 systematic trials), shuffled
//   - trial order is random, with no misconception on two trials in a row
// Smile has no cross-participant counter, so balance ACROSS participants
// (which set meets which condition) holds in expectation only.

export const CONFIG = {
  errorTypes: ['systematic', 'slip'],
  trialsPerMisconceptionPerErrorType: 1, // 1 -> 12 trials; 2 -> 24
  // the 6 pair types, each [a, b]; every one appears equally often within each error type
  pairTypes: [
    ['rule', 'flag'],
    ['rule', 'example'],
    ['rule', 'correction'],
    ['example', 'flag'],
    ['example', 'correction'],
    ['flag', 'correction'],
  ],
  slipPositions: [1, 2, 3],
  maxOrderAttempts: 10000,
}

const STUDENT_NAMES = [
  'Noah', 'Maya', 'Liam', 'Ava', 'Ethan', 'Zoe',
  'Mia', 'Lucas', 'Emma', 'Owen', 'Sofia', 'Caleb',
  'Ruby', 'Jonah', 'Isla', 'Felix', 'Nora', 'Dylan',
  'Priya', 'Marcus', 'Elena', 'Theo', 'Jasmine', 'Omar',
]

// Small seeded PRNG (mulberry32) so a given seed always reproduces the same list.
function makeRng(seed) {
  let s = seed >>> 0
  function next() {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },
  }
}

// n values cycling through `values`, then shuffled: as even a spread as n allows.
function evenSpread(rng, values, n) {
  return rng.shuffle(Array.from({ length: n }, (_, i) => values[i % values.length]))
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]))
}

// The displayed problems for one trial, plus where flag/correction point
// (targetPosition: which wrong problem they name; a slip trial has only one).
function buildProblems(set, errorType, slipPosition, targetPosition) {
  const problems = set.problems.map((p) => {
    const isError = errorType === 'systematic' || p.problem_index === slipPosition
    return {
      problem_index: p.problem_index,
      expression: p.expression,
      lines: isError ? p.misconceived_trace : p.correct_trace,
      offsets: isError ? p.misconceived_offsets : p.correct_offsets,
      is_error: isError,
      error_step: isError ? p.error_step : null,
    }
  })
  const named = set.problems.find((p) => p.problem_index === targetPosition)
  if (!problems[targetPosition - 1].is_error) throw new Error(`problem ${targetPosition} is not wrong`)
  return {
    problems,
    target: {
      problem: named.problem_index,
      step: named.error_step,
      right_pair: named.right_pair,
      wrong_pair: named.wrong_pair,
    },
  }
}

function adviceOption(code, misconception, target, advice) {
  if (code === 'rule' || code === 'example') {
    return { code, scope: 'policy', form: code === 'rule' ? 'abstract' : 'concrete',
             text: advice.by_misconception[misconception][code] }
  }
  return { code, scope: 'instance', form: code === 'flag' ? 'abstract' : 'concrete',
           text: fill(advice.templates[code], target) }
}

function hasConsecutiveRepeat(trials) {
  return trials.some((t, i) => i > 0 && t.misconception_id === trials[i - 1].misconception_id)
}

export function sampleTrialsExp3(pool, advice, seed, config = CONFIG) {
  const rng = makeRng(seed)
  const misconceptions = [...new Set(pool.sets.map((s) => s.misconception))]

  // 1. which set each (misconception, error type, repeat) cell gets: distinct sets
  const cells = []
  for (const m of misconceptions) {
    const sets = rng.shuffle(pool.sets.filter((s) => s.misconception === m))
    const need = config.errorTypes.length * config.trialsPerMisconceptionPerErrorType
    if (sets.length < need) throw new Error(`pool has only ${sets.length} sets for ${m}`)
    let k = 0
    for (const errorType of config.errorTypes) {
      for (let r = 0; r < config.trialsPerMisconceptionPerErrorType; r++) {
        cells.push({ misconception: m, errorType, set: sets[k++] })
      }
    }
  }

  // 2. pair types: within each error type, each pair type equally often, randomly placed
  for (const errorType of config.errorTypes) {
    const typeCells = cells.filter((c) => c.errorType === errorType)
    if (typeCells.length % config.pairTypes.length !== 0) {
      throw new Error(`${typeCells.length} ${errorType} trials do not split evenly over ${config.pairTypes.length} pair types`)
    }
    const pairList = evenSpread(rng, config.pairTypes, typeCells.length)
    typeCells.forEach((c, i) => (c.pair = pairList[i]))
  }

  // 3. slip positions: spread evenly over 1..3, shuffled
  const slipCells = cells.filter((c) => c.errorType === 'slip')
  const slipList = evenSpread(rng, config.slipPositions, slipCells.length)
  slipCells.forEach((c, i) => (c.slipPosition = slipList[i]))

  // 3b. which wrong problem flag/correction name in systematic trials: spread evenly over 1..3, shuffled
  const sysCells = cells.filter((c) => c.errorType === 'systematic')
  const targetList = evenSpread(rng, config.slipPositions, sysCells.length)
  sysCells.forEach((c, i) => (c.targetPosition = targetList[i]))

  // 4. build trials
  const names = rng.shuffle(STUDENT_NAMES.slice())
  let trials = cells.map((c, i) => {
    const [a, b] = c.pair
    const slipPosition = c.errorType === 'slip' ? c.slipPosition : null
    const targetPosition = c.errorType === 'slip' ? slipPosition : c.targetPosition
    const { problems, target } = buildProblems(c.set, c.errorType, slipPosition, targetPosition)
    const opts = [adviceOption(a, c.misconception, target, advice),
                  adviceOption(b, c.misconception, target, advice)]
    const scopes = opts.map((o) => o.scope)
    const cross = scopes[0] !== scopes[1]
    if (rng.next() < 0.5) opts.reverse()
    return {
      misconception_id: c.misconception,
      set_id: c.set.set_id,
      error_type: c.errorType,
      slip_position: slipPosition,
      pair_type: `${a}_vs_${b}`,
      // policy_vs_instance (the 4 cross-scope pairs), policy_only (rule vs example), instance_only (flag vs correction)
      pair_kind: cross ? 'policy_vs_instance' : `${scopes[0]}_only`,
      // as in the main study, for the cross-scope pairs only (null when both options share a scope)
      policy_option: cross ? opts.find((o) => o.scope === 'policy').code : null,
      instance_option: cross ? opts.find((o) => o.scope === 'instance').code : null,
      left_option: opts[0].code,
      right_option: opts[1].code,
      options: opts,
      problems,
      target,
      student_name: names[i % names.length],
    }
  })

  // 5. order: shuffle until no misconception repeats on consecutive trials
  for (let a = 0; ; a++) {
    rng.shuffle(trials)
    if (!hasConsecutiveRepeat(trials)) break
    if (a >= config.maxOrderAttempts) throw new Error('could not order trials without repeats')
  }
  return trials.map((t, i) => ({ trial_index: i, ...t }))
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31)
}
