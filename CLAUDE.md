# BODMAS Experiment 3 (teaching advice): agent instructions

1. **Read `HANDOFF.md` first.** It is the complete, current orientation for this repo: what
   Experiment 3 is, what was inherited from Experiment 2 (pool, model, ideal observer, sampler, web
   experiment), setup and deploys, and what is next.
2. **The Experiment 3 design is NOT decided yet** (HANDOFF §0). Everything task-specific in the repo
   is still Experiment 2's. Finish the design discussion with the user before writing code.
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
