# CLAUDE.md: executor instructions for the ITP FBM logout POC

You are executing a planned proof of concept. Everything you need is in:

- [docs/PLAN.md](docs/PLAN.md): tasks, facts (F-IDs), unverified assumptions (U-IDs), decisions (D-IDs), conventions
- [docs/PROGRESS.md](docs/PROGRESS.md): status of every task
- [docs/itp-fbm-option-a-guide.md](docs/itp-fbm-option-a-guide.md): the design being tested
- [docs/build-sheets/](docs/build-sheets/): click paths and card-by-card flow builds for HUMAN tasks

Don't do new research and don't redesign. If a task can't be done as written, stop and propose a plan change.

## Execution protocol

1. Work in PLAN.md order. Take the first task in PROGRESS.md whose status is `todo` and whose dependencies are all `done` or `skipped`.
2. Re-read the whole task in PLAN.md before starting. If any input is missing (an env var, a file, a Terraform output, a finding), don't start it; say what's missing.
3. Set the task's status to `in_progress` in PROGRESS.md.
4. By owner:
   - **AUTO:** implement the steps, run the acceptance check, commit with the task ID in the message (`P2-T3: <task title>`), and mark the task `done` with a one-line note.
   - **HUMAN:** show the named build sheet (or the part the task names) with the real values filled in from `.env` and Terraform outputs, except secrets. Point to `npm run secret:copy -- <name>` instead. Then stop and wait for the human to confirm. Record exactly what they report in the note, then run the acceptance check if it is a command.
   - **VERIFY:** run the check, relay any question the task tells you to ask, and record evidence in the note (run IDs, System Log event UUIDs, timings, PASS/FAIL counts, finding values).
5. **Conditional tasks** (P10): if the trigger doesn't hold, mark the task `skipped` with the finding value as the note.
6. **Failure:** if an acceptance check fails twice, stop. Mark the task `blocked`, and report what failed (exact command and redacted output) and what you tried. Propose a plan change; don't improvise one. Branches written into a task (marked "Branch … decided") aren't plan changes; follow them.
7. Never weaken a safety rule, and never run anything against an org other than the configured preview org.

## Safety rules

- **Preview org only.** Every script that calls Okta goes through `runGuarded(assertPreviewOrg)`. Terraform runs only through `npm run tf -- …`, never bare `terraform`, so the guard and the Terraform precondition both run. The provider pins `base_url = "oktapreview.com"`. If a guard aborts, stop; never edit `POC_EXPECTED_ORG_*` to make it pass.
- **Small blast radius.** The entity risk rule and session protection's Groups impacted target only `POC-ITP-Test`. Session protection Status (Monitoring/Enforced) applies to the whole org. The org is dedicated, but set Enforced only in P9-T2 and restore it at teardown.
- **Connection account.** `OKTA_WF_CONNECTION_USER_ID` must be excluded from every ITP rule (entity risk `users_excluded`, session protection `users.exclude`), must never be in `POC-ITP-Test`, and every flow has a Continue If card that refuses it.
- **Least privilege.** Tests use `POC-Harness`. `POC-Provisioner` (Super Administrator) is for Terraform, `check` setup subcommands, `sp`, and teardown only.
- **Secrets.** They live only in `.env`, `keys/`, `state/`, Vercel env vars, and Workflows connections.
  - Never print a secret, token, private key, or client secret. Don't `cat .env`, don't echo env values, and don't run `terraform output` on sensitive outputs. Use `npm run env:check` to see what's set.
  - Never commit `.env`, `keys/`, `state/`, `.vercel/`, or Terraform state. Run `git status` before every commit.
  - Pass secrets to the Vercel CLI on stdin (the `scripts/vercel.ts` helpers do this), never as arguments.
- **Names.** Prefix every created object with `POC-` (Okta objects, Workflows flows, tables, connections) or `poc-` (user logins, Vercel project). Never modify an existing app, policy, or rule. The one exception is the org's single session protection rule, which can't be created (F3). Change it only through `npm run sp -- …` after a snapshot exists, and restore it at teardown.
- **Changes to existing objects need approval.** If a fix would touch something the POC didn't create (for example granting scopes to the Okta Workflows OAuth app), stop and ask.
- **Teardown** runs only after the human approves in P11-T3.

## Repo conventions

- Node 24 (`.nvmrc`), ESM, TypeScript via `tsx`, tests via `vitest`. Root package: `scripts/`. Mock app: separate package in `mock-app/` (deployed to Vercel from that folder).
- Install dependencies with `npm install --save-exact …` (root) or `npm --prefix mock-app install --save-exact …`.
- Before every AUTO commit, run `npm run typecheck && npm test`, plus `npm --prefix mock-app run typecheck && npm --prefix mock-app test` if `mock-app/` changed.
- Root scripts: `npm run <name> -- <args>`. Names and owners are listed in PLAN.md §6.
- Long-running test phases (`poc … run|observe`, `teardown`) need a Bash timeout of 600000 ms. `observe` phases can be rerun; they resume from `state/runs/current-<test>.json`.
- Record facts learned during execution with `npm run finding -- set <key> <value>`, using the keys named in PLAN.md §3 and the tasks.
- Evidence files (API readbacks without secrets) go in `reports/evidence/`; run records in `reports/runs/`; Workflows exports in `reports/data/`.
- Keep code small and direct: no frameworks beyond those named in the plan, no speculative options.
- Commit messages: `P<n>-T<m>: <task title>`, then a blank line and a one-line summary; follow the harness's attribution instructions for any trailer.

## Updating PROGRESS.md

- One row per task; edit only the Status and Note columns.
- Status values: `todo`, `in_progress`, `done`, `blocked`, `skipped`.
- Note format: `YYYY-MM-DD: <one line>`. Put evidence (run IDs, event UUIDs, seconds per step, finding values, commit SHA) or the reason for blocked or skipped.
- For HUMAN tasks, put what the human reported, in their words where it matters (for example "Probe rows: A=…, B=…, C=…").
- Commit PROGRESS.md with the task's commit for AUTO tasks, or on its own (`progress: P6-T2 done`) for HUMAN and VERIFY tasks.
