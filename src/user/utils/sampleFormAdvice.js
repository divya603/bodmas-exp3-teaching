// Draws one participant's 24-trial form for Experiment 3 (advice). Python
// twin: base-task/sample_form_advice.py. Both use the same PRNG (mulberry32)
// and the same sequence of draws, so one seed gives the identical form,
// including the same advice text, in both languages. Change one, change the
// other, then rerun base-task/sample_form_advice.py and this file's parity
// check (base-task/sample_form_advice_parity.mjs).
//
// Design (decided 2026-09-16, see HANDOFF.md §0): 4 trials per misconception
// (the rule the shown trace actually exhibits), 8 per advice type (1 general
// rule, 2 step-level on the student's own expression, 3 step-level on a
// curated expression), 12 right (helpful) / 12 wrong (unhelpful); 2 right / 2
// wrong within each misconception, 4 / 4 within each type. Four trials per
// misconception cannot split evenly over three types, so each misconception
// fills one row of ROWS: one type twice (once right, once wrong), the other
// two once. Which misconception gets which row is a random permutation per
// participant (Smile has no cross-participant counter, so the 36
// misconception x type x correctness cells balance in expectation).
//
// The TRACE for every cell is drawn from that row's misconception; the ADVICE
// TEXT is what varies by (type, right/wrong):
//   type 1 right -> the misconception's own TYPE1_ADVICE.right
//   type 1 wrong -> TYPE1_ADVICE.wrong of a RANDOMLY drawn misconception
//   type 2 right -> the trace's own precomputed type2.right
//   type 2 wrong -> the trace's own precomputed type2.wrong (self-referential)
//   type 3 right -> a random TYPE3 entry of the misconception's own bank, .right
//   type 3 wrong -> a random TYPE3 entry of a RANDOMLY drawn misconception's bank, .wrong
// No trace (base_id) is drawn twice, so no expression repeats. Trial order is
// shuffled, and the 24 names are shuffled so each appears exactly once.

const IDS = [
  'add_before_mul',
  'add_before_div',
  'sub_before_mul',
  'sub_before_div',
  'same_priority_rtl',
  'outside_bracket_first',
]

const TYPES = ['type1', 'type2', 'type3']

// [type, R|W] cells per row; R = right (helpful), W = wrong (unhelpful).
const ROWS = [
  [['type1', 'R'], ['type1', 'W'], ['type2', 'R'], ['type3', 'W']],
  [['type1', 'R'], ['type1', 'W'], ['type2', 'W'], ['type3', 'R']],
  [['type1', 'R'], ['type2', 'R'], ['type2', 'W'], ['type3', 'W']],
  [['type1', 'W'], ['type2', 'R'], ['type2', 'W'], ['type3', 'R']],
  [['type1', 'R'], ['type2', 'W'], ['type3', 'R'], ['type3', 'W']],
  [['type1', 'W'], ['type2', 'R'], ['type3', 'R'], ['type3', 'W']],
]

// One name per trial (24), so no participant ever sees the same student
// twice. Keep in sync with STUDENT_NAMES in base-task/pool_advice.py.
const STUDENT_NAMES = [
  'Noah', 'Maya', 'Liam', 'Ava', 'Ethan', 'Zoe',
  'Mia', 'Lucas', 'Emma', 'Owen', 'Sofia', 'Caleb',
  'Ruby', 'Jonah', 'Isla', 'Felix', 'Nora', 'Dylan',
  'Priya', 'Marcus', 'Elena', 'Theo', 'Jasmine', 'Omar',
]

// Small seeded PRNG (mulberry32) so a given seed always reproduces the same form.
function makeRng(seed) {
  let s = seed >>> 0
  function next() {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    choice(arr) {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },
  }
}

// {advice_text, advice_misconception} for cell (type, rw) on a trace whose
// own misconception is m. advice_misconception is the bank the text came
// from: always m for a right pick, a (possibly different) random pick for a
// wrong one.
function pickAdvice(rng, item, m, type, rw, type1Bank, type3Bank) {
  if (type === 'type1') {
    if (rw === 'R') return { text: type1Bank[m].right, named: m }
    const named = rng.choice(IDS)
    return { text: type1Bank[named].wrong, named }
  }
  if (type === 'type2') {
    return { text: rw === 'R' ? item.type2.right : item.type2.wrong, named: m }
  }
  // type3
  if (rw === 'R') {
    const entry = rng.choice(type3Bank[m])
    return { text: entry.right, named: m }
  }
  const named = rng.choice(IDS)
  const entry = rng.choice(type3Bank[named])
  return { text: entry.wrong, named }
}

export function sampleFormAdvice(pool, type1Bank, type3Bank, seed) {
  const rng = makeRng(seed)
  const rows = rng.shuffle(IDS.slice()) // rows[r] = the misconception filling ROWS[r]
  const form = []
  const used = new Set()
  rows.forEach((m, r) => {
    for (const [type, rw] of ROWS[r]) {
      const members = pool.filter((it) => it.misconception === m && !used.has(it.base_id))
      const item = rng.choice(members)
      used.add(item.base_id)
      const { text, named } = pickAdvice(rng, item, m, type, rw, type1Bank, type3Bank)
      form.push({
        ...item,
        advice_type: type,
        advice_correct: rw === 'R',
        advice_text: text,
        advice_misconception: named,
      })
    }
  })
  rng.shuffle(form)

  const names = rng.shuffle(STUDENT_NAMES.slice())
  return form.map((it, i) => ({ ...it, student_name: names[i] }))
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31)
}
