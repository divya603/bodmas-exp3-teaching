"""
stimuli_exp3.py

Builds the Experiment 3 stimulus sets (design agreed 2026-10-02, HANDOFF §0).

For each misconception, SETS_PER_MISCONCEPTION sets of PROBLEMS_PER_SET
problems. Every problem has 4 numbers and 3 operators, and carries two traces
of the same expression:

  misconceived_trace  the single-misconception learner's work, drawn the way
                      the learner would produce it (sample_misconceived,
                      so the error step falls wherever the learner's path puts
                      it, not hard-coded). Exactly ONE step is expert-illegal:
                      the misconception fires once and only once, so the
                      flag / correction advice can point at a single step.
  correct_trace       the expert's work, chosen to share the longest prefix
                      with the misconceived trace, so the two versions look
                      the same up to the error step.

A trial's systematic version shows all PROBLEMS_PER_SET misconceived traces;
its slip version shows the misconceived trace for one problem and the correct
trace for the others (which problem is decided at sample time, not here).

Every problem is diagnostic: the misconceived final answer differs from the
correct one. Every line of both traces is positive whole numbers only
(generator_constrained.validate_trace: no negatives, no fractions, no zero).

Run: python3 stimuli_exp3.py [--show]
     (writes stimuli_exp3.json here and the copy the frontend imports,
     src/user/data/stimuli_exp3.json)
Check: python3 verify_stimuli_exp3.py
"""

import json
import random
import re
from collections import Counter

from parser import build_dag
from traces import generate_traces
from distance import correct_answer
from learner import MISCONCEPTION_FLIPS
from generator_constrained import generate_expression, validate_trace, error_steps
from find_pairs import usable_traces
from pool_advice import item_ok
from advice_content import error_window

IDS = list(MISCONCEPTION_FLIPS.keys())

N_OPS = 3
POSITIONS = (1, 2, 3)            # any step; the learner's path decides
PROBLEMS_PER_SET = 3
SETS_PER_MISCONCEPTION = 20      # pool; a participant draws 2 per misconception
BRACKET_PROB = {m: 0.0 for m in IDS}
BRACKET_PROB['outside_bracket_first'] = 1.0
SEED = 2026
with open('../src/user/data/advice_exp3.json', encoding='utf-8') as _fh:
    EXAMPLE_EXPRESSIONS = {a['example_expression']
                           for a in json.load(_fh)['by_misconception'].values()}
MAX_DRAWS = 200_000


# outside_bracket_first problems: the bracket is always the right-hand operand,
# a ± b ×/÷ (c op d) (user decision 2026-10-02), and it must change the answer
# (so no redundant brackets like 3 + 2 × (4 × 2)).
RIGHT_BRACKET = re.compile(r'\d+ [-+] \d+ [×÷] \(\d+ [-+×÷] \d+\)')


def bracket_ok(expr):
    if not RIGHT_BRACKET.fullmatch(expr):
        return False
    unbracketed = expr.replace('(', '').replace(')', '')
    try:
        return (correct_answer(generate_traces(build_dag(expr), []))
                != correct_answer(generate_traces(build_dag(unbracketed), [])))
    except Exception:
        return False


def _ops(expr):
    """Operator sequence, ignoring brackets, e.g. '+×-'."""
    return ''.join(t for t in expr if t in '+-×÷')


def correct_trace_for(expr, misconceived):
    """The expert trace sharing the longest prefix with the misconceived one,
    restricted to traces whose every line is clean. None if there is none."""
    best, best_len = None, -1
    for t in generate_traces(build_dag(expr), []):
        if len(t) != N_OPS + 1 or not validate_trace(t):
            continue
        n = 0
        while n < len(t) and t[n] == misconceived[n]:
            n += 1
        if n > best_len:
            best, best_len = t, n
    return best


def sample_misconceived(expr, m, rng):
    """One usable single-error learner trace, drawn with the learner's own path
    probabilities (same draw as find_pairs.sample_trace, at N_OPS)."""
    cands = usable_traces(expr, m, positions=POSITIONS, n_ops=N_OPS)
    if not cands:
        return None
    r = rng.random() * sum(p for p, _ in cands)
    for p, t in cands:
        r -= p
        if r <= 0:
            return t
    return cands[-1][1]


