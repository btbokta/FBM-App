# Verification report: Workflows build sheets wf-00 to wf-05

Prepared 2026-10-27 on branch `wf-sheets-verified`. The sheets were rewritten from [wf-card-reference.md](wf-card-reference.md), a ledger built from pages fetched in this session, then checked mechanically, traced by hand, and reviewed independently.

## 1. Summary

- **Ledger:** 59 entries. That's 31 cards (3 events, 4 connector actions, 24 function cards), 3 connection types, 13 console screens, 6 platform limits, and 6 API calls, plus 6 KB articles and 1 forum thread used as corroboration.
- **Sources:** about 60 pages, fetched as raw text in a browser. Okta's own help pages back every card name and field label in the sheets. Where a page leaves a point open, the sheet says `⚠ UNVERIFIED`, and section 7 lists each one with the task that settles it.
- **Reviews:** see section 5.

## 2. Errors in the old sheets

Each item is a claim the old sheets made that a fetched page contradicts, or that broke a rule in CLAUDE.md.

| # | Old sheet | What was wrong | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| E1 | wf-01 C7.4, C7.8; PLAN U6 and P6-T4 | Read the HTTP status from the If Error object at `statusCode`. The documented If Error object has `message`, `code`, `method`, `flo`, and `execution`. `statusCode` appears only on the helper-flow Error object used by card-level error handling. If Raw Request errors on non-2xx, which is the U6 default, every non-2xx status would read as empty. A 404 would become a failure, 429 and 5xx would never retry, and T7 would fail | [If Error](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/error-handling/errorhandling_trycatch.htm), [Helper flows](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-helper-flows.htm) | wf-01 C8.6.2 and C8.10.2 use path `code`. The U6 default now says `code`; U6 stays unverified and is settled by S2 |
| E2 | wf-00 §3 | Created every connection on the org-level Connections page and never added it to the folder. Org-level connections can't be used until they're added to a folder | [Configure a connection](https://help.okta.com/wf/en-us/content/topics/workflows/build/configure-connection.htm) | wf-00 creates all connections from the folder's Connections tab |
| E3 | wf-01 (whole flow) and wf-03 Part A | Neither had a connection-account Continue If. CLAUDE.md requires one in every flow | CLAUDE.md, Safety rules | wf-01 C2 and wf-03 C4 added, each before any card that acts on a user |
| E4 | wf-00 `POC-Okta` step 1 | Took the client credentials from Okta Workflows OAuth > General > Client Credentials. The docs put them on the **Sign On** tab, and the menu is now **Applications and Resources** > Applications | [Okta connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/authorization.htm) | wf-00 corrected |
| E5 | wf-01 C7.3, C7.5 | Built JSON bodies with Text – Compose and hand-typed quotes. Compose documents no escaping, so a `"` or `\` in a value breaks the body. The Raw Request page recommends Object cards plus JSON – Stringify | [Compose](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/text/text_compose.htm), [Raw Request](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_raw.htm), [Construct](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/object/object_construct.htm) | wf-01 C8.3–C8.5 and C8.7–C8.8 use Construct and Stringify |
| E6 | wf-01 C8 | The Lookup listed only 200–202, 204, 404, 429, 500, and 502–504. That treated 203, 205–208, 226, 501, and 505–511 as failures, against guide Step 2.5 (any 2xx is success, any 5xx is retried) | Guide Step 2.5; [HTTP status codes](https://help.okta.com/wf/en-us/content/topics/workflows/execute/http-status-codes.htm) | wf-01 C9 lists every standard 2xx and 5xx code on Okta's page |
| E7 | wf-01 C14 false branch | Mapped outputs of cards before the If/Else straight into its false-branch outputs. The doc only describes filling them from the branch's own steps | [If/Else](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_if.htm) | Added C15.5 Assign in the false branch |
| E8 | wf-03, wf-04 | Never turned on **Save all data that passes through the flow**. Without it, execution history shows no card outputs, but ac-04 §2 and ac-06 §2 ask you to read the Global Token Revocation Status Code from execution history | [Save flow data](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-save.htm), [View flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-view.htm) | Every sheet turns it on in the first Save dialog |
| E9 | wf-03 Part A report | Assumed a number after `/flows/` in the flow URL. Okta's KB, updated 2026-09-29, shows `…/app/flows/01K48DVKSQHWABCDSW820WSHTT`, a 26-character ID that isn't a number | [KB-2](https://support.okta.com/help/s/article/How-to-setup-an-error-notification-flow-in-Okta-Workflows) | The sheet asks for the full URL and says whether the ID is all digits. Plan change PC1 |
| E10 | wf-05 C2, C3 | Used fields "Risk Level" and "Previous Level". On the card they sit in a **Risk** group, as **Level** and **Previous Level** | [User Risk Detected](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/events/userriskdetected.htm) | wf-05 corrected; F41 corrected |
| E11 | wf-05 C7; wf-02 Part B per-client | Fed Custom API Action's Body, which is typed Object, straight into List – Pluck and For Each, which expect a list | [Custom API Action](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/actions/httprequest.htm), [Pluck](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_pluck.htm) | Added JSON – Stringify, then JSON – Parse to List of Objects |
| E12 | wf-01 to wf-05 | Used output names that cards don't have, such as `now`, `rows`, `identifier key`, and `access token` on an Object – Get. Renaming those outputs needs gear > Edit card, which the sheets never described | [Fields](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-fields.htm), [Cards in flows](https://help.okta.com/wf/en-us/Content/Topics/Workflows/learn/about-cards.htm) | Sheets use default labels (`output`, `date`, `Rows`, `Result`, `total`) and name only fields you create |
| E13 | wf-01 | Didn't say that a card's own error handling must stay at its defaults. A Retry on Raw Request would swallow 429s and wait 5 minutes by default | [Set error handling](https://help.okta.com/wf/en-us/content/topics/workflows/build/set-error-handling.htm) | Every sheet says to leave it at defaults |
| E14 | wf-01 C7.4 vs C7.7 | Didn't say that a new API Connector card preselects the connection last used for that app, so the vendor card would pick up `POC-API None` | [Connections](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-applications-connections.htm) | Each Raw Request card says which connection to pick, and how |
| E15 | PLAN P10-T1 | Referred to Part C as cards "C1–C4"; Part C was C12–C14 | wf-03 | Now C13–C15, matching the new numbering |
| E16 | PLAN F43 | Implied every delegated-flow run logs `workflows.user.delegatedflow.run`. Okta documents it only for flows run after a session violation | [ITP System Log events](https://help.okta.com/oie/en-us/content/topics/itp/system-log-events.htm) | F43 corrected. The harness only collects this event as evidence, so no task changes |

The old sheets got these right, and the docs confirm it:
- The card names Raw Request, If Error, If/ElseIf, For Each, Continue If, and Lookup. There's no "HTTP Request", "Try/Catch", "Switch", or "Loop" card.
- Raw Request has no timeout field.
- For Each has no outputs.
- Call Flow outputs must be created by hand.
- The Wait For unit `second`.
- The Delegated Flow fields.
- The Global Token Revocation input format, opaque.

## 3. Mechanical self-check (final files)

| Check | Result |
| --- | --- |
| Every card name matches a ledger entry exactly | Pass. A script compared every card heading in wf-01 to wf-05 with the ledger's EVT, ACT, and FN names |
| Every `←` points to an earlier card's output that's in scope, and that output exists in the ledger or is created in the sheet | Pass. Each mapping was checked by hand. Outputs from inside a branch or section leave only through If/ElseIf or If Error View Outputs, or If/Else Create Outputs (wf-01 C8, C8.6, C8.10, C15; wf-02 C7, B3; wf-03 C8; wf-04 C5; H5) |
| Source and target types are compatible | Pass. The only conversion is Number to text into Lookup's String **Value** (wf-01 C9, wf-03 C10, wf-04 C7, wf-02 B4 and H6), which the Fields page documents. Object to list goes through Stringify and Parse |
| Helper Flow inputs match every Call Flow and For Each that calls the helper | Pass. Per App takes Row (Object), User profile (Object), Access token (Text), Attempt (Number), User ID (Text), from wf-01 C15.4 and wf-02 C8. Dispatcher takes User ID (Text), from wf-03 C12, wf-04 C9, and wf-05 C14. Token Sweep takes User ID and Client, from wf-02 B5 |
| Return fields match the calling Call Flow's outputs | Pass. wf-01 C16 returns `Status code` (Number), `Outcome` (Text), `Attempts` (Number), which equal C15.4's outputs. The Dispatcher has no Return and its callers define no outputs |
| Table and column names match wf-00 and PLAN P5-T3, character for character | Pass, by script |
| Connection names match wf-00 | Pass, by script. All six names are used consistently |
| No secrets | Pass. A script searched for long token-like strings; only `npm run secret:copy` references and `<…>` placeholders appear |
| Every flow and variant has the connection-account Continue If before any card that acts on a user | Pass. wf-01 C2, wf-02 C2 and H2, wf-03 C4 (probe) and C7 (Part B, all outcomes, before C8), wf-04 C4, wf-05 C4. Every guard is top level; a Continue If inside a container wouldn't halt the flow [LIM-5] |

## 4. Traces

Sample data:
- Org `https://acme-poc.oktapreview.com`.
- Connection account `00uWFCONN`.
- user02 `00uUSER02`, email `poc-itp-user02@example.com`.
- Mock base URL `https://poc-fbm-mock-a1b2c3.vercel.app` (shown as `M` below).
- `auth_server_issuer` `https://acme-poc.oktapreview.com/oauth2/aus1poc`.
- Access token shown as `eyJ…`.
- Registry rows, from P5-T3's CSV, as Search Rows returns them [FN-22]:
  - **R1**: `{"Row ID":"r1","Created":…,"Updated":…,"App name":"POC-FBM-OIDC","App instance ID":"0oaOIDC","Method":"gtr","Endpoint or API":"M/apps/oidc/global-token-revocation","Identifier attribute":"email","Enabled":true}`
  - **R2**: R1 with `POC-FBM-SAML`, `0oaSAML`, and `M/apps/saml/global-token-revocation`.
  - **R3**: `POC-Mock-Vendor`, `n/a`, `vendor`, `M/vendor/v1/sessions/revoke`, `email`, true.
  - **R4**: `POC-Disabled-Canary`, `n/a`, `gtr`, `M/apps/disabled/global-token-revocation`, `email`, **false**.

"Row" means a `POC-FBM Logout Results` row (Time, User ID, App name, Status code, Outcome). Mode is oauth unless stated.

### 4.1 Per App (wf-01)

**PA-1: 204 success (R1, Attempt 1).**
1. C1: Row = R1, User profile = `{"login":"poc-itp-user02@example.com","email":"poc-itp-user02@example.com",…}`, Access token = `eyJ…`, Attempt = 1, User ID = `00uUSER02`.
2. C2: `00uUSER02` ≠ `00uWFCONN`, so the flow continues.
3. C3–C7: C3 `email`; C4 `poc-itp-user02@example.com`; C5 `gtr`; C6 `M/apps/oidc/global-token-revocation`; C7 `POC-FBM-OIDC`.
4. C8: condition 1 is true.
   - C8.1 `Bearer eyJ…`.
   - C8.2 `{"Authorization":"Bearer eyJ…","Content-Type":"application/json","Accept":"application/json"}`.
   - C8.3 `{"format":"email","email":"poc-itp-user02@example.com"}`.
   - C8.4 `{"sub_id":{…}}`.
   - C8.5 `{"sub_id":{"format":"email","email":"poc-itp-user02@example.com"}}`.
   - C8.6.1 POST returns 204 without error, so C8.6 status = 204 and C8 status code = 204.
5. C9 `"204"` gives `success`. C10: 1 ≥ 4 is false, so `more`. C11 `success-more`. C12 `success`. C13 date `2026-11-02T10:00:01.200Z`.
6. C14 writes **Row (10:00:01.200Z, 00uUSER02, POC-FBM-OIDC, 204, success)**.
7. C15: `success` isn't `retry`, so the false branch runs. C15.5 = (204, success, 1).
8. C16 **returns Status code 204, Outcome success, Attempts 1**.

**PA-2: 404, user unknown to the app (R1).**
- If Raw Request errors on 404 (U6), the If Error section runs: Error `code` 404, so C8.6.2 = 404.
- If it doesn't error, the Try section gives Status Code 404.
- Either way C8 status code = 404, C9 gives `success`, and C12 gives `success`.
- **Row (…, POC-FBM-OIDC, 404, success).** No retry. **Returns 404, success, 1.**

**PA-3: 422, app couldn't log the user out (R2, scenario S2).**
- Status 422 matches no row, so C9 gives `failure`, C11 `failure-more`, and C12 `failure`.
- **Row (…, POC-FBM-SAML, 422, failure).** No retry. **Returns 422, failure, 1.**

**PA-4: 429, then success on retry (R1, scenario S3).**
1. Attempt 1: 429 gives `retry`, C11 `retry-more`, and C12 `retry`. **Row (…, POC-FBM-OIDC, 429, retry).**
2. C15 is true:
   - C15.1 gives 2, and C15.2 waits 2 seconds.
   - C15.3 gives 2. C15.4 calls Per App with Attempt 2.
3. In that call, the request returns 204, and C12 gives `success`. **Row (…, POC-FBM-OIDC, 204, success).** It returns (204, success, 2).
4. C15's outputs are (204, success, 2). **C16 returns 204, success, 2.**

**PA-5: 500 on every attempt, retries run out at attempt 4 (R2).**
1. Attempts 1, 2, and 3 each get 500, which gives `retry` and `more`. Each writes **Row (500, retry)**, then waits 2, 4, and 6 seconds and recurses.
2. Attempt 4 gets 500, which gives `retry`. C10: 4 ≥ 4, so `last`. C11 gives `retry-last`, and C12 gives `failure-retries-exhausted`.
3. Attempt 4 writes **Row (500, failure-retries-exhausted)**. C15 is false, so it returns (500, failure-retries-exhausted, 4).
4. Each level up returns the same values. **The top call returns 500, failure-retries-exhausted, 4.**
- Four rows in all, 12 seconds of waiting, and a recursion depth of 4, far under the limit of 250 [LIM-2].
- ⚠ No PLAN task exercises this path: the mock's fault modes are `none`, `422`, `429-first`, and `500-once`. See PC3.

**PA-6: request fails with no HTTP status (timeout or DNS failure, R1).**
1. C8.6.1 fails, for example with "Method timeout exceeded" [LIM-6], and the If Error section runs.
2. ⚠ UNVERIFIED: what the Error object's `code` holds when there's no HTTP status. The expected design behavior assumes `code` is absent:
   - C8.6.2 = null, so C8 status code = null.
   - C9 gets an empty Value, which matches no row, so `failure`; C12 gives `failure`.
   - **Row (…, POC-FBM-OIDC, empty, failure).** No retry. **Returns empty, failure, 1.**
3. If `code` instead holds text such as `ETIMEDOUT`, C8.6.2's Number output may fail at runtime [FN-11]. Then this execution errors, and For Each stops before the remaining rows [FN-19].
4. No PLAN task tests this. See PC3 and PC5.

**PA-7: disabled registry row (R4).** The C6 filter on the dispatcher drops R4, so Per App never runs for it: no call and no row. S1's `dispatcher-verify` checks that `disabled` got no call; that catches a wrong filter (U7).

**PA-8: `vendor` method (R3).**
1. C5 gives `vendor`, so branch 2 runs.
   - C8.7 `{"email":"poc-itp-user02@example.com"}`; C8.8 is the same object as a JSON string.
   - C8.9 builds the headers.
   - C8.10.1 POSTs through `POC-Mock Vendor (Custom Header)`, which adds `X-API-Key`, and gets 204. So C8 status code = 204.
2. **Row (…, POC-Mock-Vendor, 204, success). Returns 204, success, 1.**

**PA-9: unknown method (a row with Method `saml-api`).**
- C8 runs Else: C8.11 gives 0, so C8 status code = 0. C9 `"0"` matches no row, so `failure`; C12 gives `failure`.
- **Row (…, 0, failure). Returns 0, failure, 1.** No HTTP request is sent.

**PA-10: profile lacks the identifier attribute (Identifier attribute `employeeNumber`, profile has none).**
1. ⚠ UNVERIFIED: Object – Get on a missing key. Assumed to return null rather than an error [FN-11]. So C4 = null.
2. C8.5 gives `{"sub_id":{"format":"email","email":null}}`, or no `email` key if Construct drops nulls. The mock answers 400, because the email must contain `@`.
3. C9 gives `failure`. **Row (…, 400, failure). Returns 400, failure, 1.**
4. A `vendor` row gives `{"email":null}`, which the mock also answers with 400, so also a failure.
5. If Object – Get errors instead, this Per App execution fails and For Each stops.
6. Every POC registry row uses `email`, and every POC user has an email, so no task hits this.

**PA-11: the Workflows connection account.** C2: `00uWFCONN` equals value b, so the flow stops with "Refusing to act on the Workflows connection account". No request, no row, no Return. In practice the dispatcher's C2 stops it first (D-5).

### 4.2 Dispatcher (wf-02)

**D-1: scenario S1, everything succeeds (user02).**
1. C2 passes. C3 gives `/api/v1/users/00uUSER02`. C4 GET returns 200 with the user object; C5 takes its profile.
2. C6 Rows = [R1, R2, R3]; R4 is filtered out.
3. C7.2 POSTs to `…/aus1poc/v1/token` with Basic auth and gets 200, body `{"token_type":"Bearer","expires_in":300,"access_token":"eyJ…","scope":"poc.fbm.logout"}`. C7.3 and C7.4 extract `eyJ…`, so C7 access token = `eyJ…`.
4. C8 runs Per App three times, in order:
   - R1 as PA-1: **Row (POC-FBM-OIDC, 204, success)**.
   - R2 as PA-1: **Row (POC-FBM-SAML, 204, success)**.
   - R3 as PA-8: **Row (POC-Mock-Vendor, 204, success)**.
5. Expected by `dispatcher-verify S1`: one 204 per enabled app and no call to `disabled`. This matches.

**D-2: scenario S2, SAML returns 422.**
- Same as D-1, except R2 follows PA-3.
- **Rows: (POC-FBM-OIDC, 204, success), (POC-FBM-SAML, 422, failure), (POC-Mock-Vendor, 204, success).**
- This matches the S2 expectation: saml one 422, oidc and vendor 204.

**D-3: scenario S3, OIDC returns 429 first.**
- R1 follows PA-4, so **Rows (OIDC, 429, retry) and (OIDC, 204, success)**. R2 and R3 return 204.
- That's 4 rows and 4 Per App executions. This matches S3: oidc 429 then 204, others 204.

**D-4: the token request fails (not a PLAN scenario).**
1. The If Error section runs: **Row (POC-AS token, 0, failure)**, and C7 access token = empty.
2. The `gtr` rows send `Bearer ` with nothing after it. The mock answers 401: **Rows (OIDC, 401, failure) and (SAML, 401, failure)**.
3. The vendor row still gets 204, a success.

**D-5: the connection account.** C1 is `00uWFCONN`, so C2 stops the flow: no Search Rows, no token, no calls, no rows.

**D-6: static mode.** C7 is skipped and Access token is empty. C8.1 is skipped, and C8.2 has no Authorization key. C8.6.1 uses `POC-Mock GTR Static (Custom Header)`, which adds `Authorization: Bearer <static>`, and gets 204. The rows are the same as D-1.

**Disabled row, vendor method, unknown method, missing identifier:** see PA-7, PA-8, PA-9, and PA-10. They run inside D-1's loop.

### 4.3 Respond (wf-03)

Part A cards C1–C4 run on every run. **Probe** is the `POC-Respond Probe` row that C3 writes.

**R-A: outcome A, ITP run for user02.**
1. C1: Inputs > User ID = `00uUSER02`. C3 writes the **Probe** row with Input User ID `00uUSER02` plus whatever ITP puts in Okta User ID and Caller.
2. C4 passes. C5 Assign gives target = `00uUSER02`. C6 sees it isn't empty; C7 sees it's not the connection account.
3. C8.1 Global Token Revocation returns 204, so gtr status = 204. C10 gives `success`. **Row (00uUSER02, Okta GTR, 204, success).**
4. C12 calls the dispatcher with `00uUSER02`, which runs as D-1: three more rows.
5. Totals: **1 Probe row and 4 Results rows**.

**R-B: outcome B, ITP run.**
1. C1: Inputs > User ID empty, Okta User ID `00uUSER02`, Caller > ID non-empty, for example `pol1`.
2. C3 writes the Probe row. C4 compares an empty value with `00uWFCONN`; they're not equal, so it passes.
3. C5 Assign If: Caller ID isn't empty, so the target is value if false, the Okta User ID: `00uUSER02`.
4. C6–C12 run as in R-A. The Results rows are the same as R-A.
5. A manual run with an ID under B: Caller ID is empty, so the target is Inputs > User ID, and it continues as R-A.

**R-C1: outcome C1, ITP run.**
- C5 Assign gives target = User Context > Okta User ID = `00uUSER02`. It continues as R-A, with the same rows.
- Respond leaves the SOC resource set (`POC_SOC_INCLUDE_RESPOND=false`), so T4 and T4c are skipped.

**R-T4c: blank User ID, a manual run.**
1. Outcome A:
   - C3 writes a Probe row with an empty Input User ID. C4: empty ≠ `00uWFCONN`, so it passes.
   - C5 target is empty, so C6 (`is not empty`) is false and the flow **stops** with "No target user ID…".
   - No Global Token Revocation, no Results rows, no dispatcher. That's T4c's expected result.
2. Outcome B: Caller ID is empty on a manual run, so the target is the empty Inputs > User ID, and C6 stops it.
3. ⚠ Whether a blank delegated-flow input arrives as `""` or null; both count as empty for Text [FN-7]. T4c in P8-T4 checks it.

**R-conn: the connection account.**
- Outcome A or B, a manual run with User ID = `00uWFCONN`: C4 stops the flow after the Probe row.
- Outcome C1, the connection account running Respond by hand: the target is its own Okta User ID, so **C7 stops it**.
- ITP never targets it, because it's excluded from the entity risk rule and from session protection.

**R-probe: Part A only (P6-T5 to P7-T3), for outcomes A, B, and C1 alike.**
- Every run writes exactly one Probe row, then C4 passes unless the typed ID is the connection account.
- Nothing else runs, and no user is changed.
- ac-05's three runs give: ITP row (user02 in Input User ID or Okta User ID), a Manual-empty row, and a Manual-with-ID row. P7-T3 classifies them with the outcome table.

### 4.4 Respond by Email (wf-04)

**E-main: a T4b run with user04's email.**
1. C2 passes. C3 Read User returns ID `00uUSER04` (U27). C4 passes.
2. C5.1 returns 204, so gtr status = 204, and C7 gives `success`.
3. **Row (00uUSER04, Okta GTR, 204, success).** C9 calls the dispatcher, which writes three rows as D-1.

**E-guard.**
- The connection account's email: C3 returns `00uWFCONN`, so **C4 stops the flow**. No Global Token Revocation, no rows.
- A blank email: C2 stops the flow.
- An email that matches no user: C3 fails, and the flow halts before C5.

### 4.5 Fallback (wf-05)

**F-main: an escalation for user09.**
1. The event has Risk > Level `HIGH`, Risk > Previous Level `LOW`, and Okta User > ID `00uUSER09`. C2, C3, and C4 pass.
2. C6 GET `/api/v1/users/00uUSER09/groups` returns Body `[{"id":"00gEVERYONE",…},{"id":"00gPOCTEST",…}]`.
3. C7 and C8 turn it into a List of Objects. C9 gives `["00gEVERYONE","00gPOCTEST"]`. C10 is true for `<poc_group_id>` = `00gPOCTEST`, so C11 passes.
4. **Row (00uUSER09, Fallback trigger, 0, started).** C14 calls the dispatcher, which writes three rows.

**F-guard.**
- Okta User > ID `00uWFCONN`: **C4 stops the flow** before any group lookup or dispatcher call.
- These also stop the flow, with their own messages: Previous Level `HIGH` stops at C3, Level `MEDIUM` at C2, and a user outside the group at C11.

## 5. Independent review rounds

To be completed in the next revision of this report.

## 6. Final pass

To be completed in the next revision of this report.

## 7. Remaining `⚠ UNVERIFIED` items

| # | Item | Where | Settled by |
| --- | --- | --- | --- |
| V1 | Whether a non-2xx response makes Raw Request error, and whether the If Error `code` holds the HTTP status | wf-01 C8.6, C8.10 | U6, P6-T4 S2 |
| V2 | Search Rows row shape in this org, Object – Get paths containing spaces, and the filter operator for a Boolean column | wf-01 C3, C5–C7; wf-02 C6 | U7, P6-T4 S1 (the disabled row must get no call; a pasted row object) |
| V3 | That the Basic connection's header works with the Okta token endpoint. The docs show `Authorization: Basic base64(username:password)`, which is `client_secret_basic` | wf-02 C7.2 | U11, P6-T4 S1 |
| V4 | Which Delegated Flow field ITP fills | wf-03 | U1, P7-T3 |
| V5 | The flow ID in the Workflows URL, and whether it's the number the entity risk rule needs. KB-2 suggests it isn't a number | wf-03 Part A, wf-04 | U5 (P6-T5), U3 (P7-T1), U4 (P7-T6); see PC1 |
| V6 | Whether the Okta ITP connection's default scopes let Global Token Revocation return 204 | wf-00, wf-03 C8.1 | U9, P8-T1 |
| V7 | Read User finding a user by email | wf-04 C3 | U27, P8-T4 T4b |
| V8 | Whether Delegated Flow's Caller sub-fields can be dragged one by one | wf-03 C3 | P6-T5 (the builder stops if not) |
| V9 | How Global Token Revocation presents the opaque/iss_sub choice, and whether it errors on non-2xx | wf-03 C8, wf-04 C5 | P6-T5 and P7-T4 builds, P8-T1 (status recorded) |
| V10 | Whether a helper must be ON to be called, and whether a flow must be saved before it can select itself | wf-01, wf-02 | No task needed: the sheets turn helpers on first and save before C15.4 |
| V11 | The label `Custom Header` vs `Custom`, and whether an API Connector icon appears in the folder's New Connection selector | wf-00 | P6-T1 (builder reports; the sheet gives a fallback) |
| V12 | The Error object's `code` when a request fails with no HTTP status | wf-01 C8.6.2, C8.10.2 | **No task.** See PC3 |
| V13 | Object – Get on a missing path | wf-01 C4 | **No task.** POC users all have email; listed for production |
| V14 | Whether a blank delegated-flow input counts as empty | wf-03 C6, wf-04 C2 | P8-T4 T4c |
| V15 | Scopes for the Okta ITP User Risk Detected event | wf-05 C1 | P10-T5 (the builder stops on a warning) |
| V16 | Custom API Action behavior on non-2xx | wf-02 C4, B3.1, H5.1; wf-05 C6 | Failure paths only. The sweep calls are wrapped in If Error; C4 and wf-05 C6 failing halts a run with nothing done |
| V17 | Whether the Results Date column's export format parses with `Date.parse` (Now gives ISO UTC with `Z`) | wf-01 C14 and others | U20, P11-T2 |
| V18 | Recursive Per App calls with Wait For under a 25-user burst | wf-01 C15 | U21, P9-T5 |
| V19 | Which System Log event Global Token Revocation writes | wf-03 C8.1 | U23, P8-T1 |

## 8. Proposed plan changes

None of these is applied. Each is the smallest change that fixes the problem.

- **PC1: flow IDs (U5, U3, U4, P6-T5, P7-T1, P7-T5).**
  - The problem: Okta's KB shows Workflows flow URLs as `…/app/flows/<26-character ID>` [KB-2], but the entity risk rule's `workflow.id` is an integer (F4). P6-T5's check that `WF_RESPOND_FLOW_ID` is a positive integer would then fail, and Terraform couldn't set the rule's workflow.
  - The change: P6-T5 records the URL ID as is in `wf.flowIdSource`. If it isn't all digits, P7-T1 takes the ac-05 contingency directly: create the rule in the UI by picking the flow, read `actions.entityRisk.actions[0].workflow.id` by API, set `WF_RESPOND_FLOW_ID` from that, then `terraform import`.
  - P7-T5's ORNs would need the same check. The SOC resource set may have to be built in the UI and imported (U4).
- **PC2: P6-T1 acceptance.**
  - The problem: "All showing as connected" can't be observed for API Connector connections, which Workflows doesn't test until they're used [CON-3].
  - The change: "`POC-Okta` and `POC-Okta ITP` show healthy; the three API Connector connections are listed in the folder." P6-T4 then tests them.
- **PC3: untested failure paths.**
  - The problem: neither "500 until retries run out" (PA-5) nor "no HTTP status" (PA-6) has a test, and the mock has no fault mode for either.
  - The change, with no code: add to P6-T4 two manual runs of `POC-FBM Logout – Per App` from its **Run** button [SCR-8], both with User profile `{"email":"<user02 email>"}`, User ID `<user02 id>`, and Attempt `4`, so neither run waits.
    - **S4:** Row R2 with `Endpoint or API` = `https://poc-unresolvable.invalid/x`. Expected: one row with Status code empty and Outcome `failure`, and the execution doesn't error. This settles V12.
    - **S5:** set fault `500-once` on `saml`, then run Row R2. Expected: one row (500, `failure-retries-exhausted`).
- **PC4: the access token in execution history (D-TOKEN).**
  - The problem: the Raw Request page warns against passing access tokens through cards in plain text, because execution history can expose them [FN-24, SCR-6]. The sheets turn on Save all data for P6-T4, which stores the dispatcher's 5-minute token in Per App and Dispatcher history.
  - The change for the POC: turn **Save all data** off on Per App and Dispatcher after P6-T4 passes.
  - For production, the API Connector **Client Credentials** connection type would remove the token from flow data [CON-3]. It sends the client secret in the request body, so it needs `client_secret_post` on the client and a default scope.
- **PC5: For Each stops on a helper error.**
  - The problem: For Each stops processing more items when one helper execution errors [FN-19]. A runtime error in one app's Per App, as in PA-6 or PA-10, would skip the remaining apps. The design intends every enabled app to be called.
  - The change: use **List – For Each - Ignore Errors** in Dispatcher C8. It has the same inputs and keeps processing the other items.

## 9. Active-flow count

**4 flows are on for the POC** (Per App, Dispatcher, Respond, Respond by Email), **5 with the fallback**. The per-client sweep helper would be a 6th, which P10-T3 already blocks on Starter.

How this was checked:
- Workflows system limits gives **Starter: 5 active flows** and says flows that are turned off aren't counted.
- Flow limits says Starter has five active flows. Only legacy entitlements are limited to active *parent* flows, so current plans don't exempt helper flows.
- The ITP page says active delegated flows count toward the limit.
- Okta's helper-flow tutorial and KB-2 turn helper flows on, and the folder page says to turn off helper flows before deleting a folder, so helper flows have an on state.
- The sheets turn every flow on, so each one counts.

Sources: [Workflows system limits](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-system-limits.htm), [Flow limits](https://help.okta.com/wf/en-us/content/topics/workflows/flow-limits.htm), [Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm).

## 10. U-IDs that the docs now support (status unchanged)

The executor still settles these by test.
- **U6:** the If Error object field is `code`, not `statusCode`. The PLAN default was updated to `code`.
- **U7:** KB-1's screenshots show flat row objects keyed by column name, with `Row ID`, `Created`, and `Updated`.
- **U11:** the Basic connection's header format is documented.
- **U21:** the recursion limit is 250, and Wait For takes 1 second or more.

## 11. PLAN facts corrected

- **F41:** the field paths User > ID, Response > Status Code, Risk > Level, and Risk > Previous Level.
- **F43:** what the System Log event `workflows.user.delegatedflow.run` is documented for.
- **F45:** the card list now matches the sheets. Text – Compose is out; JSON – Stringify, Tables, and Raw Request are in. Wait For is 1 second to 30 days, and For Each stops on a helper error.
- **F46:** the If Error object's fields.
- **F47:** the recursion limit.

F39, F40, F42, F44, F48, F49, F50, F51, and F52 were re-checked and are correct.
