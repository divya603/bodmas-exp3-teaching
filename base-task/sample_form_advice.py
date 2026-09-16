"""
sample_form_advice.py

Python twin of src/user/utils/sampleFormAdvice.js, which is what the live
Experiment 3 (advice) task will run. Both draw one participant's 24 trials the
same way with the same PRNG (mulberry32), so a given seed yields the identical
form, including the same advice text, in both languages. Change one, change
the other, then rerun the checks here.

The form (decided 2026-09-16, see HANDOFF.md §0):
  * 4 trials per misconception (the rule the shown trace actually exhibits),
    8 per advice type (1 general rule, 2 step-level/own expression, 3
    step-level/curated expression), 12 helpful (right) / 12 unhelpful (wrong);
    2 right / 2 wrong within each misconception, 4 / 4 within each type
  * 4 trials per misconception cannot split evenly over 3 types, so each
    misconception fills one row of ROWS: one type twice (once right, once
    wrong), the other two once. Which misconception gets which row is a
    random permutation per participant (same table as Experiment 2's
    difficulty x category table, relabeled type x right/wrong). Smile has no
    cross-participant counter, so the 36 misconception x type x correctness
    cells balance in expectation, not exactly every 6 participants.
  * the TRACE for every cell is drawn from that row's misconception (any of
    its traces in the pool); the ADVICE TEXT is what varies by (type,
    right/wrong):
      type 1 right  -> the misconception's own TYPE1_ADVICE['right']
      type 1 wrong  -> TYPE1_ADVICE['wrong'] of a RANDOMLY drawn misconception
                        (may coincide with the trace's own, that's fine)
      type 2 right  -> the trace's own precomputed type2.right
      type 2 wrong  -> the trace's own precomputed type2.wrong (self-referential:
                        restates the trace's own actual mistake)
      type 3 right  -> a random TYPE3 entry of the misconception's own bank, .right
      type 3 wrong  -> a random TYPE3 entry of a RANDOMLY drawn misconception's
                        bank, .wrong
  * no trace (base_id) twice, so no expression twice
  * trial order shuffled; the 24 STUDENT_NAMES shuffled, one per trial

    python3 sample_form_advice.py            # checks over 500 seeds
    python3 sample_form_advice.py --dump N   # per-trial summary for seeds 0..N-1, as JSON
"""

import json
import sys
from collections import Counter

from learner import MISCONCEPTION_FLIPS
from pool_advice import STUDENT_NAMES

IDS = list(MISCONCEPTION_FLIPS.keys())
TYPES = ('type1', 'type2', 'type3')

# (advice type, R = right/helpful, W = wrong/unhelpful) cells per row
ROWS = [
    [('type1', 'R'), ('type1', 'W'), ('type2', 'R'), ('type3', 'W')],
    [('type1', 'R'), ('type1', 'W'), ('type2', 'W'), ('type3', 'R')],
    [('type1', 'R'), ('type2', 'R'), ('type2', 'W'), ('type3', 'W')],
    [('type1', 'W'), ('type2', 'R'), ('type2', 'W'), ('type3', 'R')],
    [('type1', 'R'), ('type2', 'W'), ('type3', 'R'), ('type3', 'W')],
    [('type1', 'W'), ('type2', 'R'), ('type3', 'R'), ('type3', 'W')],
]
_M = 0xFFFFFFFF


class Mulberry32:
    """Bit-exact port of makeRng in sampleFormAdvice.js (32-bit unsigned arithmetic)."""

    def __init__(self, seed):
        self.s = seed & _M

    def next(self):
        self.s = (self.s + 0x6D2B79F5) & _M
        s = self.s
        t = ((s ^ (s >> 15)) * (1 | s)) & _M
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & _M)) & _M) ^ t
        return ((t ^ (t >> 14)) & _M) / 4294967296

    def choice(self, arr):
        return arr[int(self.next() * len(arr))]

    def shuffle(self, arr):
        for i in range(len(arr) - 1, 0, -1):
            j = int(self.next() * (i + 1))
            arr[i], arr[j] = arr[j], arr[i]
        return arr


def pick_advice(rng, item, m, t, rw, type1_bank, type3_bank):
    """(advice_text, advice_misconception) for cell (t, rw) on a trace whose
    own misconception is m. advice_misconception is the bank the text came
    from: always m for a right pick, a (possibly different) random pick for a
    wrong one."""
    if t == 'type1':
        if rw == 'R':
            return type1_bank[m]['right'], m
        named = rng.choice(IDS)
        return type1_bank[named]['wrong'], named
    if t == 'type2':
        return item['type2']['right' if rw == 'R' else 'wrong'], m
    # type3
    if rw == 'R':
        entry = rng.choice(type3_bank[m])
        return entry['right'], m
    named = rng.choice(IDS)
    entry = rng.choice(type3_bank[named])
    return entry['wrong'], named


