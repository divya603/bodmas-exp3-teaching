"""
verify_stimuli_exp3.py

Independent checks on stimuli_exp3.json, re-derived from the model rather than
trusting the builder. Run: python3 verify_stimuli_exp3.py

Per problem:
  shape        4 numbers, 3 operators, 4-line traces ending in one number
  clean        every line of both traces: positive whole numbers, <= 999
  correct      every correct-trace step is expert-legal; its answer is THE
               expert answer
  one error    the misconceived trace has exactly ONE expert-illegal step, at
               error_step (the misconception fires once, nowhere else)
  learner      every misconceived step is a legal move for the learner holding
               only this misconception
  unique       the error step cannot be made by the expert or by any other
               single misconception; its surface reads as this misconception
  diagnostic   misconceived answer != correct answer
  same prefix  both traces agree on every line before the error step
  advice       wrong_move / right_move recompute identically; the problem is
               never one of the example-advice expressions
               (src/user/data/advice_exp3.json)
Per set / file: PROBLEMS_PER_SET problems, bracket iff outside_bracket_first
(and then always the right-hand operand, a ± b ×/÷ (c op d), changing the answer),
every expression distinct, every misconception present.
"""

import json
import re
import sys

from parser import build_dag
from traces import _next_dags, generate_traces
from misconceptions import dag_to_str
from distance import correct_answer
from learner import MISCONCEPTION_FLIPS
from generator_constrained import validate_trace, error_steps
from lookalike import visible_rules
from advice_content import error_window
from stimuli_exp3 import bracket_ok

IDS = list(MISCONCEPTION_FLIPS.keys())
NUM = re.compile(r'\d+')
OPS = re.compile(r'[-+×÷]')

ADVICE = json.load(open('../src/user/data/advice_exp3.json', encoding='utf-8'))
EXAMPLE_EXPRESSIONS = {a['example_expression'] for a in ADVICE['by_misconception'].values()}

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)


def one_step(line, rules):
    return {dag_to_str(d) for d in _next_dags(build_dag(line), list(rules))}


def verify_problem(p, m, where):
    e, cor, mis, k = p['expression'], p['correct_trace'], p['misconceived_trace'], p['error_step']
    check(len(NUM.findall(e)) == 4 and len(OPS.findall(e)) == 3, f'{where}: not 4 numbers / 3 ops: {e}')
    for name, t in (('correct', cor), ('misconceived', mis)):
        check(t[0] == e, f'{where}: {name} trace does not start at the expression')
        check(len(t) == 4 and NUM.fullmatch(t[-1]) is not None, f'{where}: {name} trace shape {t}')
        check(validate_trace(t), f'{where}: {name} trace has a non-positive / non-whole number {t}')

    check(error_steps(cor) == [], f'{where}: correct trace has an illegal step {cor}')
    check(cor[-1] == correct_answer(generate_traces(build_dag(e), [])), f'{where}: correct answer wrong')

    errs = error_steps(mis)
    check(errs == [k], f'{where}: misconceived trace error steps {errs}, expected exactly [{k}]')
    for i in range(1, len(mis)):
        check(mis[i] in one_step(mis[i - 1], [m]), f'{where}: step {i} not legal for a {m} learner')

    prev, nxt = mis[k - 1], mis[k]
    check(nxt not in one_step(prev, []), f'{where}: error step is expert-legal')
    for r in IDS:
        if r != m:
            check(nxt not in one_step(prev, [r]), f'{where}: error step also producible by {r}')
    check(m in visible_rules(prev, nxt), f'{where}: error step does not visibly read as {m}')

    check(mis[-1] != cor[-1], f'{where}: not diagnostic ({mis[-1]} == {cor[-1]})')
    check(mis[:k] == cor[:k], f'{where}: traces differ before the error step')
    check(p['correct_answer'] == cor[-1] and p['misconceived_answer'] == mis[-1], f'{where}: stored answers stale')
    check(error_window(mis, k, m) == (p['wrong_move'], p['right_move']), f'{where}: advice moves stale')
    check(p['wrong_pair'] in p['wrong_move'] and p['right_pair'] in p['right_move'], f'{where}: bare pairs stale')
    check(p['expression'] not in EXAMPLE_EXPRESSIONS, f'{where}: same expression as an example advice')


def main():
    data = json.load(open('stimuli_exp3.json', encoding='utf-8'))
    check(data == json.load(open('../src/user/data/stimuli_exp3.json', encoding='utf-8')),
          'src/user/data/stimuli_exp3.json is not the same as base-task/stimuli_exp3.json')
    cfg, sets = data['config'], data['sets']
    seen = set()
    for st in sets:
        m = st['misconception']
        check(len(st['problems']) == cfg['problems_per_set'], f"{st['set_id']}: wrong problem count")
        for p in st['problems']:
            where = f"{st['set_id']} problem {p['problem_index']}"
            check(('(' in p['expression']) == (m == 'outside_bracket_first'),
                  f'{where}: bracket presence wrong for {m}')
            if m == 'outside_bracket_first':
                check(bracket_ok(p['expression']), f'{where}: bracket not a right-hand, answer-changing operand')
            check(p['expression'] not in seen, f'{where}: duplicate expression')
            seen.add(p['expression'])
            verify_problem(p, m, where)
    from collections import Counter
    c = Counter(st['misconception'] for st in sets)
    check(set(c) == set(IDS) and set(c.values()) == {cfg['sets_per_misconception']},
          f'sets per misconception: {dict(c)}')

    n = sum(len(st['problems']) for st in sets)
    if failures:
        print(f'{len(failures)} FAILURES:')
        for f in failures:
            print('  ' + f)
        sys.exit(1)
    print(f'{len(sets)} sets, {n} problems: ALL CHECKS PASSED')


if __name__ == '__main__':
    main()
