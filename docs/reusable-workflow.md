# Reusable workflow and redeploy checklist

The POC builds the [guide](itp-fbm-option-a-guide.md)'s design in a preview org, with `POC-` names and some parts that exist only for testing. This page says which parts carry over to a real deployment, and how to redeploy the workflow for in-house apps that expose a Global Token Revocation (GTR) endpoint. That deployment needs no third-party app and no vendor connection.

Console labels come from the [Workflows card reference](build-sheets/wf-card-reference.md), and card numbers refer to the [build sheets](build-sheets/README.md).

## What's reusable and what's test only

- **Reusable:** part of the workflow you redeploy.
- **Optional:** reusable, but only some deployments need it.
- **Conditional:** built only if a P10 task's trigger holds. If the POC builds it, it's reusable.
- **Test only:** exists to run the POC's tests. Leave it out of a deployment.

The build sheets mark each part the same way; anything untagged is reusable.

### Workflows

| Part | Built in | Status | In a deployment |
| --- | --- | --- | --- |
| Folder `POC-ITP-FBM` | wf-00 | Reusable | Any folder name |
| Table `POC-FBM Logout Registry` | wf-00 | Reusable | Same columns. The four POC rows are test data; add one row per real FBM app |
| Table `POC-FBM Logout Results` | wf-00 | Reusable | Same columns |
| Table `POC-Respond Probe` | wf-00 | Test only | It records what ITP passes to the delegated flow (U1) |
| `POC-FBM Logout – Per App`, except the vendor path | wf-01 | Reusable | |
| Per App's vendor path: C8.7 and its true branch, C8.7.1–C8.7.4 | wf-01 | Optional | Only for SaaS apps, and then with that vendor's own connector (guide Step 2). The POC's copy calls the mock. With only `gtr` apps, use wf-01's GTR-only build |
| `POC-FBM Logout – Dispatcher`, Part A | wf-02 | Reusable | |
| Dispatcher token sweep, Part B, and its helper `POC-FBM Token Sweep – Per Client` if that variant is built | wf-02 | Conditional (P10-T3) | |
| Dispatcher Testing, scenarios S1–S3 | wf-02 | Test only | |
| `POC-ITP FBM – Respond`: C1, C4, the C5 for your outcome, and C6–C12 | wf-03 | Reusable | |
| Respond's probe cards, C2 and C3 | wf-03 | Test only | Remove them; no later card uses their outputs |
| Respond's risk reset, Part C | wf-03 | Conditional (P10-T1) | |
| `POC-ITP FBM – Respond by Email` | wf-04 | Optional | Keep it if the POC recommends it (D-EMAIL), and always under probe outcome C1 |
| `POC-ITP FBM – Risk Detected (fallback)` | wf-05 | Conditional (P10-T5) | |
| Connections `POC-Okta` and `POC-Okta ITP` | wf-00 | Reusable | |
| Connection `POC-GTR Client Credentials` (auth type Client Credentials) | wf-00 | Reusable (oauth mode) | It fetches the token and signs the `gtr` calls |
| Connection `POC-Mock GTR Static (Custom Header)` | wf-00 | Conditional (static mode, D-AUTH) | Only if the POC ended in static mode |
| Connection `POC-Mock Vendor (Custom Header)` | wf-00 | Test only | It holds the mock's API key |
| **Save all data that passes through the flow** on Per App and Dispatcher | wf-01, wf-02 | Test only | Turn it off. Their executions hold users' emails, and may hold the connection's 5-minute access token (unverified) |

### Okta

| Part | Built in | Status | In a deployment |
| --- | --- | --- | --- |
| The connection account, excluded from every ITP rule | wf-00, P7-T1, P9-T1 | Reusable | A super admin that authorizes the Okta connections |
| Scopes on the Okta Workflows OAuth app | wf-00 (read only) | Reusable | The scopes wf-00's check lists |
| Custom authorization server `POC-FBM-AS`, scope `poc.fbm.logout`, service app `POC-Dispatcher-CC`, and policy `POC-Dispatcher` | P3-T4 | Reusable | Recreate them with your own names. Your apps validate the token they issue |
| Policy `POC-OIDC-SignIn` on `POC-FBM-AS` | P3-T4 | Test only | It issues tokens to the FBM OIDC test app for T5 |
| Entity risk rule `POC-ITP-High-Risk` with Run a Workflow | P7-T1 | Reusable | Recreate it for your users (guide Step 5) |
| Session protection with Run a workflow | P9-T2 | Reusable | Guide Step 5 |
| SOC role and resource set | P7-T5 | Reusable | Guide Step 6 |
| FBM apps `POC-FBM-OIDC` and `POC-FBM-SAML` | P3-T3 | Test only | Stand-ins for your FBM apps |
| Test users, group `POC-ITP-Test`, the network zone, and the app sign-in policy | P3-T2, P3-T3 | Test only | Your rule targets your own groups |
| Service apps `POC-Provisioner` and `POC-Harness`, and their roles | P1-T2, P3-T6 | Test only | |

