# BODMAS Experiment 3 (teaching advice): Handoff

A complete, from-scratch orientation for a model picking this up cold. Read this instead of any
conversation history.

> **⚠️ STANDING INSTRUCTION TO EVERY AGENT: keep this file current.** As you complete work (new
> scripts, figures, findings, decisions, payments, deploys), update the relevant sections either as
> you go or at the latest before your session ends. This file is the single source of truth; the
> next session must be able to pick up cold from it alone.

---

## 0. What this repo is

**Repo:** `divya603/bodmas-exp3-teaching` (GitHub, public; created empty by the user on 2026-09-16).
**Experiment 3 of 3.** In the user's words: participants are asked whether **advice given to the
student is helpful, YES or NO**. The student's step-by-step work contains one order-of-operations
misconception, as in Experiments 1 and 2.

**Status (2026-09-16): SEEDED ONLY. The Experiment 3 design is NOT decided.**
- The repo is a copy of Experiment 2 (`divya603/bodmas-exp2-hidden`) at its commit `b26eb7a`, with
  fresh git history (one initial commit). The user chose Experiment 2's stimulus pool (v6) over
  Experiment 1's (v5).
- What works as inherited: the v6 pool (verified, §3), the learner model, the Bayesian ideal
  observer with hidden-step inference (§4, §5), the 24-trial sampler in JS and Python (§7), and a
  complete Smile web experiment (§7).
- **Everything task-specific is still Experiment 2's**: the trial screen shows a belief statement
  ("Tara believes addition should be done before multiplication.") with one line of the work hidden,
  the instructions say "one step skipped", and the practice items, quiz and sampler are built for
  belief judgments with easy / medium / hard hidden lines. None of it asks about advice yet.
- Not done: the Experiment 3 design (§9), deploy secrets (§1), anything about advice. No human or
  LLM data exist.

Provenance: Experiment 1 (`divya603/bodmas-exp1-position`) was split out of the archive repo
`divya603/bodmas-model`; Experiment 2 was seeded from Experiment 1 and rebuilt its pool (v6) with
natural error positions and hidden-line versions; this repo was seeded from Experiment 2. Nothing is
linked: **a change in Experiment 1 or 2 (model code, pool, screens) does not reach this repo**, and
vice versa.

### What Experiment 3 still needs (decide with the user before building)
1. **The advice.** What an advice item says (e.g. "Remember to multiply before you add."), how many
   kinds there are, and what makes it helpful. One natural mapping onto the pool, NOT yet agreed:
   advice that targets the misconception the student actually holds is helpful (the pool's category
   A, whose statement names the present rule), and advice that targets a different rule is not
   (category B, which names a foil that passes the observer and look-alike checks, §3). The pool's
   `belief_statement` and `STATEMENT_TEMPLATES` would then be replaced by advice templates.
2. **Hidden lines or not.** Every item stores all 7 lines plus a `hidden_line`. Showing the full
   work means using one item per trace (`base_id`) and ignoring `hidden_line`; keeping Experiment 2's
   easy / medium / hard hiding is also possible. Decide first; the sampler depends on it.
3. **Form and counterbalancing.** Experiment 2's form is 24 trials (4 per misconception, 8 per
   difficulty, 12 YES-correct / 12 NO-correct); see §0 "Inherited design". Keep, adapt or replace.
4. **Screens and text.** Trial question (e.g. "Is this advice helpful?"), instructions, quiz,
   practice items with feedback, strategy question, debrief. The user wants participant text short.
5. **The ideal observer's role.** It currently answers "does the student hold rule R?" (§4). If
   helpful advice is advice about the held rule, the same marginal answers "is this advice
   helpful?"; otherwise it needs a new definition.

### Inherited design (Experiment 2's, as it stands in this copy)
- **Error position is NOT selected.** Each trace is drawn the way the learner would produce it (§3),
  restricted to an error at step 2, 3 or 4.
