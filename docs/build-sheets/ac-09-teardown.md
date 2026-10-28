# ac-09 Teardown checklist (P11-T6)

Do this after `npm run teardown -- --yes` and `npm run teardown:verify` have passed. Work in this order and report each item as done.

1. **Session protection UI.** Restore the values in `reports/evidence/sp-original-ui.md`, following ac-07 §4. Set Status last.
2. **Workflows flows.** In the Workflows console, folder `POC-ITP-FBM`, turn OFF and then delete:
   - `POC-ITP FBM – Risk Detected (fallback)` (if built)
   - `POC-ITP FBM – Respond by Email`
   - `POC-ITP FBM – Respond`
   - `POC-FBM Logout – Dispatcher`
   - `POC-FBM Token Sweep – Per Client` (if built)
   - `POC-FBM Logout – Per App`
3. **Workflows tables and folder.** Delete `POC-FBM Logout Registry`, `POC-FBM Logout Results`, and `POC-Respond Probe`, then delete folder `POC-ITP-FBM`.
4. **Workflows connections.** Delete `POC-Okta`, `POC-Okta ITP`, `POC-API None`, `POC-AS Token (Basic)` or `POC-Mock GTR Static (Custom Header)`, and `POC-Mock Vendor (Custom Header)`. wf-00 creates them in the folder, so look on the **Connections** page. If a connection is no longer listed after the folder was deleted, report it as not applicable.
5. **POC-Provisioner.** In the Admin Console, Applications > Applications > `POC-Provisioner`: **Deactivate**, then **Delete**.
6. **Vercel.** Delete the `POC-FBM-Mock` token. In the dashboard, confirm the project and the `poc-fbm-mock-kv` store are gone.
7. **Local files.** In the repo root, run `rm -rf keys state .env mock-app/.vercel .vercel`.
8. **Last look.** In System Log, filter `eventType eq "policy.entity_risk.action"` for the last 10 minutes and confirm nothing new. In Security > Entity Risk Policy, confirm no `POC-` rule remains.

Report "teardown checklist complete" with any item that didn't apply.
