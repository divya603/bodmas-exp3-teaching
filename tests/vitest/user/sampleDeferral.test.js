import { describe, it, expect } from 'vitest'
import pool from '@/user/data/stimuli_exp3.json'
import advice from '@/user/data/advice_exp3.json'
import { sampleDeferral, AI_TYPES, AI_ARMS, N_BLOCK } from '@/user/utils/sampleDeferral'

const N_SEEDS = 1000
const MISCONCEPTIONS = [...new Set(pool.sets.map((s) => s.misconception))]
const count = (xs) => xs.reduce((acc, x) => ((acc[x] = (acc[x] || 0) + 1), acc), {})
const sessions = AI_ARMS.flatMap((ai) =>
  Array.from({ length: N_SEEDS / AI_ARMS.length }, (_, s) => [ai, sampleDeferral(pool, advice, s, ai)])
)

describe('sampleDeferral, per participant', () => {
  it('gives 3 blocks of 6, indexed in order', () => {
    for (const [, f] of sessions) {
      expect(f).toHaveLength(18)
      expect(f.map((t) => t.trial_index)).toEqual([...Array(18).keys()])
      expect(f.map((t) => t.block)).toEqual([...Array(6).fill(1), ...Array(6).fill(2), ...Array(6).fill(3)])
      expect(f.map((t) => t.mode)).toEqual([...Array(6).fill('self'), ...Array(6).fill('self_then_ai'), ...Array(6).fill('choose')])
    }
  })

  it('shows every misconception once per block, never repeats a set or a problem', () => {
    for (const [, f] of sessions) {
      for (const b of [1, 2, 3]) {
        expect(f.filter((t) => t.block === b).map((t) => t.misconception_id).sort()).toEqual([...MISCONCEPTIONS].sort())
      }
      expect(new Set(f.map((t) => t.set_id)).size).toBe(18)
      expect(new Set(f.flatMap((t) => t.problems.map((p) => p.expression))).size).toBe(54)
      for (let i = 1; i < f.length; i++) expect(f[i].misconception_id).not.toBe(f[i - 1].misconception_id)
    }
  })

  it('has 3 systematic + 3 slip per block, with block 2 the complement of block 1', () => {
    for (const [, f] of sessions) {
      const sys = (b) => new Set(f.filter((t) => t.block === b && t.error_type === 'systematic').map((t) => t.misconception_id))
      for (const b of [1, 2, 3]) expect(sys(b).size).toBe(3)
      for (const m of MISCONCEPTIONS) expect(sys(1).has(m)).not.toBe(sys(2).has(m))
    }
  })

  it('puts slips at positions 1, 2, 3 once each per block', () => {
    for (const [, f] of sessions) {
      for (const b of [1, 2, 3]) {
        const slips = f.filter((t) => t.block === b && t.error_type === 'slip')
        expect(slips.map((t) => t.slip_position).sort()).toEqual([1, 2, 3])
      }
    }
  })

  it('uses each of the 4 pairings at least once per block', () => {
    for (const [, f] of sessions) {
      for (const b of [1, 2, 3]) {
        const pairs = new Set(f.filter((t) => t.block === b).map((t) => `${t.policy_option}+${t.instance_option}`))
        expect(pairs.size).toBe(4)
      }
    }
  })

  it('gives the AI the advice scope its type prescribes, and correct marks by default', () => {
    for (const [ai, f] of sessions) {
      for (const t of f) {
        expect(t.ai_type).toBe(ai)
        expect(t.ai_choice_scope).toBe(AI_TYPES[ai][t.error_type])
        expect([t.policy_option, t.instance_option]).toContain(t.ai_choice)
        expect(t.ai_choice === t.left_option ? 'left' : 'right').toBe(t.ai_choice_side)
        expect(t.ai_marks).toEqual(t.problems.map((p) => (p.is_error ? 'wrong' : 'right')))
        expect(t.ai_marks_correct.every(Boolean)).toBe(true)
      }
    }
  })

  it('can make the AI mark wrongly, at the requested rate', () => {
    const marks = Array.from({ length: 300 }, (_, s) => sampleDeferral(pool, advice, s, 'right', { markAccuracy: 0.8 }))
      .flat()
      .flatMap((t) => t.ai_marks_correct)
    const rate = marks.filter(Boolean).length / marks.length
    expect(rate).toBeGreaterThan(0.77)
    expect(rate).toBeLessThan(0.83)
  })

  it('is reproducible from its seed', () => {
    expect(sampleDeferral(pool, advice, 9, 'policy')).toEqual(sampleDeferral(pool, advice, 9, 'policy'))
  })
})

describe('sampleDeferral, across participants', () => {
  it('balances error type within each misconception over the session', () => {
    const c = count(sessions.flatMap(([, f]) => f.map((t) => t.error_type)))
    expect(c.systematic).toBe(c.slip)
  })

  it('uses every set in the pool', () => {
    expect(new Set(sessions.flatMap(([, f]) => f.map((t) => t.set_id))).size).toBe(pool.sets.length)
  })

  it('keeps N_BLOCK in sync with the 6 misconceptions', () => {
    expect(Object.values(N_BLOCK)).toEqual([6, 6, 6])
  })
})
