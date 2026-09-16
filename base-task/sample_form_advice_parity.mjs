// Checks that the live JS sampler (src/user/utils/sampleFormAdvice.js) draws
// exactly the forms its Python twin does, including the sampled advice text.
//
//   cd base-task && python3 sample_form_advice.py --dump 500 | node sample_form_advice_parity.mjs
//
// Exits non-zero on any mismatch.
import { readFileSync } from 'fs'
import { sampleFormAdvice } from '../src/user/utils/sampleFormAdvice.js'

const pool = JSON.parse(readFileSync(new URL('../src/user/data/stimulus_pool_advice.json', import.meta.url), 'utf8'))
const banks = JSON.parse(readFileSync(new URL('../src/user/data/advice_banks.json', import.meta.url), 'utf8'))
const py = JSON.parse(readFileSync(0, 'utf8'))

let same = 0
py.forEach((form, seed) => {
  const js = sampleFormAdvice(pool, banks.type1, banks.type3, seed).map((it) => [
    it.base_id,
    it.student_name,
    it.advice_type,
    it.advice_correct,
    it.advice_misconception,
    it.advice_text,
  ])
  if (JSON.stringify(js) === JSON.stringify(form)) same++
  else console.log(`seed ${seed} differs`)
})
console.log(`${same}/${py.length} seeds: JS form identical to Python`)
process.exit(same === py.length ? 0 : 1)