def sample_form(pool, type1_bank, type3_bank, seed):
    rng = Mulberry32(seed)
    rows = rng.shuffle(list(IDS))   # rows[r] = the misconception filling ROWS[r]
    form, used = [], set()
    for r, m in enumerate(rows):
        for t, rw in ROWS[r]:
            members = [it for it in pool if it['misconception'] == m and it['base_id'] not in used]
            it = rng.choice(members)
            used.add(it['base_id'])
            text, named = pick_advice(rng, it, m, t, rw, type1_bank, type3_bank)
            form.append({
                **it,
                'advice_type': t,
                'advice_correct': rw == 'R',
                'advice_text': text,
                'advice_misconception': named,
            })
    rng.shuffle(form)
    names = rng.shuffle(list(STUDENT_NAMES))
    return [dict(it, student_name=names[i]) for i, it in enumerate(form)]


def check(pool, type1_bank, type3_bank, n_seeds=500):
    by_id = {it['base_id']: it for it in pool}
    row_cells = [Counter(r) for r in ROWS]
    cells, uses = Counter(), Counter()
    doubled = Counter()
    for seed in range(n_seeds):
        form = sample_form(pool, type1_bank, type3_bank, seed)
        assert len(form) == 24, seed
        assert len({it['base_id'] for it in form}) == 24, seed
        assert len({it['expression'] for it in form}) == 24, seed
        assert sorted(it['student_name'] for it in form) == sorted(STUDENT_NAMES), seed

        assert Counter(it['misconception'] for it in form) == Counter({m: 4 for m in IDS}), seed
        assert Counter(it['advice_type'] for it in form) == Counter({t: 8 for t in TYPES}), seed
        assert sum(it['advice_correct'] for it in form) == 12, seed
        assert Counter((it['misconception'], it['advice_correct']) for it in form) == \
            Counter({(m, c): 2 for m in IDS for c in (True, False)}), seed
        assert Counter((it['advice_type'], it['advice_correct']) for it in form) == \
            Counter({(t, c): 4 for t in TYPES for c in (True, False)}), seed

        used_rows = []
        for m in IDS:
            pattern = Counter((it['advice_type'], 'R' if it['advice_correct'] else 'W')
                              for it in form if it['misconception'] == m)
            assert pattern in row_cells, (seed, m, pattern)
            used_rows.append(row_cells.index(pattern))
            doubled[(m, next(t for t in TYPES if pattern[(t, 'R')] and pattern[(t, 'W')]))] += 1
        assert sorted(used_rows) == list(range(6)), seed

        for it in form:
            src = by_id[it['base_id']]
            assert all(it[k] == src[k] for k in src if k != 'student_name'), (seed, it['base_id'])
            m = it['misconception']
            if it['advice_type'] == 'type1':
                bank = type1_bank[it['advice_misconception']]
                want = bank['right'] if it['advice_correct'] else bank['wrong']
                assert it['advice_text'] == want, (seed, it['base_id'])
                if it['advice_correct']:
                    assert it['advice_misconception'] == m, (seed, it['base_id'])
            elif it['advice_type'] == 'type2':
                want = it['type2']['right'] if it['advice_correct'] else it['type2']['wrong']
                assert it['advice_text'] == want, (seed, it['base_id'])
                assert it['advice_misconception'] == m, (seed, it['base_id'])
            else:
                entries = type3_bank[it['advice_misconception']]
                key = 'right' if it['advice_correct'] else 'wrong'
                assert any(e[key] == it['advice_text'] for e in entries), (seed, it['base_id'])
                if it['advice_correct']:
                    assert it['advice_misconception'] == m, (seed, it['base_id'])

        cells.update((it['misconception'], it['advice_type'], it['advice_correct']) for it in form)
        uses.update(it['base_id'] for it in form)

    print(f"ALL CHECKS PASSED over {n_seeds} seeds")
    print("  every form: 24 trials, 24 distinct traces and expressions, each of the 24 names once;")
    print("  4 per misconception, 8 per advice type, 12 right / 12 wrong, 2/2 within each")
    print("  misconception, 4/4 within each type; each misconception fills a different row;")
    print("  advice text matches its stated source bank/trace")
    exp = n_seeds * 24 / 36
    print(f"  36 misconception x type x correctness cells over all forms: "
          f"min {min(cells.values())}  max {max(cells.values())}  (expect about {exp:.0f} each)")
    print(f"  times each misconception got each type doubled: "
          f"min {min(doubled.values())}  max {max(doubled.values())}  (expect about {n_seeds / 3:.0f})")
    exp = n_seeds * 24 / len(pool)
    print(f"  item usage: min {min(uses[i] for i in by_id)}  max {max(uses.values())}  "
          f"(expect about {exp:.0f} each; {sum(1 for i in by_id if uses[i] == 0)} items never drawn)")


if __name__ == '__main__':
    pool = json.load(open('stimulus_pool_advice.json', encoding='utf-8'))
    banks = json.load(open('advice_banks.json', encoding='utf-8'))
    type1_bank, type3_bank = banks['type1'], banks['type3']
    if len(sys.argv) > 2 and sys.argv[1] == '--dump':
        dump = [[[it['base_id'], it['student_name'], it['advice_type'],
                  it['advice_correct'], it['advice_misconception'], it['advice_text']]
                 for it in sample_form(pool, type1_bank, type3_bank, s)]
                for s in range(int(sys.argv[2]))]
        print(json.dumps(dump))
    else:
        check(pool, type1_bank, type3_bank)
