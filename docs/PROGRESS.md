# Progress

Status values: `todo`, `in_progress`, `done`, `blocked`, `skipped`. Update only Status and Note (see CLAUDE.md). Note format: `YYYY-MM-DD: <one line>`.

| ID | Title | Owner | Depends on | Status | Note |
| --- | --- | --- | --- | --- | --- |
| P0-T1 | Initialize repo and toolchain | AUTO | none | done | 2026-10-28: npm ci, typecheck, test exit 0; .env/keys/state ignored. .env.example blocked by permission rule, so docs/env.template stands in. npm cache ~/.npm has an EACCES file, so installs use --cache $TMPDIR/fbm-npm-cache. npm audit flags vercel (dev only; prod deps clean) |
| P0-T2 | Env schema, preview-org guard, Okta client, and preflight | AUTO | P0-T1 | done | 2026-10-28: 23 tests pass, typecheck 0; okta.com URL aborts NOT_PREVIEW with exit 2. Real preflight also aborts NOT_PREVIEW: the configured org ends in .okta.com, not .oktapreview.com. Guard left unchanged; user decision needed (see P1-T1) |
| P0-T3 | Keys, local secrets, findings, and clipboard helper | AUTO | P0-T2 | done | 2026-10-28: 39 tests pass; setup:secrets set 16 keys, rerun is a no-op and the key is unchanged; keys/harness-private.pem is 0600; the public JWK has no private fields; secret:copy prints only lengths. Only the harness has a key pair (provisioner is an API token) |
| P1-T1 | Confirm prerequisites and fill org values | HUMAN | P0-T3 | todo |  |
| P1-T2 | Add the Okta API token to .env | HUMAN | P1-T1 | todo |  |
| P1-T3 | Record org facts | VERIFY | P1-T2 | todo |  |
| P1-T4 | Vercel token and plan | HUMAN | P0-T3 | todo |  |
| P2-T1 | Scaffold mock app, config, and store | AUTO | P0-T1 | todo |  |
| P2-T2 | Global Token Revocation endpoint and token validation | AUTO | P2-T1 | todo |  |
| P2-T3 | Vendor-style revoke endpoint and test API | AUTO | P2-T2 | todo |  |
| P2-T4 | OIDC sign-in with PKCE and the refresh test endpoint | AUTO | P2-T3 | todo |  |
| P2-T5 | Vercel project and first production deploy | AUTO | P2-T4, P1-T4 | todo |  |
| P2-T6 | Install Upstash Redis on the project | HUMAN | P2-T5 | todo |  |
| P2-T7 | Redeploy and smoke-test the mock app | AUTO | P2-T6 | todo |  |
| P3-T1 | Terraform skeleton, org guard, and wrapper | AUTO | P1-T3 | todo |  |
| P3-T2 | Test users and the POC-ITP-Test group | AUTO | P3-T1 | todo |  |
| P3-T3 | Network zone, app sign-in policy, and FBM test apps | AUTO | P3-T2, P2-T5 | todo |  |
| P3-T4 | Custom authorization server, logout scope, and dispatcher client | AUTO | P3-T3 | todo |  |
| P3-T5 | Verify a client-credentials token from POC-FBM-AS | VERIFY | P3-T4 | todo |  |
| P3-T6 | Harness service app, scopes, and least-privilege roles | AUTO | P3-T4 | todo |  |
| P4-T1 | Push Okta config to the mock app and redeploy | AUTO | P3-T6, P3-T5, P2-T7 | todo |  |
| P4-T2 | Verify the GTR and vendor endpoints end to end | VERIFY | P4-T1 | todo |  |
| P4-T3 | Sign in through the FBM OIDC app | HUMAN | P4-T2 | todo |  |
| P5-T1 | System Log poller and risk helpers | AUTO | P3-T6 | todo |  |
| P5-T2 | Run records, scenario engine, probe, and dispatcher checks | AUTO | P5-T1, P2-T7 | todo |  |
| P5-T3 | Registry and results CSV generator | AUTO | P3-T3 | todo |  |
| P5-T4 | Tests T1, T2, and T5 | AUTO | P5-T2 | todo |  |
| P5-T5 | Tests T4 and T6 | AUTO | P5-T4 | todo |  |
| P5-T6 | Tests T3 and T7 | AUTO | P5-T5 | todo |  |
| P5-T7 | Report generator | AUTO | P5-T6 | todo |  |
| P5-T8 | Session protection script and teardown scripts | AUTO | P5-T7 | todo |  |
| P6-T1 | Folder, tables, CSV import, and connections | HUMAN | P5-T3, P3-T5, P2-T7 | todo |  |
| P6-T2 | Build POC-FBM Logout – Per App | HUMAN | P6-T1 | todo |  |
| P6-T3 | Build POC-FBM Logout – Dispatcher | HUMAN | P6-T2 | todo |  |
| P6-T4 | Dispatcher scenarios S1–S3 | VERIFY | P6-T3, P5-T2 | todo |  |
| P6-T5 | Build POC-ITP FBM – Respond (probe version) | HUMAN | P6-T4 | todo |  |
| P7-T1 | Entity risk rule via Terraform | AUTO | P6-T5, P3-T2 | todo |  |
| P7-T2 | Probe run through the entity risk rule | VERIFY | P7-T1, P5-T2 | todo |  |
| P7-T3 | Read the probe and decide the Respond guard | HUMAN | P7-T2 | todo |  |
| P7-T4 | Complete Respond and build Respond by Email | HUMAN | P7-T3 | todo |  |
| P7-T5 | SOC custom role, resource set, and assignment | AUTO | P7-T4 | todo |  |
| P7-T6 | SOC admin sign-in and delegated-flow visibility | HUMAN | P7-T5 | todo |  |
| P8-T1 | Run T1 (entity risk rule) | VERIFY | P7-T4, P5-T4, P4-T3 | todo |  |
| P8-T2 | Run T2 (risk after the flow) | VERIFY | P8-T1 | todo |  |
| P8-T3 | Run T5 (FBM OIDC refresh tokens) | VERIFY | P8-T2 | todo |  |
| P8-T4 | Run T4, T4b, and T4c (SOC manual runs) | VERIFY | P8-T3, P7-T6, P5-T5 | todo |  |
| P8-T5 | Run T6 (latency) | VERIFY | P8-T4 | todo |  |
| P9-T1 | Snapshot session protection and exclude the connection account | AUTO | P8-T5, P5-T8 | todo |  |
| P9-T2 | Configure session protection in the Admin Console | HUMAN | P9-T1 | todo |  |
| P9-T3 | Verify session protection by API | VERIFY | P9-T2 | todo |  |
| P9-T4 | Run T3 (session protection) | VERIFY | P9-T3, P5-T6 | todo |  |
| P9-T5 | Run T7 (burst) | VERIFY | P9-T4, P5-T6 | todo |  |
| P10-T1 | Add the Upsert User Risk step | HUMAN | P8-T2 | todo | Conditional: `decision.riskReset == add`. |
| P10-T2 | Re-run latency and T2 after the risk reset | VERIFY | P10-T1 | todo | Conditional: P10-T1 done. |
| P10-T3 | Add the token sweep | HUMAN | P8-T3 | todo | Conditional: `decision.tokenSweep` is `per-client` or `user-sessions`. |
| P10-T4 | Re-run T5 after the sweep | VERIFY | P10-T3 | todo | Conditional: P10-T3 done. |
| P10-T5 | Build the fallback flow | HUMAN | P8-T5 | todo | Conditional: `decision.fallback == build`. |
| P10-T6 | Switch the entity risk rule to Logout and revoke tokens | AUTO | P10-T5 | todo | Conditional: P10-T5 done. |
| P10-T7 | Measure the fallback | VERIFY | P10-T6 | todo | Conditional: P10-T6 done. |
| P11-T1 | Export Workflows tables | HUMAN | P9-T5 (and any P10 tasks not skipped) | todo |  |
| P11-T2 | Generate the report | AUTO | P11-T1 | todo |  |
| P11-T3 | Review the report and approve teardown | HUMAN | P11-T2 | todo |  |
| P11-T4 | Run teardown | AUTO | P11-T3 | todo |  |
| P11-T5 | Verify teardown | VERIFY | P11-T4 | todo |  |
| P11-T6 | Console teardown checklist | HUMAN | P11-T5 | todo |  |