def bare_pair(phrase):
    """'do 3 + 4 first' / 'work out the bracket (5 + 10) first' -> '3 + 4' / '5 + 10'.
    The correction template reads 'you should have done {right_pair} before {wrong_pair}'."""
    mt = re.fullmatch(r'do (.+) first|work out the bracket \((.+)\) first', phrase)
    if mt is None:
        raise ValueError(f'unexpected move phrase {phrase!r}')
    return mt.group(1) or mt.group(2)


def make_problem(expr, m, rng):
    """A problem dict for expr under misconception m, or (None, reason)."""
    mis = sample_misconceived(expr, m, rng)
    if mis is None:
        return None, 'no usable single-error learner trace'
    k = error_steps(mis)[0]
    if not item_ok(mis, m, k):
        return None, 'error step not unique to the misconception, or not visibly it'
    cor = correct_trace_for(expr, mis)
    if cor is None:
        return None, 'no clean expert trace'
    if cor[-1] == mis[-1]:
        return None, 'not diagnostic'
    try:
        wrong_move, right_move = error_window(mis, k, m)
    except ValueError as e:
        return None, f'error step not a clean move: {e}'
    return {
        'expression':          expr,
        'operators':           _ops(expr),
        'correct_trace':       cor,
        'misconceived_trace':  mis,
        'error_step':          k,
        'wrong_move':          wrong_move,   # e.g. 'do 3 + 4 first'
        'right_move':          right_move,   # e.g. 'do 4 × 2 first'
        'wrong_pair':          bare_pair(wrong_move),   # e.g. '3 + 4'
        'right_pair':          bare_pair(right_move),   # e.g. '4 × 2'
        'correct_answer':      cor[-1],
        'misconceived_answer': mis[-1],
    }, None


def build(seed=SEED, verbose=True):
    rng = random.Random(seed)
    used = set()
    drops = Counter()
    sets = []
    for m in IDS:
        for s in range(SETS_PER_MISCONCEPTION):
            problems, ops_seen, draws = [], set(), 0
            while len(problems) < PROBLEMS_PER_SET:
                draws += 1
                if draws > MAX_DRAWS:
                    raise SystemExit(f'stalled on {m} set {s}')
                expr = generate_expression(n_ops=N_OPS, bracket_prob=BRACKET_PROB[m], rng=rng)
                if expr is None or expr in used or expr in EXAMPLE_EXPRESSIONS:
                    continue
                if BRACKET_PROB[m] == 0.0 and '(' in expr:
                    continue
                if m == 'outside_bracket_first' and not bracket_ok(expr):
                    continue
                # vary the operator pattern within a set while that is still easy
                if _ops(expr) in ops_seen and draws < 5_000:
                    drops['repeat operator pattern within set'] += 1
                    continue
                prob, why = make_problem(expr, m, rng)
                if prob is None:
                    drops[why] += 1
                    continue
                used.add(expr)
                ops_seen.add(prob['operators'])
                prob['problem_index'] = len(problems) + 1
                problems.append(prob)
            sets.append({
                'set_id':        f'{m}__{s + 1}',
                'misconception': m,
                'set_index':     s + 1,
                'problems':      problems,
            })
    if verbose:
        print('candidate problems refused:')
        for why, n in sorted(drops.items(), key=lambda x: -x[1]):
            print(f'  {n:6d}  {why}')
    return sets


def show(sets):
    for st in sets:
        print(f"\n== {st['set_id']}")
        for p in st['problems']:
            print(f"  problem {p['problem_index']}: {p['expression']}"
                  f"   (error at step {p['error_step']})")
            print(f"    misconceived: {'  ->  '.join(p['misconceived_trace'])}")
            print(f"    correct:      {'  ->  '.join(p['correct_trace'])}")
            print(f"    wrong move: {p['wrong_move']};  right move: {p['right_move']}")


if __name__ == '__main__':
    import sys
    sets = build()
    if '--show' in sys.argv:
        show(sets)
    out = {
        'config': {'n_ops': N_OPS, 'problems_per_set': PROBLEMS_PER_SET,
                   'sets_per_misconception': SETS_PER_MISCONCEPTION, 'seed': SEED},
        'sets': sets,
    }
    for path in ('stimuli_exp3.json', '../src/user/data/stimuli_exp3.json'):
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(out, fh, ensure_ascii=False, indent=1)
        print(f'wrote {path}')
