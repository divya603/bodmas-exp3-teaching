"""
pool_advice.py

Builds the Experiment 3 (advice) stimulus pool: one item per trace, full work
shown (no hidden lines), 6 misconceptions x PER_MISCONCEPTION traces each.

Unlike Experiment 2's pool.py, there is no A/B category and no ideal-observer
gating. Helpfulness of the advice shown on a trial is structural (which bank
the advice text was drawn from at sample time; see advice_content.py and
sample_form_advice.py), not a property baked into the item, so the only
per-trace requirement is that the error step is unambiguous: no OTHER single
misconception could have produced it, and the true misconception's statement
plainly describes it (the same check pool.py used for its A category,
a_item_ok, reused here as item_ok for every trace).

Each item also carries its Type 2 advice (render_type2, computed once here so
the sampler and the frontend never need the model at runtime).
"""

import json
import random
from collections import Counter

from parser import build_dag
from traces import _next_dags
from misconceptions import dag_to_str
from learner import MISCONCEPTION_FLIPS
from generator_constrained import generate_expression, error_steps
from find_pairs import sample_trace, N_OPS
from lookalike import error_step_rules
from advice_content import render_type2

IDS = list(MISCONCEPTION_FLIPS.keys())

PER_MISCONCEPTION = 40   # -> 240 traces total, same scale as the v6 pool
MAX_DRY_DRAWS = 300_000

STUDENT_NAMES = [
    'Noah', 'Maya', 'Liam', 'Ava', 'Ethan', 'Zoe',
    'Mia', 'Lucas', 'Emma', 'Owen', 'Sofia', 'Caleb',
    'Ruby', 'Jonah', 'Isla', 'Felix', 'Nora', 'Dylan',
    'Priya', 'Marcus', 'Elena', 'Theo', 'Jasmine', 'Omar',
]


def _one_step(line, rules):
    return {dag_to_str(d) for d in _next_dags(build_dag(line), list(rules))}


def item_ok(trace, m, k):
    """The error step could be made by m alone, and m's statement plainly
    describes it (same check as Experiment 2's pool.py a_item_ok)."""
    if any(trace[k] in _one_step(trace[k - 1], [r]) for r in IDS if r != m):
        return False
    return m in error_step_rules(trace)


def build(seed=2026, per_misconception=PER_MISCONCEPTION, verbose=True):
    rng = random.Random(seed)

    need = {m: per_misconception for m in IDS}
    chosen = []   # (m, expr, trace, k)
    seen_expressions = set()
    draws = Counter()
    drops = Counter()
    dry = 0

    while any(need.values()):
        for m in IDS:
            if not need[m]:
                continue

            bp = 1.0 if m == 'outside_bracket_first' else 0.6
            expr = generate_expression(n_ops=N_OPS, bracket_prob=bp, rng=rng)
            draws[m] += 1
            dry += 1
            if expr is None or expr in seen_expressions:
                continue
            trace = sample_trace(expr, m, rng)
            if trace is None:
                continue
            k = error_steps(trace)[0]

            if not item_ok(trace, m, k):
                drops['error step not unique to the rule, or not visibly it'] += 1
                continue
            try:
                render_type2(trace, k, m)
            except ValueError as e:
                drops[f'Type 2 rendering failed: {e}'] += 1
                continue

            need[m] -= 1
            seen_expressions.add(expr)
            chosen.append((m, expr, trace, k))
            dry = 0

        if verbose:
            print(f"  remaining traces: {sum(need.values()):3d}", end='\r')
        if dry > MAX_DRY_DRAWS:
            missing = {k: v for k, v in need.items() if v}
            raise SystemExit(f"\nstalled with cells unfilled: {missing}")

    if verbose:
        print(f"  generated {len(seen_expressions)} traces "
              f"({sum(draws.values())} expression draws)              ")
        print("  candidate slots refused:")
        for why, n in sorted(drops.items()):
            print(f"    {n:6d}  {why}")

    order = {m: i for i, m in enumerate(IDS)}
    chosen.sort(key=lambda c: (order[c[0]], c[1]))
    items = []
    for idx, (m, expr, trace, k) in enumerate(chosen):
        name = STUDENT_NAMES[idx % len(STUDENT_NAMES)]
        items.append({
            'base_id':        f"T{idx:03d}",
            'misconception':  m,
            'error_position': k,
            'expression':     expr,
            'n_ops':          N_OPS,
            'trace':          trace,
            'student_name':   name,
            'type2':          render_type2(trace, k, m),
        })
    return items


def summarise(items):
    print(f"\n{len(items)} items (traces), "
          f"{len({i['expression'] for i in items})} distinct expressions")
    c = Counter(i['misconception'] for i in items)
    print("  per misconception:", dict(c))
    pos = Counter(i['error_position'] for i in items)
    print("  error position:", dict(sorted(pos.items())))
    print("\n  sample Type 2 sentences:")
    seen = set()
    for i in items:
        if i['misconception'] in seen:
            continue
        seen.add(i['misconception'])
        print(f"    {i['misconception']:24s} step {i['error_position']}: "
              f"{i['expression']}")
        print(f"      right: {i['type2']['right']}")
        print(f"      wrong: {i['type2']['wrong']}")


if __name__ == '__main__':
    print("Building the Experiment 3 advice pool...")
    items = build()
    summarise(items)
    with open('stimulus_pool_advice.json', 'w', encoding='utf-8') as fh:
        json.dump(items, fh, ensure_ascii=False, indent=1)
    print("\nwrote stimulus_pool_advice.json")
