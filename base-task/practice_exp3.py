"""
practice_exp3.py

The Experiment 3 practice items (user decision 2026-10-05): one problem per
item, shown like a trial card with the work already visible. The participant
marks it right or wrong, then gets told whether the mark is correct, with an
explanation either way. Items, in order: the two tricky misconceptions,
outside_bracket_first then same_priority_rtl (correct mark "wrong"), then one
correctly solved problem with × before + (correct mark "right"; user
2026-10-05).

Each wrong item is built by stimuli_exp3.make_problem (so it passes every pool
rule: positive whole numbers, exactly one error step, nothing else reading as
right-to-left, aligned offsets). Each right item must have exactly one clean
correct trace. No item may be a pool problem.

Run: python3 practice_exp3.py   (writes ../src/user/data/practice_exp3.json)
"""

import json
import random

import stimuli_exp3 as S
from parser import build_dag
from traces import generate_traces
from generator_constrained import validate_trace, error_steps
from rtl_look import rtl_looking_steps

# (misconception, expression, student name, explanation template). Names are
# not in the trial name list (sampleTrialsExp3.js), so no practice student
# reappears as a trial student.
ITEMS = [
    ('outside_bracket_first', '6 + 2 × (3 + 1)', 'Sam',
     'In step {step}, the student did {wrong} first. But the bracket ({right}) should be '
     'worked out first: brackets come before everything else. The right answer is {answer}.'),
    ('same_priority_rtl', '12 - 5 + 2 × 2', 'Lily',
     'In step {step}, the student did {wrong} first. But − and + have the same priority, so '
     'you work left to right: {left} comes first. The right answer is {answer}.'),
]

# Correctly solved items: (expression, student name, explanation).
CORRECT_ITEMS = [
    ('4 + 3 × 5 + 2', 'Ben',
     'In step 1, the student did 3 × 5 first, because × comes before +. Then they did the '
     'additions left to right. The answer {answer} is right.'),
]


def show(s):
    return s.replace(' - ', ' − ')


def build():
    with open('stimuli_exp3.json', encoding='utf-8') as fh:
        pool = {p['expression'] for st in json.load(fh)['sets'] for p in st['problems']}
    out = []
    for n, (m, expr, name, template) in enumerate(ITEMS, start=1):
        assert expr not in pool, f'{expr} is a pool problem'
        prob, why = S.make_problem(expr, m, random.Random(0))
        assert prob is not None, f'{expr}: {why}'
        mis, k = prob['misconceived_trace'], prob['error_step']
        assert rtl_looking_steps(mis, skip=(k,)) == []
        explanation = template.format(step=k, wrong=show(prob['wrong_pair']),
                                      right=show(prob['right_pair']), left=show(prob['right_pair']),
                                      answer=prob['correct_answer'])
        out.append({
            'id':            f'practice{n}',
            'misconception': m,
            'student_name':  name,
            'problem': {
                'problem_index': 1,
                'expression':    expr,
                'lines':         mis,
                'offsets':       prob['misconceived_offsets'],
                'is_error':      True,
                'error_step':    k,
            },
            'correct_mark':  'wrong',
            'explanation':   explanation,
        })
    for expr, name, template in CORRECT_ITEMS:
        assert expr not in pool, f'{expr} is a pool problem'
        traces = [t for t in generate_traces(build_dag(expr), [])
                  if len(t) == S.N_OPS + 1 and validate_trace(t) and not rtl_looking_steps(t)]
        assert len(traces) == 1, f'{expr}: {len(traces)} clean correct traces'
        t = traces[0]
        assert error_steps(t) == []
        out.append({
            'id':            f'practice{len(out) + 1}',
            'misconception': None,
            'student_name':  name,
            'problem': {
                'problem_index': 1,
                'expression':    expr,
                'lines':         t,
                'offsets':       S.line_offsets(t),
                'is_error':      False,
                'error_step':    None,
            },
            'correct_mark':  'right',
            'explanation':   template.format(answer=t[-1]),
        })
    return out


if __name__ == '__main__':
    items = build()
    for it in items:
        print(f"{it['id']}: {' -> '.join(it['problem']['lines'])}\n  {it['explanation']}")
    with open('../src/user/data/practice_exp3.json', 'w', encoding='utf-8') as fh:
        json.dump(items, fh, ensure_ascii=False, indent=1)
    print('wrote ../src/user/data/practice_exp3.json')
