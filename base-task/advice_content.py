"""
advice_content.py

The three teaching types for Experiment 3 (advice), agreed with the user
2026-09-16. Every trial shows a student's full work (no hidden lines) plus one
piece of advice; the participant answers whether the advice is helpful.
Helpfulness is structural (which bank a shown item was drawn from), not
defined via the ideal observer's marginal.

Type 1  general rule.       One fixed right/wrong sentence pair per
                             misconception (TYPE1_ADVICE), independent of the
                             trace. An unhelpful trial may draw any of the 6
                             wrong sentences, regardless of the trace's own
                             misconception.
Type 2  step-level, the      Right advice names the exact operator pair the
        student's own        student should have resolved at the error step;
        expression.          wrong advice restates the student's own actual
                             mistake at that step. Fully determined by the
                             trace (error_window / render_type2 below); no
                             hand-written content.
Type 3  step-level, a        Same idea as Type 2 but demonstrated on a small
        curated expression.  hand-written expression instead of the
                             student's own (TYPE3_BANK: 6 right + 6 wrong per
                             misconception, 72 sentences total, reusing the
                             same 6 curated expressions per misconception for
                             both). Helpful trials draw from the matching
                             misconception's right entries; unhelpful trials
                             draw from any of the 6 misconceptions' wrong
                             entries, same rule as Type 1.

outside_bracket_first is structurally different from the other five
misconceptions (it is about bracket timing, not an adjacent-operator pair), so
its Type 2 rendering and its Type 3 bank entries use "work out the bracket
(...) first" instead of "do a OP b first". See HANDOFF.md §3 gotcha 6.
"""

from lookalike import _TOKEN, _fired, _PRIO

# ── Type 1: general rule ────────────────────────────────────────────────────

TYPE1_ADVICE = {
    'add_before_mul': {
        'right': 'Do multiplication before addition.',
        'wrong': 'Do addition before multiplication.',
    },
    'add_before_div': {
        'right': 'Do division before addition.',
        'wrong': 'Do addition before division.',
    },
    'sub_before_mul': {
        'right': 'Do multiplication before subtraction.',
        'wrong': 'Do subtraction before multiplication.',
    },
    'sub_before_div': {
        'right': 'Do division before subtraction.',
        'wrong': 'Do subtraction before division.',
    },
    'same_priority_rtl': {
        'right': 'When two operations have the same priority, work left to right.',
        'wrong': 'When two operations have the same priority, work right to left.',
    },
    'outside_bracket_first': {
        'right': "Solve what's inside the brackets first.",
        'wrong': 'Finish everything outside the brackets before opening them.',
    },
}


# ── Type 2: step-level, the student's own expression ───────────────────────

# the multiplication/division each operator-precedence misconception's flip
# is about (add_before_mul and sub_before_mul both point at ×, etc.)
_MUL_DIV_FOR = {
    'add_before_mul': '×',
    'add_before_div': '÷',
    'sub_before_mul': '×',
    'sub_before_div': '÷',
}


def _phrase(a, op, b):
    return f"{a} {op} {b}"


def _matching_close(tokens, open_idx):
    depth = 0
    for j in range(open_idx, len(tokens)):
        if tokens[j] == '(':
            depth += 1
        elif tokens[j] == ')':
            depth -= 1
            if depth == 0:
                return j
    raise ValueError('unbalanced brackets')


def _matching_open(tokens, close_idx):
    depth = 0
    for j in range(close_idx, -1, -1):
        if tokens[j] == ')':
            depth += 1
        elif tokens[j] == '(':
            depth -= 1
            if depth == 0:
                return j
    raise ValueError('unbalanced brackets')


def error_window(trace, k, m):
    """
    For the error step trace[k-1] -> trace[k], caused by misconception m,
    return (wrong_phrase, right_phrase): short strings naming the specific
    move the student actually made (wrong) and the move an expert would have
    made instead (right), both grounded in the trace's own numbers.

    Raises ValueError if the step is not a clean single-operator move
    explained by m (callers should have already filtered traces with
    pool_advice.item_ok, so this should not happen on the built pool).
    """
    prev, nxt = trace[k - 1], trace[k]
    p = _TOKEN.findall(prev)
    n = _TOKEN.findall(nxt)
    hits = _fired(p, n)
    if len(hits) != 1:
        raise ValueError(f'not a single clean move: {prev!r} -> {nxt!r} ({len(hits)} candidates)')
    i = hits[0]
    x = p[i]
    wrong = f"do {_phrase(p[i - 1], x, p[i + 1])} first"

    if m == 'outside_bracket_first':
        if i + 3 < len(p) and p[i + 3] == '(':
            close = _matching_close(p, i + 3)
            inner = ' '.join(p[i + 4:close])
            right = f"work out the bracket ({inner}) first"
        elif i >= 3 and p[i - 3] == ')':
            open_ = _matching_open(p, i - 3)
            inner = ' '.join(p[open_ + 1:i - 3])
            right = f"work out the bracket ({inner}) first"
        else:
            raise ValueError(f'no bracket adjacent to the error step in {prev!r}')
        return wrong, right

    if m == 'same_priority_rtl':
        if not (i >= 2 and p[i - 2] in _PRIO and _PRIO[p[i - 2]] == _PRIO[x]):
            raise ValueError(f'no left same-priority operator at the error step in {prev!r}')
        right = f"do {_phrase(p[i - 3], p[i - 2], p[i - 1])} first"
        return wrong, right

    # add_before_mul / add_before_div / sub_before_mul / sub_before_div
    op_needed = _MUL_DIV_FOR[m]
    if i + 2 < len(p) and p[i + 2] == op_needed:
        right = f"do {_phrase(p[i + 1], p[i + 2], p[i + 3])} first"
    elif i >= 2 and p[i - 2] == op_needed:
        right = f"do {_phrase(p[i - 3], p[i - 2], p[i - 1])} first"
    else:
        raise ValueError(f'no adjacent {op_needed} at the error step in {prev!r}')
    return wrong, right


