# BODMAS Experiment 3 (teaching advice): agent instructions

1. **Read `HANDOFF.md` first.** It is the complete, current orientation for this repo: what
   Experiment 3 is, what was inherited from Experiment 2 (pool, model, ideal observer, sampler, web
   experiment), setup and deploys, and what is next.
2. **The Experiment 3 design is "v2" (HANDOFF §0, agreed 2026-10-02)**, including sampling (12
   trials). The older 2026-09-16 YES/NO design and its code are superseded.
   Build in the §0 build order and check open design questions with the user before coding them.
3. **Keep `HANDOFF.md` current.** As you complete work (scripts, figures, findings, decisions,
   payments, deploys), update its relevant sections incrementally, or at the latest before the
   session ends. The next session must be able to pick up cold from HANDOFF.md alone.
4. **Work on `main` only** (no second branch). **Pushing `main` deploys the live experiment** once
   the deploy secrets are uploaded. Ask before pushing experiment-material changes, and treat a
   change as done only once it is deployed and verified in the live bundle.
5. Writing style for anything user-facing: no em dashes; keep participant-facing text short. LaTeX
   is compiled on Overleaf only (self-contained folders, figures referenced as
   `figs/<exact-filename>`); never install a local TeX toolchain. See HANDOFF.md §10 for the full
   list of gotchas and working rules.
