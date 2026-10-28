# Build sheets

Click paths and card-by-card builds for HUMAN tasks. The executor shows the sheet a task names, with `<…>` placeholders filled from `.env` and Terraform outputs, then stops until you confirm.

| Sheet | Used by |
| --- | --- |
| [ac-01 Prerequisites and org values](ac-01-prerequisites-and-org-values.md) | P1-T1 |
| [ac-02 Okta API token](ac-02-api-token.md) | P1-T2 (contingency for P3-T6) |
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
| [wf-card-reference Workflows card reference (ledger)](wf-card-reference.md) | Every wf-* sheet |
| [wf-verification-report Verification of the wf-* sheets](wf-verification-report.md) | Review of the wf-* sheets |

What carries over from the POC to a real deployment, and how to redeploy for apps with a Global Token Revocation endpoint, is in [reusable-workflow.md](../reusable-workflow.md).

## Notation in the wf-* sheets

- **Card numbers:**
  - **C3** means card 3 of the same flow.
  - **C8.6** is card 6 inside card 8's branches or sections.
  - **C8.6.1** is card 1 inside card C8.6's sections, two levels down. Each added number goes one level deeper, so **C8.7.4.1** is inside C8.7.4.
  - Cards added in a later part are numbered **B1**, …; the per-client sweep helper's cards are **H1**, ….
- **Mappings:**
  - **← C4.output** means drag card C4's output field named `output` into the field. `>` separates groups on a card, as in **← C1.User Context > Okta User ID**.
  - Fields keep the card's default labels (`output`, `Result`, `total`, `date`); the sheets don't rename them. Fields you create, such as helper inputs or Assign and Construct inputs, get the exact names the sheet gives.
  - You create a field in the empty slot at the bottom of a card's fields. Okta labels it **Click or drag to create** for outputs, and **Click or drop to create** or **Click or drop here to create** for inputs, depending on the card.
- **Values:**
  - Typed values are in `code`.
  - `<NAME>` is a value from `.env` or a Terraform output, filled in by the executor.
  - Secrets never appear in a sheet; get them with `npm run secret:copy -- <name>` and paste.
- **Labels:** card names, field labels, and console paths come from the ledger, [wf-card-reference.md](wf-card-reference.md), checked against Okta's docs on 2026-10-27. Square brackets such as [FN-7] cite its entries, and `⚠ UNVERIFIED` marks what the docs don't settle.
  - If a label in your console differs but the card is clearly the same, use it and report the difference.
  - If a card, field, or option is missing, stop and tell the executor.
- **Reuse tags:** each wf sheet opens with a "Reusable or test only" line, and parts that aren't plainly reusable carry one of these tags. Untagged parts are reusable.
  - **Test only:** built for the POC's tests; a deployment leaves it out.
  - **Optional:** reusable, but only some deployments need it, such as the vendor path for SaaS apps.
  - **Conditional:** built only if a P10 task's trigger holds; if the POC builds it, it's reusable.
- After each flow, compare it with the sheet's checklist before telling the executor you're done.