### Outside Okta

| Part | Status |
| --- | --- |
| The mock app on Vercel (its GTR, vendor, OIDC, and `/test/*` routes) and its Upstash Redis store | Test only. Your apps implement the endpoint below instead |
| `scripts/`, `infra/`, and `mock-app/` | Test only. The Terraform guards the preview org and uses POC names |
| `reports/` | Test evidence. Keep `reports/poc-results.md`, `reports/findings.json`, and `reports/data/POC-ITP-FBM.folder` for a redeploy |

## What the POC decides

The POC's results change the reusable workflow. Read them in `reports/poc-results.md` and `reports/findings.json` before you redeploy.

| Decision or finding | What it changes |
| --- | --- |
| `probe.outcome`: A, B, or C1 | Which C5 Respond uses. Under C1, the SOC uses only Respond by Email |
| `authz.clientCredentials`: `available` (oauth mode) or `unavailable` (static mode) | Which connection Per App's C8.6.1 uses: the Client Credentials connection (oauth) or the static Custom Header connection |
| `wf.rawRequestErrorStatusPath` | The path in Per App's C8.6.2 (and C8.7.4.2) |
| `wf.searchRowsRowShape` | The paths in Per App's C3 and C5–C7 |
| D-RISK (`decision.riskReset`) | Whether Respond has Part C |
| D-SWEEP (`decision.tokenSweep`) | Whether the dispatcher has Part B, and which variant |
| D-EMAIL | Whether you keep Respond by Email |
| D-FALLBACK (`decision.fallback`) | Whether the fallback flow exists, and which action the entity risk rule takes |

## The endpoint each app implements

Each in-house app gets one registry row with Method `gtr` and exposes this endpoint. Per App sends exactly this request (wf-01 C8.1–C8.6):

```text
POST <the row's Endpoint or API>
Authorization: Bearer <access token>
Content-Type: application/json
Accept: application/json

{"sub_id":{"format":"email","email":"<the user's value of the row's Identifier attribute>"}}
```

**The token.** In oauth mode, it's a 5-minute client-credentials access token from your custom authorization server, fetched and attached by a Workflows Client Credentials connection. Validate it as the POC's mock does (PLAN P2-T2):
- the signature, against `<issuer>/v1/keys` (RS256);
- `iss` is the issuer and `aud` is the server's audience;
- `scp` contains the logout scope;
- `cid` is the dispatcher client's ID.

In static mode, the bearer is the shared value held in the static connection.

**Responses.**

| Response | When | Per App records |
| --- | --- | --- |
| 204, or another standard 2xx | The user is logged out of the app, including when they had no session | `success` |
| 404 | The app doesn't know the user | `success` |
| 400 | The body is malformed | `failure` |
| 401 or 403 | The token is missing, invalid, or lacks the scope | `failure` |
| 422 | The app couldn't log the user out | `failure` |
| 429 or 5xx | A temporary problem | `retry`. Per App tries again after 2, 4, and 6 seconds; if the fourth attempt fails too, it records `failure-retries-exhausted` |

**Make it idempotent.** The dispatcher calls every enabled app on every run, whether or not the user has a session there, and a retry repeats the call.

## Redeploy for GTR apps

There are two ways to get the flows:
- **Import** `reports/data/POC-ITP-FBM.folder`, which P11-T1 exports before teardown. An import keeps the flows, the table columns, and the links between flows. It drops every connection and all table data [SCR-14].
- **Build** them from wf-00 to wf-04, and wf-05 if the POC built it. Use wf-01's GTR-only build and skip every part marked test only.

### 1. Okta

1. Choose the connection account: a super admin that will authorize the Okta connections. Note its user ID, because every flow refuses it.
2. Check the Okta Workflows OAuth app for the scopes that wf-00 lists in "Before you start", and grant any that are missing.
3. Create a custom authorization server with a logout scope. Create a service app for the dispatcher that uses only the client credentials grant, with **DPoP turned off**, and a policy rule that lets it get only that scope (as in P3-T4). If you create it by hand, use the **classic** app wizard: on 2026-10-28 the new API Services wizard produced a client that failed with "This client cannot use a custom authorization server". Note the issuer, audience, scope, client ID, and client secret.
4. Make each in-house app implement the endpoint above.

