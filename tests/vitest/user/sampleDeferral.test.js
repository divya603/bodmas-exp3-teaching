import { describe, it, expect } from 'vitest'
import pool from '@/user/data/stimuli_exp3.json'
import advice from '@/user/data/advice_exp3.json'
import {
  sampleDeferral, AI_TYPES, AI_ARMS, N_BLOCK, isRuntimeAI, runtimeAIPhase2, historyEntry, phase3AIAnswers,
} from '@/user/utils/sampleDeferral'

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

  it('has the four agreed AI types', () => {
    expect(AI_ARMS).toEqual(['right', 'markslip', 'agree', 'disagree'])
    expect(AI_ARMS.filter(isRuntimeAI)).toEqual(['agree', 'disagree'])
  })

  it('right: H1 advice, every mark right; markslip: H1 advice, exactly one mark wrong per trial', () => {
    for (const [ai, f] of sessions.filter(([a]) => !isRuntimeAI(a))) {
      for (const t of f) {
        expect(t.ai_type).toBe(ai)
        expect(t.ai_choice_scope).toBe(t.error_type === 'systematic' ? 'policy' : 'instance')
        expect(t.ai_choice).toBe(t.ai_choice_scope === 'policy' ? t.policy_option : t.instance_option)
        expect(t.ai_choice === t.left_option ? 'left' : 'right').toBe(t.ai_choice_side)
        expect(t.ai_marks_correct).toEqual(t.ai_marks.map((m, i) => m === (t.problems[i].is_error ? 'wrong' : 'right')))
        expect(t.ai_marks_correct.filter((c) => !c).length).toBe(ai === 'right' ? 0 : 1)
      }
    }
  })

  it('markslip spreads its wrong mark over problems 1-3', () => {
    const pos = count(sessions.filter(([a]) => a === 'markslip').flatMap(([, f]) => f.map((t) => t.ai_marks_correct.indexOf(false))))
    for (const k of [0, 1, 2]) expect(pos[k] / (250 * 18)).toBeGreaterThan(0.3)
  })

  it('leaves the runtime AIs (agree / disagree) empty at sampling time', () => {
    for (const [, f] of sessions.filter(([a]) => isRuntimeAI(a))) {
      for (const t of f) expect([t.ai_marks, t.ai_choice, t.ai_choice_scope]).toEqual([null, null, null])
    }
  })

  it('is reproducible from its seed', () => {
    expect(sampleDeferral(pool, advice, 9, 'markslip')).toEqual(sampleDeferral(pool, advice, 9, 'markslip'))
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

// a simulated participant: marks each problem correctly with p, picks policy with q[error_type]
function simulate(f, rng, p, q) {
  const own = {}
  for (const t of f) {
    const marks = t.problems.map((pr) => {
      const truth = pr.is_error ? 'wrong' : 'right'
      return rng() < p ? truth : truth === 'wrong' ? 'right' : 'wrong'
    })
    const choice = rng() < q[t.error_type] ? t.policy_option : t.instance_option
    own[t.trial_index] = { marks, choice }
  }
  return own
}
const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)

describe('runtime AIs (agree / disagree)', () => {
  it('Phase 2: agree copies marks and pick; disagree flips every mark and takes the other option', () => {
    for (let s = 0; s < 200; s++) {
      const f = sampleDeferral(pool, advice, s, 'agree')
      const own = simulate(f, lcg(s), 0.7, { systematic: 0.6, slip: 0.4 })
      for (const t of f.filter((t) => t.block === 2)) {
        const { marks, choice } = own[t.trial_index]
        const a = runtimeAIPhase2(t, 'agree', marks, choice)
        expect(a.ai_marks).toEqual(marks)
        expect(a.ai_choice).toBe(choice)
        const d = runtimeAIPhase2(t, 'disagree', marks, choice)
        expect(d.ai_marks).toEqual(marks.map((m) => (m === 'wrong' ? 'right' : 'wrong')))
        expect(d.ai_choice).not.toBe(choice)
        expect([t.policy_option, t.instance_option]).toContain(d.ai_choice)
        expect(d.ai_choice === t.left_option ? 'left' : 'right').toBe(d.ai_choice_side)
      }
    }
  })

  it('Phase 3: count-matched to Phases 1+2 (agree) and the complement (disagree), reproducibly', () => {
    const rhu = (x) => Math.floor(x + 0.5 + 1e-9)
    for (let s = 0; s < 300; s++) {
      const f = sampleDeferral(pool, advice, s, 'agree')
      const own = simulate(f, lcg(s + 7), [0.3, 0.6, 0.9][s % 3], { systematic: (s % 7) / 6, slip: (s % 5) / 4 })
      const history = f.filter((t) => t.block < 3).map((t) => historyEntry(t, own[t.trial_index].marks, own[t.trial_index].choice))
      const p3 = f.filter((t) => t.block === 3)
      for (const ai of ['agree', 'disagree']) {
        const { byTrial, summary } = phase3AIAnswers(p3, ai, history, s)
        expect(phase3AIAnswers(p3, ai, history, s).byTrial).toEqual(byTrial)
        for (const kind of [true, false]) {
          const ownK = history.flatMap((h) => h.problems).filter((p) => p.is_error === kind)
          const acc = ownK.filter((p) => p.mark_correct).length / ownK.length
          const aiK = p3.flatMap((t) => t.problems.map((p, i) => ({ p, ok: byTrial[t.trial_index].ai_marks_correct[i] }))).filter((x) => x.p.is_error === kind)
          const nAgree = rhu(acc * aiK.length)
          expect(aiK.filter((x) => x.ok).length).toBe(ai === 'agree' ? nAgree : aiK.length - nAgree)
        }
        for (const et of ['systematic', 'slip']) {
          const ownE = history.filter((h) => h.error_type === et)
          const share = ownE.filter((h) => h.choose_policy).length / ownE.length
          const ts = p3.filter((t) => t.error_type === et)
          const nAgree = rhu(share * ts.length)
          expect(ts.filter((t) => byTrial[t.trial_index].ai_choice_scope === 'policy').length).toBe(ai === 'agree' ? nAgree : ts.length - nAgree)
        }
        expect(summary.phase3_rule).toBe('count_matched_phases_1_2')
      }
    }
  })
})