- **Difficulty = which line is hidden**, relative to the error step k (the wrong move turns line
  s(k-1) into line s(k)):

  | difficulty | hides | what the participant loses |
  |---|---|---|
  | easy | s(k+1) | the line after the error; the wrong move stays fully visible |
  | medium | s(k-1) | the line before the error; the wrong result is visible, not the line it came from |
  | hard | s(k) | the error's own line |

  The expression s0 and the answer s6 always stay visible. The hidden line is simply not shown
  (nothing in its place); the instructions tell participants "one step skipped".
- **Response: YES / NO** with the **D (YES) and F (NO) keys** or two small buttons (green YES, red
  NO), in practice and the real trials, with a 3-second answer lock per trial. This matches what
  Experiment 3 asks for, so the answer mechanics can probably stay.
- **Pool:** 240 traces x 3 hidden versions = 720 items, 360 YES-correct / 360 NO-correct.
- **Per participant: 24 trials, every one on a different expression.** 4 per misconception, 8 per
  difficulty, 12 / 12; 2 / 2 within each misconception, 4 / 4 within each difficulty. Each
  misconception gets one difficulty twice (once YES-correct, once NO-correct) and the other two
  once, following this table, with a random permutation assigning misconceptions to rows:

  | row | easy | medium | hard |
  |---|---|---|---|
  | 1 | A + B | A | B |
  | 2 | A + B | B | A |
  | 3 | A | A + B | B |
  | 4 | B | A + B | A |
  | 5 | A | B | A + B |
  | 6 | B | A | A + B |

  Smile has no cross-participant counter, so the 36 cells balance in expectation (310 to 350 per
  cell over 500 simulated forms, expected 333). Which foil a B trial names is left to the draw.

### The 6 misconceptions
| id | meaning |
|---|---|
| `add_before_mul` | does `+` before an adjacent `×` |
| `add_before_div` | does `+` before an adjacent `÷` |
| `sub_before_mul` | does `-` before an adjacent `×` |
| `sub_before_div` | does `-` before an adjacent `÷` |
| `same_priority_rtl` | evaluates equal-priority ops right-to-left instead of left-to-right |
| `outside_bracket_first` | must finish everything outside a bracket before resolving its contents |

`outside_bracket_first` is a **preference**, not a permission: a learner holding it may not enter a
bracket while literal-literal work remains outside. It is the only rule that REMOVES options rather
than adding them, and that asymmetry is behind almost every place hiding a step matters (§5).

---

## 1. First-time setup on a new machine or clone

Run these in order, once, right after cloning:
```bash
git clone https://github.com/divya603/bodmas-exp3-teaching.git
cd bodmas-exp3-teaching
npm run get_secrets          # fetch the 5 gitignored lab files from codec-lab/smile-secrets
npm run upload_config        # push the app + deploy config into THIS repo's GitHub secrets
npm run setup_project        # npm install + git hooks (post-commit / post-checkout)
pip install -r base-task/requirements.txt
(cd base-task && python3 verify.py)   # must print ALL CHECKS PASSED
npm run force_deploy         # first deployment (gh workflow run deploy.yml on the current branch)
```

What each secrets step does:
- **`npm run get_secrets`** (`scripts/get_secrets.sh`) downloads, via `gh api`, from the private
  lab repo `codec-lab/smile-secrets`: `env/.env.local` (Firebase app config), `env/.env.deploy.local`
  (lab-server SSH details), `env/.env.docs.local`, `firebase/.service-account-key.json` (needed by
  `npm run getdata`), and `scripts/get_recruitment_data.mjs` (needed by `npm run getrecruitment`).
  All five are gitignored and must never be committed. Needs `gh` logged in with access to that repo
  (divya603 had access on 2026-09-13; otherwise ask Mark).
