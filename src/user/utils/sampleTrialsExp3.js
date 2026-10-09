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
//   - each trial shows one policy option (rule | example) and one instance
//     option (flag | correction); each of the 4 pairings appears equally
//     often (3 each), randomly assigned to trials; left/right is random
//   - flag and correction point at the first erroneous problem's error step
//   - trial order is random, with no misconception on two trials in a row
// Smile has no cross-participant counter, so balance ACROSS participants
// (which set meets which condition) holds in expectation only.
//
// The helpers (makeRng, evenSpread, buildProblems, adviceOption,
// STUDENT_NAMES) are also used by sampleDeferral.js on the deferral branch.

export const CONFIG = {
  errorTypes: ['systematic', 'slip'],
  trialsPerMisconceptionPerErrorType: 1, // 1 -> 12 trials; 2 -> 24
  policyOptions: ['rule', 'example'],
  instanceOptions: ['flag', 'correction'],
  slipPositions: [1, 2, 3],
  maxOrderAttempts: 10000,
}

export const STUDENT_NAMES = [
  'Noah', 'Maya', 'Liam', 'Ava', 'Ethan', 'Zoe',
  'Mia', 'Lucas', 'Emma', 'Owen', 'Sofia', 'Caleb',
  'Ruby', 'Jonah', 'Isla', 'Felix', 'Nora', 'Dylan',
  'Priya', 'Marcus', 'Elena', 'Theo', 'Jasmine', 'Omar',
]

// Small seeded PRNG (mulberry32) so a given seed always reproduces the same list.
export function makeRng(seed) {
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
export function evenSpread(rng, values, n) {
  return rng.shuffle(Array.from({ length: n }, (_, i) => values[i % values.length]))
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]))
}

// The displayed problems for one trial, plus where flag/correction point.
export function buildProblems(set, errorType, slipPosition) {
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
  const first = set.problems.find((p) => problems[p.problem_index - 1].is_error)
  return {
    problems,
    target: {
      problem: first.problem_index,
      step: first.error_step,
      right_pair: first.right_pair,
      wrong_pair: first.wrong_pair,
    },
  }
}

export function adviceOption(code, misconception, target, advice) {
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

  // 2. pairings: each (policy, instance) pair equally often, randomly placed
  const pairings = config.policyOptions.flatMap((p) => config.instanceOptions.map((i) => [p, i]))
  if (cells.length % pairings.length !== 0) {
    throw new Error(`${cells.length} trials do not split evenly over ${pairings.length} pairings`)
  }
  const pairingList = evenSpread(rng, pairings, cells.length)

  // 3. slip positions: spread evenly over 1..3, shuffled
  const slipCells = cells.filter((c) => c.errorType === 'slip')
  const slipList = evenSpread(rng, config.slipPositions, slipCells.length)
  slipCells.forEach((c, i) => (c.slipPosition = slipList[i]))

  // 4. build trials
  const names = rng.shuffle(STUDENT_NAMES.slice())
  let trials = cells.map((c, i) => {
    const [policy, instance] = pairingList[i]
    const slipPosition = c.errorType === 'slip' ? c.slipPosition : null
    const { problems, target } = buildProblems(c.set, c.errorType, slipPosition)
    const opts = [adviceOption(policy, c.misconception, target, advice),
                  adviceOption(instance, c.misconception, target, advice)]
    if (rng.next() < 0.5) opts.reverse()
    return {
      misconception_id: c.misconception,
      set_id: c.set.set_id,
      error_type: c.errorType,
      slip_position: slipPosition,
      policy_option: policy,
      instance_option: instance,
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
