import { describe, it, expect } from 'vitest'
import pool from '@/user/data/stimuli_exp3.json'
import advice from '@/user/data/advice_exp3.json'
import { sampleTrialsExp3, CONFIG } from '@/user/utils/sampleTrialsExp3'

const N_SEEDS = 2000
const forms = Array.from({ length: N_SEEDS }, (_, seed) => [seed, sampleTrialsExp3(pool, advice, seed)])
const count = (xs) => xs.reduce((acc, x) => ((acc[x] = (acc[x] || 0) + 1), acc), {})
const MISCONCEPTIONS = [...new Set(pool.sets.map((s) => s.misconception))]

describe('sampleTrialsExp3, per participant', () => {
  it('gives 12 trials, indexed 0..11', () => {
    for (const [, f] of forms) {
      expect(f).toHaveLength(12)
      expect(f.map((t) => t.trial_index)).toEqual([...Array(12).keys()])
    }
  })

  it('shows each misconception once systematic and once slip, on different sets', () => {
    for (const [, f] of forms) {
      for (const m of MISCONCEPTIONS) {
        const mine = f.filter((t) => t.misconception_id === m)
        expect(mine.map((t) => t.error_type).sort()).toEqual(['slip', 'systematic'])
      }
      expect(new Set(f.map((t) => t.set_id)).size).toBe(12)
      const exprs = f.flatMap((t) => t.problems.map((p) => p.expression))
      expect(new Set(exprs).size).toBe(36)
    }
  })

  it('shows each of the 4 pairings 3 times', () => {
    for (const [, f] of forms) {
      expect(Object.values(count(f.map((t) => `${t.policy_option}+${t.instance_option}`))).sort())
        .toEqual([3, 3, 3, 3])
    }
  })

  it('pairs one policy and one instance option, and logs left/right consistently', () => {
    for (const [, f] of forms) {
      for (const t of f) {
        expect(t.options.map((o) => o.scope).sort()).toEqual(['instance', 'policy'])
        expect([t.left_option, t.right_option]).toEqual(t.options.map((o) => o.code))
        expect(new Set([t.left_option, t.right_option])).toEqual(new Set([t.policy_option, t.instance_option]))
      }
    }
  })

  it('spreads the slip position 2/2/2 over problems 1-3', () => {
    for (const [, f] of forms) {
      const slips = f.filter((t) => t.error_type === 'slip')
      expect(count(slips.map((t) => t.slip_position))).toEqual({ 1: 2, 2: 2, 3: 2 })
      for (const t of f.filter((t) => t.error_type === 'systematic')) expect(t.slip_position).toBeNull()
    }
  })

  it('never puts the same misconception on consecutive trials', () => {
    for (const [, f] of forms) {
      for (let i = 1; i < f.length; i++) expect(f[i].misconception_id).not.toBe(f[i - 1].misconception_id)
    }
  })

  it('shows the right work: 3 wrong problems for systematic, exactly the slip one for slip', () => {
    for (const [, f] of forms) {
      for (const t of f) {
        const set = pool.sets.find((s) => s.set_id === t.set_id)
        t.problems.forEach((p, i) => {
          const src = set.problems[i]
          expect(p.lines).toEqual(p.is_error ? src.misconceived_trace : src.correct_trace)
        })
        const wrong = t.problems.filter((p) => p.is_error).map((p) => p.problem_index)
        expect(wrong).toEqual(t.error_type === 'systematic' ? [1, 2, 3] : [t.slip_position])
      }
    }
  })

  it('points flag and correction at the first wrong problem and its error step', () => {
    for (const [, f] of forms) {
      for (const t of f) {
        const set = pool.sets.find((s) => s.set_id === t.set_id)
        const p = t.error_type === 'systematic' ? 1 : t.slip_position
        const src = set.problems[p - 1]
        expect(t.target).toMatchObject({ problem: p, step: src.error_step })
        // the step named really is the misconceived line, and correct work differs there
        expect(src.misconceived_trace[src.error_step]).not.toBe(src.correct_trace[src.error_step])
        expect(src.misconceived_trace.slice(0, src.error_step)).toEqual(src.correct_trace.slice(0, src.error_step))
        for (const o of t.options) {
          if (o.code === 'flag') expect(o.text).toBe(`You should look again at step ${src.error_step} of problem ${p}.`)
          if (o.code === 'correction') {
            expect(o.text).toBe(`In problem ${p}, step ${src.error_step}, you should have done ${src.right_pair} before ${src.wrong_pair}.`)
          }
          expect(o.text).not.toMatch(/[{}]/)
        }
      }
    }
  })

  it('is reproducible from its seed', () => {
    expect(sampleTrialsExp3(pool, advice, 42)).toEqual(sampleTrialsExp3(pool, advice, 42))
  })
})

describe('sampleTrialsExp3, across participants', () => {
  it('uses every set in both error types, and every pairing per misconception', () => {
    const setType = new Set()
    const mPairing = new Set()
    for (const [, f] of forms) {
      for (const t of f) {
        setType.add(`${t.set_id}|${t.error_type}`)
        mPairing.add(`${t.misconception_id}|${t.error_type}|${t.policy_option}+${t.instance_option}`)
      }
    }
    expect(setType.size).toBe(pool.sets.length * 2)
    expect(mPairing.size).toBe(MISCONCEPTIONS.length * 2 * 4)
  })

  it('balances left/right for the policy option', () => {
    const left = forms.flatMap(([, f]) => f.map((t) => t.left_option === t.policy_option)).filter(Boolean).length
    expect(left / (N_SEEDS * 12)).toBeGreaterThan(0.48)
    expect(left / (N_SEEDS * 12)).toBeLessThan(0.52)
  })

  it('extends to 24 trials via config', () => {
    const f = sampleTrialsExp3(pool, advice, 7, { ...CONFIG, trialsPerMisconceptionPerErrorType: 2 })
    expect(f).toHaveLength(24)
    expect(new Set(f.map((t) => t.set_id)).size).toBe(24)
  })
})