- **`npm run upload_config`** (`scripts/update_config.sh`) pushes `env/.env.local` as
  `SECRET_APP_CONFIG` and every line of `env/.env.deploy.local` as its own secret
  (`EXP_DEPLOY_HOST`, `EXP_DEPLOY_KEY`, `EXP_DEPLOY_PATH`, `EXP_DEPLOY_PORT`, `EXP_DEPLOY_USER`,
  `SLACK_WEBHOOK_URL`, `SLACK_WEBHOOK_ERROR_URL`) to whatever repo `origin` points at. Only needed
  once per repo, not once per clone.

**Status as of 2026-09-16: NOT set up.** The repo was created empty and has no GitHub secrets, so
the initial push's deploy run skips its `deploy` job and nothing is served. The local checkout at
`~/Desktop/NYU/Darpa/Bodmas-Exp3-Teaching/bodmas-exp3-teaching` was made with `git archive` from
Experiment 2, so it has **no `node_modules`, no git hooks and no `env/*.local` secrets**: run
`npm run get_secrets` and `npm run setup_project` before `npm run dev` or `npm run build`.
`deploy.yml` SKIPS the `deploy` job and still shows GREEN when secrets are missing, so after any
deploy check with `gh run view <id>` that the **`deploy` job itself ran**.

⚠️ Once secrets are uploaded, a deploy of this repo serves **Experiment 2's task** (hidden lines,
belief statements) under Experiment 3's URL until the advice task is built. Do not share the URL.

Node: `.node_version` pins 20.18.1; Node 24 has been working locally. If `npm install` misbehaves,
switch with `nvm use 20`.

What changes automatically because this is a separate repo:
- **The deploy URL.** Path is `/<owner>/<repo>/<branch>/`, so main deploys to
  `https://www.codec-lab.org/divya603/bodmas-exp3-teaching/main/`, and the short codename URL is
  derived from the same path (printed in the deploy log). Any Prolific link must point here.
- **Where the data lands.** Firestore's `projectRef` (`src/core/config.js`) is derived from the
  deploy path, so this experiment's data cannot mix with Experiment 1's or 2's.

---

## 2. Repository map

```
base-task/         The model, the pool, the ideal observer, the hidden-step inference, the sampler's
                   Python twin. §3 to §5, §7.
analysis-Bayesian/ Ideal-observer figures. §6 (stale).
src/               The Smile/Vue web experiment (still Experiment 2's task). §7.
scripts/           Smile deploy/data scripts.
public/            consent-form.pdf, debrief.pdf served by the frontend.
env/, firebase/    Smile config. env/.env is tracked defaults; env/*.local are secrets (untracked).
data/              Pulled participant data lands here. Participant files are gitignored.
docs/ tests/ plugins/ analysis/ plans/   Smile framework infrastructure, not ours. Leave alone.
```

---

## 3. The model and the pool (`base-task/`)

Everything in this section is inherited unchanged from Experiment 2 (`b26eb7a`). Code comments that
say "Experiment 2" are therefore accurate about where the code comes from.

### Model core
- **`dag.py`** FlatDAG representation of an expression (atoms + op nodes, shared references).
- **`parser.py`** `build_dag(expr)`. Folds signed-number literals so re-parsing intermediate trace
  strings matches `_eval`'s representation.
- **`pattern_matcher.py`** classifies 3-node "windows" into Tables 1 to 6.
- **`learner.py`** `MISCONCEPTION_FLIPS`: each misconception's bidirectional `to_true`/`to_false`
  validity flips. A learner is a list of misconception ids.
- **`valid_actions.py`**, **`traces.py`** `generate_traces(dag, misconceptions)` simulates a learner
  and returns ALL step-by-step traces it could produce. `_next_dags(dag, L)` is the set of states
  learner L may legally reach in one step. Includes the `is_zero_divide` guard.
- **`distance.py`** `correct_answer()`, `tree_edges()`, `diagnostic_traces()`.
- **`generator.py`** the original random expression generator (imported by the constrained one).
- **`inference.py`** `posterior_over_profiles(trace)` and `marginal_rule_probability()`; see §4.
- `Bodmas_Modeling.pdf` is the written description of the model.

