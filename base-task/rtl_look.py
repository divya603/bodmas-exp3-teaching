"""
rtl_look.py

Finds steps that LOOK right-to-left to a participant told "work left to right"
but that the model counts as correct: in a+b-c and a×b÷c both orders give the
same answer, so the expert may fire the right-hand operator first. Such a step
in work the participant should mark "right" (any step of a correct trace, or a
non-error step of a misconceived trace) would read as a mistake.

looks_rtl(prev, nxt): True if the move prev -> nxt fires an operator whose
left neighbour is an operator of the same priority with a plain number on its
left, i.e. a same-priority operation to its left was available and skipped.
"""

from lookalike import _TOKEN, _fired, _PRIO


def looks_rtl(prev, nxt):
    p, n = _TOKEN.findall(prev), _TOKEN.findall(nxt)
    hits = _fired(p, n)
    if len(hits) != 1:
        return False
    i = hits[0]
    return (i >= 3 and p[i - 2] in _PRIO and _PRIO[p[i - 2]] == _PRIO[p[i]]
            and p[i - 3].isdigit())


def rtl_looking_steps(trace, skip=()):
    """1-based steps of `trace` that look right-to-left, except those in skip."""
    return [k for k in range(1, len(trace))
            if k not in skip and looks_rtl(trace[k - 1], trace[k])]


if __name__ == '__main__':
    import json
    from collections import Counter
    d = json.load(open('stimuli_exp3.json', encoding='utf-8'))
    bad = Counter()
    for st in d['sets']:
        for p in st['problems']:
            c = rtl_looking_steps(p['correct_trace'])
            mm = rtl_looking_steps(p['misconceived_trace'], skip=(p['error_step'],))
            if c:
                bad['correct trace'] += 1
                print(f"{st['set_id']:26s} correct:      {' -> '.join(p['correct_trace'])}  (step {c})")
            if mm:
                bad['misconceived, non-error step'] += 1
                print(f"{st['set_id']:26s} misconceived: {' -> '.join(p['misconceived_trace'])}  (step {mm})")
    print(dict(bad), 'of 360 problems')
