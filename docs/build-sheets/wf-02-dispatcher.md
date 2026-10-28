# wf-02 POC-FBM Logout – Dispatcher (P6-T3, P6-T4, P10-T3)

Guide name: `FBM Logout – Dispatcher` (guide Step 3). It reads the user's profile and the enabled registry rows, gets one logout-scoped token, and calls the per-app helper once per row, one row at a time.

POC differences from the guide:
- The profile comes from Okta – Custom API Action `GET /api/v1/users/{id}` so it's a real profile object (D-PROFILE).
- The token is always fetched, and its secret lives in a connection (D-TOKEN).
- Result rows are written by the per-app helper (D-RESULTS).

Sources: [Search Rows](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/tables/stash_searchrows2.htm), [For Each](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_each.htm), [Okta Custom API Action](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/actions/httprequest.htm), [Continue If](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_continueif.htm), [JSON – Parse](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/functions.htm).

## Part A: build

Create the flow in folder `POC-ITP-FBM` and name it `POC-FBM Logout – Dispatcher`.

**C1 Helper Flow** (event). Input: `User ID` (Text).

**C2 Continue If**
- value a ← C1.User ID; comparison not equal to; value b `<OKTA_WF_CONNECTION_USER_ID>`
- message `Refusing to act on the Workflows connection account`

**C3 Text – Concatenate**: `/api/v1/users/`, then ← C1.User ID. Output `user path`.

**C4 Okta – Custom API Action** (connection `POC-Okta`)
- Request Type `GET`; Relative URL ← C3.user path
- Outputs: keep Status Code and Body (Body as Object).

**C5 Object – Get**: object ← C4.Body; path `profile`. Output `user profile` (Object).

**C6 Tables – Search Rows**
- Table `POC-FBM Logout Registry`; Result Set **All matching rows**
- Filter (Where Expression): column `Enabled`, condition equals, value `true`
- Fields: all columns
- Rename the rows output to `rows`.

**C7 If Error**, used only when `GTR_AUTH_MODE=oauth`. In static mode, skip C7 and map Access token as empty text in C8.

Try section:
- **C7.1 Object – Construct**: `Content-Type` = `application/x-www-form-urlencoded`, `Accept` = `application/json`. Output `headers`.
- **C7.2 API Connector – Raw Request** (connection `POC-AS Token (Basic)`):
  - URL `<auth_server_issuer>/v1/token`
  - Method `POST`
  - Headers ← C7.1.headers
  - Body `grant_type=client_credentials&scope=poc.fbm.logout`
- **C7.3 JSON – Parse**: ← C7.2.Body. Output `token response` (Object).
- **C7.4 Object – Get**: object ← C7.3; path `access_token`. Output `access token` (Text). Map it to the If Error output `access token`.

If Error section:
- **C7.5 Date & Time – Now**.
- **C7.6 Tables – Create Row** (`POC-FBM Logout Results`): Time ← C7.5, User ID ← C1.User ID, App name `POC-AS token`, Status code `0`, Outcome `failure`.
- **C7.7 Flow Control – Assign**: `access token` = empty. Map it to the If Error output `access token`.

View Outputs on C7: `access token` (Text).

**C8 List – For Each**
- For each item in this list ← C6.rows
- Run this Flow: `POC-FBM Logout – Per App`
- With the following values:
  - Row = `item`
  - User profile ← C5.user profile
  - Access token ← C7.access token
  - Attempt = `1`
  - User ID ← C1.User ID
- Concurrency (if shown): `1`

Save, then turn the flow **ON**.

### Checklist (Part A)

- [ ] C1–C8 present; C2 has the connection-account guard with the real user ID
- [ ] C4 uses `POC-Okta`; C7.2 uses `POC-AS Token (Basic)` (oauth mode)
- [ ] C6 filter is Enabled = true, All matching rows
- [ ] C8 calls `POC-FBM Logout – Per App` with `item` as Row and Attempt `1`
- [ ] No secret typed into any card
- [ ] Flow is ON

## Testing (P6-T4)

The executor runs `npm run check -- dispatcher-prep --user 02 --scenario <S>` and gives you user02's Okta ID. For each scenario:

1. Open `POC-FBM Logout – Dispatcher` and start a test run (the run/test control in the flow editor toolbar). Enter `User ID` = the ID the executor gave you. Run.
2. Wait about 30 seconds, then tell the executor "done".
3. Open the execution in the flow's history.
4. **S1 only:**
   - Expand C6's output and paste one row object into chat. It holds only registry values (U7).
   - Report whether C7.2 returned status 200 (U11).
5. **S2 only:**
   - Open the `POC-FBM Logout – Per App` execution for `POC-FBM-SAML`.
   - In C7.4, expand the If Error error object and paste it into chat (U6).
   - Report the Status code in the Results row it wrote (expected `422`).
6. **S3 only:** report the two Results rows for `POC-FBM-OIDC` (expected `429 retry`, then `204 success`).

## Part B: token sweep (P10-T3, conditional)

Add only the variant named by `decision.tokenSweep`.

### Variant `user-sessions` (one card, no new flow)

After C8, add:
- **B1 Text – Concatenate**: `/api/v1/users/`, ← C1.User ID, `/sessions`. Output `sessions path`.
- **B2 Object – Construct**: key `oauthTokens` = `true`. Output `query`.
- **B3 Okta – Custom API Action** (`POC-Okta`): Request Type `DELETE`, Relative URL ← B1, Query ← B2.
- **B4 Lookup** on ← B3.Status Code: `204` → `success`; Otherwise → `failure`.
- **B5 Date & Time – Now**.
- **B6 Tables – Create Row** (Results): Time ← B5, User ID ← C1.User ID, App name `Okta token sweep`, Status code ← B3.Status Code, Outcome ← B4.

Source for the API call: [User sessions API](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserSessions/).

### Variant `per-client` (needs a sixth active flow)

1. Create helper `POC-FBM Token Sweep – Per Client`:
   - Helper Flow inputs `User ID` (Text) and `Client` (Object).
   - Object – Get `client_id` from Client.
   - Text – Concatenate `/api/v1/users/`, User ID, `/clients/`, client_id, `/tokens`.
   - Okta – Custom API Action `DELETE` on that path.
   - Date & Time – Now.
   - Tables – Create Row (Results): App name `Okta token sweep`, Status code, Outcome `success` if 204, else `failure`, via Lookup.
   - Turn the flow ON.
2. In the Dispatcher after C8:
   - **B1 Text – Concatenate** `/api/v1/users/`, ← C1.User ID, `/clients`.
   - **B2 Okta – Custom API Action** `GET` on B1.
   - **B3 List – For Each** over ← B2.Body: Run `POC-FBM Token Sweep – Per Client` with User ID ← C1.User ID, Client = `item`, concurrency `1`.

Source: [User OAuth API](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserOAuth/).