### How the error position comes about
A misconception only changes which moves the learner thinks are legal in particular windows (e.g.
`add_before_mul` makes `+` fireable before an adjacent `×` and that `×` unfireable). At each step the
learner may take ANY of its legal moves, so the same learner on the same expression can make its one
error at any step from 1 to 5, depending on the order it works in. **Position is a property of the
path, not of the expression or the rule.** Step 6 can never hold the error (one operation is left
and its only move is legal). Experiment 1 selected paths with the error at step 1 or 3; the v6 pool
does not select.

### The constrained generator and helpers
- **`generator_constrained.py`** draws numbers constructively left to right with one step of
  operator lookahead: subtraction operands ordered, division exact with a proper divisor (no `÷ 1`,
  no `n ÷ n`), `×` operands <= 6, no run of more than 2 equal numbers. Also holds:
  - `validate_trace()`: non-negative integers only, nothing over 999, no zero anywhere. This check on
    the displayed trace is the real gate, since evaluation order is the learner's choice.
  - `error_steps(trace)`: **the correct expert-legality test**. For each step it asks whether an
    expert could produce that line FROM THE IMMEDIATELY PRECEDING LINE
    (`expert_next` -> `_next_dags(build_dag(prev), [])`).
    ⚠️ Do NOT reimplement this as expert trace-edge membership. Once the learner diverges, every
    later state is off the expert's trace tree, so edge membership marks all subsequent steps as
    errors.
- **`find_pairs.py`** (name historical) the trace finder. `learner_paths(dag, L)` lists every path
  with the learner's probability of taking it (product of 1/|legal moves|, the observer's pi_L).
  `usable_traces(expr, m)` keeps the usable ones (finishes, exactly one expert-illegal move, a
  different answer from the expert, passes `validate_trace`) with the error in `POSITIONS = (2, 3, 4)`.
  `sample_trace(expr, m, rng)` draws one of those with the learner's own probabilities.
- **`lookalike.py`** `error_step_rules(trace)`: the statements that plainly describe a trace's error
  step, read from the surface of the two lines, not from the model. Drives the look-alike guard.
- **`natural_position.py`** where the error lands with no position selection (§5). About 20 s.

### The pool: `pool.py` -> `stimulus_pool.json` (v6)
**720 items = 240 traces x 3 hidden versions, each trace on its own expression, seed 2026.**
Byte-identical to Experiment 2's pool as of 2026-09-16; if either repo rebuilds, the other does not
follow.

How a trace is chosen: for misconception m, draw an expression (`generate_expression`, 6 ops,
`bracket_prob` 1.0 for `outside_bracket_first` else 0.6); `sample_trace` draws one usable trace with
the error at step 2 to 4 by the learner's own path probabilities; keep it if it passes the checks for
some still-open cell (the scarcest cell wins, ties random). Builds in about 3 s.

Grid:
```
A: present(6)            =  6 cells x 20 traces = 120 traces -> 360 items
B: present(6) x named(5) = 30 cells x  4 traces = 120 traces -> 360 items
```
So: 120 items per category x difficulty; 20 per misconception x difficulty x category; 4 per
present x named x difficulty B cell; the present x named heatmap over traces has 20 on the diagonal
and 4 in every off-diagonal cell. Category **A**'s statement names the present misconception
(correct answer YES), **B**'s names an absent foil (correct answer NO).

Checks (the builder applies them; `verify.py` re-derives them):
- **A trace:** no other single rule could have made the error step, and the named rule plainly
  describes it; in every hidden version the observer's marginal on the true rule is above
  `A_HIDDEN_MIN` = 0.5.
- **B trace naming foil f:** on the full trace f's marginal is at most `UNSUPPORTED_MAX` = 0.35 and f
  is not a look-alike; in every hidden version f's marginal is still at most 0.35.
- Every trace: 6 steps, exactly one expert-illegal move at step 2 to 4, learner answer differs from
  the correct one, numbers 1 to 918 shown, no negatives, decimals or zeros.