### 2. Workflows

1. Create a folder. Import the `.folder` file into it from the folder's **Actions** menu > **Import** [SCR-14], or build the flows from the sheets.
2. On the **Connections** page, create these connections with **Folder Access** set to your folder (wf-00 §3):
   - Okta and Okta ITP, both authorized by the connection account. Steps are in [okta-connection-setup.md](okta-connection-setup.md).
   - API Connector with auth type **Client Credentials**, holding the dispatcher client's ID and secret and the custom server's token URL, for the `gtr` calls. It fetches the token and adds the `Authorization` header.
   - In static mode only, a Custom Header connection replaces it.
   - No vendor connection.
3. In an imported copy, give every card its connection back [SCR-14]:
   - Per App: C8.6.1 (the Client Credentials connection, or the static connection).
   - Dispatcher: C4 (Okta), plus Part B's Custom API Action cards (Okta) if the POC built it, including H5.1 in the sweep helper.
   - Respond: C8.1, and C13 if the POC added Part C (Okta ITP).
   - Respond by Email: C3 (Okta) and C5.1 (Okta ITP).
   - Fallback: C1 (Okta ITP) and C6 (Okta).
4. Remove the test-only parts:
   - Per App: replace the vendor C8.7 with the GTR-only build in wf-01.
   - Respond: remove C2 and C3, then delete the `POC-Respond Probe` table.
5. Replace the org-specific values typed into cards:
   - The connection-account user ID: Per App C2; Dispatcher C2 (and H2 if built); Respond C4 and C7; Respond by Email C4; fallback C4.
   - The `POC-GTR Client Credentials` connection: Access Token Path `<issuer>/v1/token`, the scope, and the dispatcher client ID and secret.
   - Fallback C10: the ID of the group your entity risk rule targets.
6. Add one registry row per FBM app with an endpoint: App name, App instance ID, Method `gtr`, Endpoint or API, Identifier attribute (normally `email`), and Enabled `true`.
7. Turn off **Save all data that passes through the flow** on Per App and Dispatcher.
8. Optional: drop the `POC-` prefix from flow and table names, as the guide names them. Then open each Call Flow, For Each, and Tables card and check that it still points at the right flow or table.
9. Turn the flows on in this order: Per App, and the sweep helper if the POC built it; then Dispatcher; then Respond; then Respond by Email and the fallback if you keep them.

### Values that change between environments

Anything below breaks, or silently points at the wrong place, if you copy the flows to another org without changing it. An imported folder keeps these values as typed.

| Value | Where it appears | What to use |
| --- | --- | --- |
| Org domain | `POC-Okta` and `POC-Okta ITP` connections (wf-00 §3), written as `<org subdomain>.oktapreview.com` | Your org's domain. A production org isn't on `oktapreview.com` |
| Okta Workflows OAuth app client ID and secret | The same two connections | The values from that org's own Okta Workflows OAuth app |
| Connection-account user ID | Per App C2; Dispatcher C2 (and H2); Respond C4 and C7; Respond by Email C4; fallback C4 | That org's connection account. A wrong ID doesn't error: the flow stops refusing the real account |
| Authorization server issuer | The Client Credentials connection's Access Token Path | The **custom** authorization server's issuer, including its server ID. Not the org server |
| Logout scope | The Client Credentials connection | The scope defined on that custom server |
| Dispatcher client ID and secret | The `POC-GTR Client Credentials` connection | The service app in that org. The secret never goes in a card |
| Authorization server audience, scope, and issuer | Each app's token validation | Every GTR app must accept the same audience and scope the dispatcher's token carries |
| Risk group ID | Fallback C10 (and the name in C11's message) | The group your entity risk rule targets |
| Registry rows | `POC-FBM Logout Registry` table | One row per real app: its endpoint, instance ID, and identifier attribute. Import drops table data |
| `GTR_AUTH_MODE` | Per App C8.6.1's connection | `oauth` or `static`, decided per environment by whether client credentials is available there |
| Flow and table names | Call Flow, For Each, and Tables cards | Renaming a flow or table means re-pointing every card that references it |

### 3. ITP and the SOC

Follow guide Steps 5 and 6. Target the entity risk rule and session protection at your own groups, and exclude the connection account from both.

### 4. Check it

1. Run Respond for a test user from **Workflows** > **Delegated flows** (guide Step 6). Under probe outcome C1, run Respond by Email instead: Respond would target whoever runs it.
2. In the Results table, expect one `Okta GTR` row with `204` `success`, and one `success` row per enabled registry app.
3. Repeat guide test T1 through the entity risk rule.
