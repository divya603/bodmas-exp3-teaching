# BODMAS Experiment 3: teaching advice

A student's step-by-step work shows one order-of-operations misconception. Participants see a piece
of advice given to that student and answer YES or NO: is the advice helpful?

This repo was seeded on 2026-09-16 from Experiment 2 (`divya603/bodmas-exp2-hidden`), so for now it
contains Experiment 2's parts:

- `base-task/`: the learner model, the v6 stimulus pool (240 traces, each also stored in three
  hidden-line versions), its builder and verifier, a Bayesian ideal observer (including hidden-step
  inference), and the 24-trial sampler's Python twin.
- `analysis-Bayesian/`: ideal-observer figures (stale for the v6 pool).
- `src/`: the web experiment, built on [Smile](https://smile.gureckislab.org/) (codec-lab fork). It
  still runs Experiment 2's task; the advice task is not built yet.

**Start with [`HANDOFF.md`](HANDOFF.md)**, the full orientation: what was inherited, setup, and what
Experiment 3 still needs.