Seed 2026 result: error step over the 240 traces is 80 / 79 / 81 at steps 2 / 3 / 4 (chance; other
seeds give e.g. 80/64/96), uneven per rule (e.g. `outside_bracket_first` 13/21/6).

Item fields: `id` (e.g. `A000-E`), `base_id` (`A000`, shared by a trace's three versions),
`category, difficulty` (`easy`/`medium`/`hard`), `hidden_line` (index into `trace`),
`error_position, expression, n_ops, misconceptions, num_misconceptions, trace` (all 7 lines),
`probed_misconception, statement_correct, student_name, belief_statement, io_marginal_full,
io_marginal_hidden`, plus on B items `foil_status`. `student_name` and `belief_statement` are
placeholders the sampler reassigns. **For a full-work design, take one item per `base_id` and
ignore `hidden_line` / `difficulty` / `io_marginal_hidden`.**

**Answer-leak fields** (never show a solver or a participant): `statement_correct, misconceptions,
probed_misconception, category, num_misconceptions, foil_status, io_marginal_full,
io_marginal_hidden`. `id` and `base_id` start with A or B, so they encode the category: never display
them (Smile's router never puts step ids in the URL).

### ⚠️ Things about the pool that will bite you
1. **6 operators.** At 4 ops `outside_bracket_first` never reaches step 3; never go below 5.
2. **Position is not selected, but not controlled either.** It follows each rule's natural spread
   within steps 2 to 4, so it is tied to misconception. Record `error_position` as a covariate and
   include the trace (`base_id`) as a random effect.
3. **`foil_status` is RECORDED but NOT BALANCED** (60 refuted / 60 unsupported traces, lopsided per
   foil). **Never split a figure or analysis by it.**
4. **The pool excludes the hardest foils** (marginal above 0.35), so no B item names a rule the
   trace positively supports.
5. **Correct steps carry little evidence** (measured on Experiment 1's pool: the error steps carried
   85% of all hypothesis eliminations, the forced last step none).
6. **`outside_bracket_first` errors look like the operator rules** (e.g. `4 + 8 ÷ (4 - 1)` ->
   `12 ÷ (4 - 1)` reads as "addition before division" but only outside() can make it). Guarded: no B
   item names a look-alike foil. Advice items will need the same guard.
7. **Two pool copies.** `base-task/stimulus_pool.json` is the source; the frontend bundles
   `src/user/data/stimulus_pool.json`. Identical now; after any rebuild, copy and check with `cmp`.
8. **The statements are about beliefs.** `pool.py: STATEMENT_TEMPLATES` ("{name} believes addition
   should be done before multiplication.") and the foil checks were designed for belief judgments.
   Advice items need their own templates and a check that the "helpful" key is defensible.

### Verification: `verify.py`
Independent verifier (`cd base-task && python3 verify.py`, about 2 s, exits non-zero on failure):
re-derives every trace, re-tests expert legality, checks error steps 2 to 4, re-runs the full and
hidden observer (hidden versions via `multi_hidden_posterior`, a different route from the
builder's), the A / B checks, the look-alike guard, the hidden-line rule per difficulty, and every
cell count. **ALL CHECKS PASSED in this repo on 2026-09-16.**

---

## 4. The Bayesian ideal observer

`base-task/bayes.py` -> `base-task/bayes_per_item.json`: one row per trace (240; `id` = `base_id`).
The observer weighs **22 hypotheses** (expert + 6 singletons + 15 pairs) at epsilon 0; keep 22
(the pairs separate "no evidence either way" from "had a chance and did not").
```
P(L | s0..s6) ∝ P(L) · prod_t pi_L(s_{t+1} | s_t)        pi_L uniform over L's legal moves
P(R ∈ L | trace) = sum_L P(L | trace) · [R ∈ L]
```
The statement is not an input; it only picks which marginal is read off. Result: 240/240; A
marginal exactly 1.000; B mean 0.134, max 0.333. Use `probed_marginal`, never `map_profile` (17 of
240 MAPs pair the true rule with `outside_bracket_first`).

`base-task/hidden.py` handles hidden lines (marginalising over the hidden state; one-line and
any-set versions that agree exactly). Hiding can only flatten the posterior, and a hidden line never
revives the expert, because every trace's answer differs from the correct one.

---

## 5. Hidden-step findings (from Experiment 2, same pool)

`base-task/bayes_hidden.py` -> `bayes_per_item_hidden.json` (720 rows, each item's own line hidden):
the observer is 720/720 correct; easy and medium change no category-A marginal; hard moves 5 A
items, all `outside_bracket_first` (min 0.600, that rule's hard mean 0.935). So the observer barely
distinguishes the three difficulties; any difficulty effect in people is processing cost.

`base-task/natural_position.py`: with no position filter, usable single-error traces put the error
at steps 1 to 5 in roughly 15 / 18 / 23 / 23 / 21 %, very unevenly per rule (e.g.
`same_priority_rtl` 38% at step 5, `outside_bracket_first` never at step 5). About 85% of random
learner paths are unusable (no error, several errors, or no visible effect).

---

## 6. Figures (`analysis-Bayesian/`)

⚠️ **Stale for the v6 pool** (inherited that way from Experiment 2): the scripts group by error
position 1 / 3 and `plot_bayes_hidden_dist_A.py` reads conditions the current
`bayes_per_item_hidden.json` does not have. The PNGs are from Experiment 1's pool. Rules for any new
figure: category A is a point mass at 1.000 (except `outside_bracket_first` hard); marginals are
discrete, use exact-value stems; never split by `foil_status`.

---

## 7. The web experiment (`src/`), inherited from Experiment 2

A Smile (codec-lab / gureckislab) Vue-3 experiment. **User code in `src/user/`.** `npm run dev` runs
it locally (after `npm run setup_project`); `npm run build` must succeed before pushing.
**All task screens are Experiment 2's.**

- **`src/user/design.js`** the timeline: consent -> windowsizer -> instructions -> comprehension quiz
  -> practice -> experiment -> strategy question -> feedback survey -> demographics -> save ->
  debrief -> thanks. `estimated_time` is still Experiment 1's "30-40 minutes".
- **`TraceJudgmentView.vue`** (in `src/user/components/trace_judgment/`) the 24-trial task: the
  expression, the work with `trace[hidden_line]` left out (`shownWork()`), the belief statement, the
  question "Is this what the student believes?", the YES / NO answer (an answer records the trial and
  moves on), 3-second lock, "X of 24" counter, mouse tracking, bonus scoring. Recorded per trial:
  `response` (`'yes'`/`'no'`), `response_method`, `rt`, `responded_agree`, `correct_agree`,
  `is_correct`, `mouse`, plus every item field.
- **`YesNoButtons.vue`** green YES (D) and red NO (F) buttons (small: `w-28 py-2 text-base`) with
  "Press D for YES or F for NO" underneath; listens for the D / F keys while mounted, ignores input
  while `disabled`, emits `answer`. Byte-identical to Experiments 1 and 2 as of 2026-09-16, as are
  `PracticeView.vue` and `StrategyQuestionView.vue`.
- **`PracticeView.vue`** 3 practice items from `src/user/data/practice_items.json` (written by
  `base-task/practice.py`; Experiment 1's belief items, every line shown): YES / NO answer, then the
  error step highlighted amber with a note and a feedback paragraph ending "the right answer would be
  YES/NO".
- **`src/user/utils/sampleForm.js`** + Python twin **`base-task/sample_form.py`**: Experiment 2's
  24-trial sampler (§0 "Inherited design"). `python3 sample_form.py` runs the 500-seed checks;
  `python3 sample_form.py --dump 500 | node sample_form_parity.mjs` (from `base-task/`) confirms the
  JS draws identical forms. Both pass in this repo (2026-09-16). **Change both together.**
- **`InstructionsView.vue`** Experiment 2's user-approved text: a math problem, the student's work
  "with one step skipped", and a statement about the student's belief; every student makes exactly one
  mistake; "Your Job. Decide whether the statement describes what the student believes, using their
  work as evidence. Answer YES when the student's mistake is the one the statement describes and NO
  otherwise."; "Bonus. You can earn a bonus of up to $2."; and the practice / 24 problems / 3-second
  paragraph. **The user wants participant text short; do not over-explain.**
- **`quizQuestions.js`** 3 questions (what your answer is based on; exactly one mistake; a
  different-mistake statement means NO).
- **`StrategyQuestionView.vue`** asks how participants decided whether to answer YES or NO.
- **`src/builtins/thanks/ThanksView.vue`** Prolific completion code **`CNIEB9GV`** (an old study's).
  Replace it in both the `prolific` and `web` blocks for this study's Prolific code before launch.
- **`public/consent-form.pdf`** NYU IRB form (IRB-FY2026-11440, PI Mark Ho);
  **`public/debrief.pdf`** the lab's generic debrief. Confirm with the PI that the protocol covers
  Experiment 3.

### Bonus
YES counts as agree; a trial is correct if that matches `statement_correct`.
`bonus = max(0, (accuracy - 0.5) / 0.5) x $2`, rounded to cents, recorded per trial (`is_correct`)
and as a `traceJudgmentBonus` block in `pageData_exp`. Participants are told only "You can earn a
bonus of up to $2." Base pay is separate.

### ⚠️ Prolific URL (a missing-params bug cost a whole batch once)
Participants MUST arrive on `#/welcome/prolific/` with the ID params, or they are recorded
`recruitmentService: "web"` with no `prolific_id` and cannot be bonused. Params BEFORE and AFTER the
hash:
```
https://www.codec-lab.org/divya603/bodmas-exp3-teaching/main/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}#/welcome/prolific/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
```

### Checklist before running any participant
- [ ] Experiment 3 design decided (§0) and its trial screen, sampler, practice items, instructions
      and quiz built, deployed, and the LIVE bundle verified to contain them.
- [ ] Deploy secrets uploaded and a real deploy confirmed (§1).
- [ ] Prolific completion code replaced; `estimated_time` in `design.js` checked with the PI.
- [ ] Consent and debrief checked with the PI for Experiment 3.
- [ ] Prolific URL tested end to end with a fake PID (a `prolific_id` must appear in
      `npm run getrecruitment`, type `testing`).
- [ ] Fresh bonus ledger for this experiment.

### Running participants and paying them
- `npm run getdata` prompts for data type (`testing` or `real`), complete-only or all, branch
  (`main`), filename; saves JSON under `data/`. `npm run getrecruitment` -> `data/private/...` (maps
  `session_id` -> `prolific_id`). **Join key: data `seedID` == recruitment `session_id`.**
- Bonus list: the old study's `scripts/make_bonus_list.py` was never committed; it is at
  `~/Desktop/NYU/Darpa/Bodmas_model/scripts/make_bonus_list.py`. It recomputes each bonus from raw
  responses against `statement_correct` and emits `prolific_id,amount` lines for Prolific.
- Keep a FRESH payment ledger (`data/private/bonus_paid.csv`, gitignored): run the script, pay,
  re-run with `--mark-paid`. It is the only guard against double-paying across batches.

### Deploys
`.github/workflows/deploy.yml` deploys on push to ANY branch except `feat-* fix-* refactor-* test-*
chore-* style-* docs-* ci-*`, each to its own path `/<owner>/<repo>/<branch>/`. **Pushing `main`
deploys the live experiment** (once secrets exist). Commits touching only `*.md` files or `docs/` do
NOT deploy (`paths-ignore`). Monitor with `gh run list` / `gh run watch`. A transient "SSH i/o
timeout" at "create the remote folders" has happened in other repos; `gh run rerun <id> --failed`
fixed it.

---

## 8. Commands cheat-sheet

```bash
# Pool (v6) and its checks
cd base-task && python3 pool.py            # rebuild the pool (seed 2026, ~3 s); only if deliberately changing it
cd base-task && python3 verify.py          # independent checks, incl. every hidden version (~2 s)
cp base-task/stimulus_pool.json src/user/data/stimulus_pool.json   # after any rebuild (then cmp)

# Observer
cd base-task && python3 bayes.py           # full traces -> bayes_per_item.json (240 rows)
cd base-task && python3 bayes_hidden.py    # each item's own hidden line -> bayes_per_item_hidden.json
cd base-task && python3 natural_position.py   # error position with no selection (~20 s)

# Sampler (Experiment 2's)
cd base-task && python3 sample_form.py     # 500-seed checks of the Python twin
cd base-task && python3 sample_form.py --dump 500 | node sample_form_parity.mjs   # JS == Python?

# Practice items (Experiment 1's belief items)
cd base-task && python3 practice.py        # check + write practice items to src/user/data/

# Experiment
npm run setup_project                      # first, in this checkout (no node_modules yet)
npm run dev ; npm run build
git push origin main                       # DEPLOYS THE LIVE EXPERIMENT once secrets exist (ask first)
npm run getdata ; npm run getrecruitment
npm run upload_config                      # push deploy secrets from env/*.local
```

---

## 9. What is next

1. **Design Experiment 3 with the user** (§0 "What Experiment 3 still needs"): the advice items and
   what makes one helpful, hidden lines or full work, the form, the screens and text, the observer's
   role. Finish that discussion before writing code.
2. **Build it**: advice items (in the pool or derived from it) with a verifier; the sampler in both
   languages with parity; the trial screen, practice items, instructions, quiz and strategy question.
3. **Set up deploys** (§1), deploy, and verify the live bundle.
4. The §7 checklist.

---

## 10. Gotchas and working rules

- **An experiment change is only done when it is committed, pushed, verified in the deployed bundle,
  and recorded here.** The live site is built by CI from the git remote; local files do nothing for
  participants. A previous study lost 19 paid participants to a pool that was regenerated locally but
  never pushed.
- **Work on `main` only; no second branch** (the user's preference). Pushing `main` deploys the live
  experiment once secrets exist, so run the checks (`verify.py`, `sample_form.py`, the parity check,
  `npm run build`) before every push, and ask the user before pushing experiment-material changes.
- **A green deploy run does not mean it deployed.** With secrets missing, the `deploy` job is skipped
  and the workflow still passes. Check the `deploy` job's steps (`gh run view <id>`).
- **Three repos, no links.** Experiments 1 (`bodmas-exp1-position`), 2 (`bodmas-exp2-hidden`) and 3
  share model code and, as of 2026-09-16, `YesNoButtons.vue`, `PracticeView.vue` and
  `StrategyQuestionView.vue` by copy only. When the user changes shared screens or wording in one,
  ask whether the others should follow.
- **Two pool copies can drift** (§3 item 7). **`sampleForm.js` and `sample_form.py` must stay in
  sync**; the live experiment uses the JS one.
- **Never commit** `data/real-all-main-data.json`, anything under `data/private/`, `env/*.local`,
  `firebase/.service-account-key.json`, or any API key. The repo is public.
- **User preferences:** finish a design discussion before writing code. On a surprising result, audit
  our own stimuli and task before blaming participants. The user often runs commands themselves via
  `! <cmd>` and likes work pushed rather than left local. One branch (`main`). Participant-facing
  text short, no over-explaining. **No em dashes in any writing** (docs, reports, chat). **LaTeX
  compiles on Overleaf only**: self-contained folders, figures referenced as `figs/<exact-name>`,
  never install a local TeX toolchain.
- If a commit prints `Cannot find module '@codenamize/codenamize'`, run `npm run setup_project`. The
  commit itself still lands.
- Commit messages end with the current model's co-author line.
