# ITP Universal Logout for FBM apps: proof of concept

A POC in a dedicated Okta preview org. One delegated Workflows flow, triggered by ITP's entity risk
rule, by session protection, or by a SOC admin, revokes Okta sessions and then calls each FBM app's
logout endpoint. A mock app on Vercel stands in for the FBM apps.

- [docs/PLAN.md](docs/PLAN.md): tasks, verified facts, decisions, test plan
- [CLAUDE.md](CLAUDE.md): execution protocol and safety rules
- [docs/PROGRESS.md](docs/PROGRESS.md): status of every task
- [docs/PRE-CODING-CHECKLIST.md](docs/PRE-CODING-CHECKLIST.md): what the human does before and between coding phases

Requires Node 24 and Terraform 1.6 or later. Secrets live in `.env` (gitignored); never commit it.
