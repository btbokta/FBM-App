# Build sheets

Click paths and card-by-card builds for HUMAN tasks. The executor shows the sheet a task names, with `<…>` placeholders filled from `.env` and Terraform outputs, then stops until you confirm.

| Sheet | Used by |
| --- | --- |
| [ac-01 Prerequisites and org values](ac-01-prerequisites-and-org-values.md) | P1-T1 |
| [ac-02 POC-Provisioner service app](ac-02-provisioner-service-app.md) | P1-T2 (contingency for P3-T6) |
| [ac-03 Vercel](ac-03-vercel.md) | P1-T4, P2-T5, P2-T6 |
| [ac-04 Test-user sign-in and T1/T5 steps](ac-04-test-user-sign-in.md) | P4-T3, P8-T1, P8-T3 |
| [ac-05 Entity risk rule check and probe](ac-05-entity-risk-rule-and-probe.md) | P7-T3 (contingency for P7-T1) |
| [ac-06 SOC admin and T4 steps](ac-06-soc-admin.md) | P7-T6, P8-T4 |
| [ac-07 Session protection and T3 steps](ac-07-session-protection.md) | P9-T2, P9-T4, teardown |
| [ac-08 Workflows exports and execution history](ac-08-workflows-exports.md) | P8-T5, P9-T5, P11-T1 |
| [ac-09 Teardown checklist](ac-09-teardown.md) | P11-T6 |
| [wf-00 Folder, tables, connections](wf-00-folder-tables-connections.md) | P6-T1 |
| [wf-01 POC-FBM Logout – Per App](wf-01-per-app.md) | P6-T2 |
| [wf-02 POC-FBM Logout – Dispatcher](wf-02-dispatcher.md) | P6-T3, P6-T4, P10-T3 |
| [wf-03 POC-ITP FBM – Respond](wf-03-respond.md) | P6-T5, P7-T4, P10-T1 |
| [wf-04 POC-ITP FBM – Respond by Email](wf-04-respond-by-email.md) | P7-T4 |
| [wf-05 POC-ITP FBM – Risk Detected (fallback)](wf-05-fallback-risk-detected.md) | P10-T5 |

## Notation in the wf-* sheets

- **C3** means card 3 of the same flow; **C7.2** is card 2 inside card 7's branch or section.
- **← C3.identifier value** means drag that output into the field.
- Typed values are in `code`. `<NAME>` is a value from `.env` or a Terraform output, filled in by the executor. Secrets never appear in a sheet; get them with `npm run secret:copy -- <name>` and paste.
- "Rename output to …" means click the output field's name on the card and type the new name, so later mappings are easy to find.
- Card names follow Okta's function and connector reference (PLAN.md F41–F50). If a label in your console differs, use the matching card, then tell the executor so the sheet can be corrected.
- After each flow, compare it with the sheet's checklist before telling the executor you're done.