def render_type2(trace, k, m):
    """{'right': ..., 'wrong': ...} sentences for Type 2, e.g.
    'In step 4, do 4 × 2 first.' / 'In step 4, do 16 + 4 first.'"""
    wrong_phrase, right_phrase = error_window(trace, k, m)
    return {
        'right': f"In step {k}, {right_phrase}.",
        'wrong': f"In step {k}, {wrong_phrase}.",
    }


# ── Type 3: step-level, a curated small expression ──────────────────────────
# 6 hand-written (expression, right op-pair, wrong op-pair) triples per
# misconception. Right and wrong share the same expression, naming the
# correct vs. the actual first move, same complement logic as Type 2.

TYPE3_BANK = {
    'add_before_mul': [
        ('2 + 3 × 4', '3 × 4', '2 + 3'),
        ('5 × 2 + 6', '5 × 2', '2 + 6'),
        ('1 + 4 × 3', '4 × 3', '1 + 4'),
        ('6 × 3 + 2', '6 × 3', '3 + 2'),
        ('3 + 5 × 2', '5 × 2', '3 + 5'),
        ('4 × 6 + 1', '4 × 6', '6 + 1'),
    ],
    'add_before_div': [
        ('3 + 8 ÷ 4', '8 ÷ 4', '3 + 8'),
        ('9 ÷ 3 + 5', '9 ÷ 3', '3 + 5'),
        ('2 + 6 ÷ 2', '6 ÷ 2', '2 + 6'),
        ('10 ÷ 5 + 4', '10 ÷ 5', '5 + 4'),
        ('7 + 12 ÷ 3', '12 ÷ 3', '7 + 12'),
        ('8 ÷ 4 + 6', '8 ÷ 4', '4 + 6'),
    ],
    'sub_before_mul': [
        ('5 - 2 × 3', '2 × 3', '5 - 2'),
        ('4 × 3 - 1', '4 × 3', '3 - 1'),
        ('9 - 3 × 2', '3 × 2', '9 - 3'),
        ('6 × 2 - 5', '6 × 2', '2 - 5'),
        ('7 - 4 × 1', '4 × 1', '7 - 4'),
        ('5 × 4 - 3', '5 × 4', '4 - 3'),
    ],
    'sub_before_div': [
        ('8 - 6 ÷ 2', '6 ÷ 2', '8 - 6'),
        ('9 ÷ 3 - 1', '9 ÷ 3', '3 - 1'),
        ('10 - 8 ÷ 4', '8 ÷ 4', '10 - 8'),
        ('12 ÷ 4 - 2', '12 ÷ 4', '4 - 2'),
        ('6 - 4 ÷ 2', '4 ÷ 2', '6 - 4'),
        ('15 ÷ 5 - 3', '15 ÷ 5', '5 - 3'),
    ],
    'same_priority_rtl': [
        ('8 ÷ 4 × 2', '8 ÷ 4', '4 × 2'),
        ('9 - 3 + 2', '9 - 3', '3 + 2'),
        ('12 ÷ 2 × 3', '12 ÷ 2', '2 × 3'),
        ('10 - 4 + 1', '10 - 4', '4 + 1'),
        ('6 × 2 ÷ 4', '6 × 2', '2 ÷ 4'),
        ('7 + 5 - 2', '7 + 5', '5 - 2'),
    ],
    # outside_bracket_first: right names the bracket to resolve, not an op pair
    'outside_bracket_first': [
        ('2 + 3 × (4 - 1)', 'work out the bracket (4 - 1)', '2 + 3'),
        ('5 - 2 × (3 + 1)', 'work out the bracket (3 + 1)', '5 - 2'),
        ('4 + 6 ÷ (2 + 1)', 'work out the bracket (2 + 1)', '4 + 6'),
        ('7 - 3 ÷ (1 + 2)', 'work out the bracket (1 + 2)', '7 - 3'),
        ('3 + 4 × (5 - 2)', 'work out the bracket (5 - 2)', '3 + 4'),
        ('6 - 4 × (2 + 3)', 'work out the bracket (2 + 3)', '6 - 4'),
    ],
}


def render_type3_entries(m):
    """[{'expression', 'right', 'wrong'}] sentences for misconception m, e.g.
    right: 'In an expression like 2 + 3 × 4, the right thing to do is 3 × 4 first.'
    wrong: 'In an expression like 2 + 3 × 4, the right thing to do is 2 + 3 first.'"""
    out = []
    for expr, right_op, wrong_op in TYPE3_BANK[m]:
        out.append({
            'expression': expr,
            'right': f"In an expression like {expr}, the right thing to do is {right_op} first.",
            'wrong': f"In an expression like {expr}, the right thing to do is {wrong_op} first.",
        })
    return out


TYPE3_ADVICE = {m: render_type3_entries(m) for m in TYPE3_BANK}


if __name__ == '__main__':
    import json
    # dumped for the JS sampler (src/user/utils/sampleFormAdvice.js), which
    # needs these banks but never runs the Python model. Type 2 is not dumped
    # here: it is precomputed per trace directly into stimulus_pool_advice.json
    # by pool_advice.py, since it depends on the trace, not just the misconception.
    with open('advice_banks.json', 'w', encoding='utf-8') as fh:
        json.dump({'type1': TYPE1_ADVICE, 'type3': TYPE3_ADVICE}, fh, ensure_ascii=False, indent=1)
    print('wrote advice_banks.json')
