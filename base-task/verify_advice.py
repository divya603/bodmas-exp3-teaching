"""
verify_advice.py

Independent verifier for the Experiment 3 advice pool and content banks.
Re-derives everything from scratch rather than trusting pool_advice.json's own
build path; exits non-zero on any failure. Mirrors verify.py's role for the
v6 (Experiment 2) pool.
"""

import json
import sys
from collections import Counter

from generator_constrained import error_steps, validate_trace
from learner import MISCONCEPTION_FLIPS
from advice_content import TYPE1_ADVICE, TYPE3_ADVICE, TYPE3_BANK, render_type2
from pool_advice import item_ok, PER_MISCONCEPTION

IDS = list(MISCONCEPTION_FLIPS.keys())

failures = []


def check(name, cond):
    status = 'ok' if cond else 'FAIL'
    print(f"  [{status}] {name}")
    if not cond:
        failures.append(name)


print("Loading stimulus_pool_advice.json...")
items = json.load(open('stimulus_pool_advice.json', encoding='utf-8'))

check(f"{len(items)} items (want {PER_MISCONCEPTION * len(IDS)})",
      len(items) == PER_MISCONCEPTION * len(IDS))

counts = Counter(i['misconception'] for i in items)
check("every misconception has exactly PER_MISCONCEPTION traces",
      all(counts[m] == PER_MISCONCEPTION for m in IDS))

check("base_ids are unique", len({i['base_id'] for i in items}) == len(items))
check("expressions are unique", len({i['expression'] for i in items}) == len(items))

print("\nRe-deriving every trace from scratch...")
bad_trace = bad_ok = bad_type2 = bad_valid = 0
for it in items:
    trace, m = it['trace'], it['misconception']

    if len(trace) != 7:
        bad_trace += 1
        continue
    if not validate_trace(trace):
        bad_valid += 1

    errs = error_steps(trace)
    if len(errs) != 1 or errs[0] != it['error_position']:
        bad_ok += 1
        continue
    k = errs[0]
    if k not in (2, 3, 4):
        bad_ok += 1
        continue
    if not item_ok(trace, m, k):
        bad_ok += 1
        continue

    try:
        redone = render_type2(trace, k, m)
    except ValueError:
        bad_type2 += 1
        continue
    if redone != it['type2']:
        bad_type2 += 1

check("every trace has exactly 7 lines", bad_trace == 0)
check("every trace passes validate_trace (no negatives/zeros/decimals/>999)", bad_valid == 0)
check("every trace has exactly one error step, at 2/3/4, unique to its misconception", bad_ok == 0)
check("every item's stored type2 matches a fresh render_type2", bad_type2 == 0)

print("\nChecking Type 1 bank...")
check("Type 1 has all 6 misconceptions", set(TYPE1_ADVICE) == set(IDS))
check("Type 1 right != wrong for every misconception",
      all(TYPE1_ADVICE[m]['right'] != TYPE1_ADVICE[m]['wrong'] for m in IDS))
t1_texts = [TYPE1_ADVICE[m][k] for m in IDS for k in ('right', 'wrong')]
check("Type 1's 12 sentences are all distinct", len(set(t1_texts)) == 12)

print("\nChecking Type 3 bank...")
check("Type 3 has all 6 misconceptions", set(TYPE3_BANK) == set(IDS))
check("Type 3 has exactly 6 entries per misconception",
      all(len(TYPE3_BANK[m]) == 6 for m in IDS))
check("Type 3 right != wrong for every entry",
      all(r != w for m in IDS for _, r, w in TYPE3_BANK[m]))
t3_texts = [e[k] for m in IDS for e in TYPE3_ADVICE[m] for k in ('right', 'wrong')]
check("Type 3's 72 sentences are all distinct", len(set(t3_texts)) == 72)
check("every Type 3 outside_bracket_first right names a bracket",
      all('bracket' in e['right'] for e in TYPE3_ADVICE['outside_bracket_first']))
check("no Type 3 right sentence for the other 5 misconceptions names a bracket",
      all('bracket' not in e['right']
          for m in IDS if m != 'outside_bracket_first' for e in TYPE3_ADVICE[m]))

print()
if failures:
    print(f"FAILED: {len(failures)} check(s) did not pass")
    sys.exit(1)
print("ALL CHECKS PASSED")
