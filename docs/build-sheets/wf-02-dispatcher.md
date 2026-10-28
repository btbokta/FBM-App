# wf-02 POC-FBM Logout – Dispatcher (P6-T3, P6-T4, P10-T3)

This flow is the guide's `FBM Logout – Dispatcher` (guide Step 3). It reads the user's profile and the enabled registry rows, gets one logout-scoped token, and calls `POC-FBM Logout – Per App` once per row, one row at a time. Every card name and label is in the ledger, [wf-card-reference.md](wf-card-reference.md).

The POC differs from the guide in three ways:
- The profile comes from Okta – Custom API Action `GET /api/v1/users/{id}`, so it's a real profile object (D-PROFILE). Read User returns separate fields instead [ACT-3].
- The token is always fetched, and its client secret lives in a connection (D-TOKEN).
- The per-app helper writes the Results rows (D-RESULTS). For Each has no outputs [FN-19].

Connection mode for this run: `GTR_AUTH_MODE=<GTR_AUTH_MODE>`. It changes C7 and C8 only.

## Part A: build (P6-T3)

### Flow settings

| Setting | Value |
| --- | --- |
| Folder | `POC-ITP-FBM` |
| Flow name | `POC-FBM Logout – Dispatcher` (en dash) |
| Kind | Helper flow: its event card is Helper Flow [EVT-1] |
| Save all data that passes through the flow | On. P6-T4 reads C6 and C7.2 from the executions [SCR-6] |
| Turn on | After the checklist. `POC-FBM Logout – Per App` must already be ON |

### Build

1. Open folder `POC-ITP-FBM` and click **+ New Flow** [SCR-5]. Don't rename it with the pencil icon; the first Save names it.
2. Build C1. Click **Save** [SCR-5, SCR-6]. In the **Save flow** dialog:
   - Type the name `POC-FBM Logout – Dispatcher`.
   - Turn on **Save all data that passes through the flow** (**Save All Data**).
   - Click **Save**.

   Then check that the **Flow Activation** button reads **Saving data**. If it reads Not saving data, open it and turn the option on.
3. Build C2–C8 below.
4. Save, work through the checklist, then switch **Flow is OFF** to ON [SCR-7]. Wait one minute before the first test run.

Leave every card's gear > **Error handling** at its defaults [SCR-10].

### C1 Helper Flow (event) [EVT-1]

Click **Add Event** > **Helper Flow**. Under **Inputs to this Flow**, create one field: `User ID`, type Text.

### C2 Branching – Continue If [FN-7]: connection-account guard

- **value a** ← C1.User ID
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Refusing to act on the Workflows connection account`

### C3 Text – Concatenate [FN-13]

- **text 1**: `/api/v1/users/`
- **text 2** ← C1.User ID

### C4 Okta – Custom API Action [ACT-4]

- **Connection**: `POC-Okta`
- **Request Type**: `GET`
- **Relative URL** ← C3.output
- Leave **Headers** and **Query** empty.
- Outputs: **Status Code** (Number) and **Body** (Object). The body is the user object [API-1].

### C5 Object – Get [FN-11]

- **object** ← C4.Body
- **path**: `profile`
- **output**: set the type to Object. This is the user's profile, for example `{"login":"…","email":"…",…}`.

### C6 Tables – Search Rows [FN-22]

1. **Options**:
   - **Choose Table**: `POC-FBM Logout Registry`, then **Choose**.
   - **Result Set**: `All matching rows`.
   - Check all six columns, then **Save** on the card.
2. **Filter** > **Where Expression**: click **Filter…**. In the dialog, choose the column `Enabled`, the equality operator, and the value `true`. Save the filter.
3. Leave **Sort**, **Limit**, and **Offset** empty.
4. The output you use is **Rows**, the list under **Result**. Each item is one registry row: the six column values plus `Row ID`, `Created`, and `Updated` [FN-22].

> ⚠ UNVERIFIED (U7): the filter dialog's operator label for a Boolean column, and the row object's shape. Scenario S1 catches both: the disabled canary row must get no call, and you paste one row object.

### C7 Error Handling – If Error [FN-10]: get the logout token

**Oauth mode only.** In static mode, skip C7 entirely and leave C8's Access token empty.

- **Try** section:
  - **C7.1 Object – Construct** [FN-12]

    | Input name | Type | Value |
    | --- | --- | --- |
    | `Content-Type` | Text | `application/x-www-form-urlencoded` |
    | `Accept` | Text | `application/json` |

  - **C7.2 API Connector – Raw Request** [FN-24]
    - **Connection**: `POC-AS Token (Basic)`. Click the connection name to pick it [SCR-4]. It sends the dispatcher client's ID and secret as `Authorization: Basic …` [CON-3].
    - **URL**: `<auth_server_issuer>/v1/token`
    - **Method**: `POST`
    - **Headers** ← C7.1.output
    - **Query**: leave empty
    - **Body**: `grant_type=client_credentials&scope=poc.fbm.logout`
  - **C7.3 JSON – Parse** [FN-17]
    - **string** ← C7.2.Body
    - **output**: set the type to Object.
  - **C7.4 Object – Get**
    - **object** ← C7.3.output
    - **path**: `access_token`
    - **output**: Text.
- **If Error** section (use the dropdown at the top of C7):
  - **C7.5 Date & Time – Now** [FN-16]
  - **C7.6 Tables – Create Row** [FN-23]: **Choose Table** `POC-FBM Logout Results`, check all five columns, **Save**.
    - **Time** ← C7.5.date
    - **User ID** ← C1.User ID
    - **App name**: `POC-AS token`
    - **Status code**: `0`
    - **Outcome**: `failure`
  - **C7.7 Flow Control – Assign** [FN-3]: create one input, `access token`, type Text, and leave its value empty.
- **View Outputs** on C7: add `access token`, type Text.
  - Try field ← C7.4.output
  - If Error field ← C7.7.access token

If the token request fails, the dispatcher still calls every app. The `gtr` apps then answer 401 (failure rows), and the vendor app, which uses its own connection, is still logged out.

### C8 List – For Each [FN-19]

- **For each item in this list** > **list** ← C6.Rows
- **Run this Flow** > **Helper Flow**: **Choose Flow** > `POC-FBM Logout – Per App`
- **With the following values**. The helper's inputs appear after you choose the flow:

| Field | Value |
| --- | --- |
| `Row` | click the field and choose **item** from the dropdown |
| `User profile` | ← C5.output |
| `Access token` | ← C7.access token (oauth mode); leave empty (static mode) |
| `Attempt` | `1` |
| `User ID` | ← C1.User ID |
| **concurrency** | `1` (one row at a time) |

For Each has no outputs. Each Per App execution writes its own Results rows. If a Per App execution ends in an error, For Each stops before the remaining rows [FN-19].

### Checklist (Part A)

- [ ] `POC-FBM Logout – Dispatcher` is in folder `POC-ITP-FBM`. Its Flow Activation button reads **Saving data**, and it's ON.
- [ ] Cards C1–C8 are present. C7 (oauth mode only) has C7.1–C7.4 in Try and C7.5–C7.7 in If Error.
- [ ] C2 is the first card after C1, and value b is the real connection-account user ID.
- [ ] C4 uses `POC-Okta`, and C7.2 uses `POC-AS Token (Basic)`.
- [ ] C6 reads `POC-FBM Logout Registry` with All matching rows and the filter Enabled = true.
- [ ] C8 calls `POC-FBM Logout – Per App` with `Row` = item, `Attempt` = `1`, and concurrency `1`.
- [ ] No secret is typed into any card. The token body in C7.2 holds no secret.

### Report to the executor (Part A)

- The flow is saved, Save all data is on, and the flow is ON.
- The mode you built.
- Anything that differed from this sheet, with the exact labels you saw. Especially report the operator you picked in C6's filter dialog.

## Testing (P6-T4)

For each scenario the executor runs `npm run check -- dispatcher-prep --user 02 --scenario <S>` and gives you user02's Okta user ID: `<user02 id>`.

1. Open `POC-FBM Logout – Dispatcher` and click **Run** [SCR-8]. In the **Run Flow** window, enter `User ID` = `<user02 id>` and click **Run**.
2. Wait about 30 seconds, then tell the executor "done". The executor runs `dispatcher-verify`.
3. Open the run under **Execution History** [SCR-9] and answer that scenario's questions.

**S1 (all apps succeed):**
- Expand C6's **Rows** output. Paste one row object into chat; it holds only registry values and row metadata (U7).
- Report C7.2's **Status Code**; 200 is expected (U11). In static mode, say "static".
- Open `POC-FBM Logout – Per App` > Execution History. Report how many executions this run started; 3 are expected, one per enabled row.

**S2 (SAML returns 422):**
- In `POC-FBM Logout – Per App` > Execution History, find every execution whose C7 output is `POC-FBM-SAML`. One is expected; four means the flow retried.
- In the first one, report which section of C8.6 ran (Try or If Error), and whether the execution ended in an error.
  - If **If Error** ran, expand its **Error** object and paste it into chat, including every key and value (U6). Also report what C8.6.2 output.
  - If **Try** ran, report C8.6.1's Status Code.
- Report every Results row for `POC-FBM-SAML`. One row, `422` `failure`, is expected.

**S3 (OIDC returns 429 first):**
- Report the two Results rows for `POC-FBM-OIDC` in table `POC-FBM Logout Results`: `429` `retry`, then `204` `success`, are expected.
- Report how many Per App executions the run started; 4 are expected, because the retry calls Per App again.

## Part B: token sweep (P10-T3, conditional)

Add only the variant named by `decision.tokenSweep`. Both variants come after C8, so they run after every app call.

### Variant `user-sessions` (no new flow)

This makes the same call the T5 sweep probe proved [API-3]. Add after C8:

**B1 Text – Concatenate**
- **text 1**: `/api/v1/users/`
- **text 2** ← C1.User ID
- **text 3**: `/sessions`

**B2 Object – Construct**

| Input name | Type | Value |
| --- | --- | --- |
| `oauthTokens` | Text | `true` |

**B3 Error Handling – If Error**
- **Try** section:
  - **B3.1 Okta – Custom API Action** (`POC-Okta`): **Request Type** `DELETE`; **Relative URL** ← B1.output; **Query** ← B2.output.
- **If Error** section:
  - **B3.2 Flow Control – Assign**: create `sweep status`, type Number, value `0`.
- **View Outputs**: `status`, type Number. Try field ← B3.1.Status Code; If Error field ← B3.2.sweep status.

**B4 Branching – Lookup**
- **Value** ← B3.status
- One row: `204` → `success`.
- **Otherwise Result Is**: `failure`.

**B5 Date & Time – Now**

**B6 Tables – Create Row** (`POC-FBM Logout Results`, all five columns):
- **Time** ← B5.date
- **User ID** ← C1.User ID
- **App name**: `Okta token sweep`
- **Status code** ← B3.status
- **Outcome** ← B4.Result

This call needs scope `okta.users.manage` granted in the Okta Workflows OAuth app [API-6]. It also clears the user's remembered factors, because `forgetDevices` defaults to true [API-3]. If B3.1 fails with Insufficient Scope, stop and tell the executor; granting scopes changes an existing app and needs approval.

Checklist: B1–B6 come after C8, the flow is saved, and it's still ON.

### Variant `per-client` (adds an active flow)

With Per App, Dispatcher, Respond, and Respond by Email on, this helper would be the fifth active flow. That's the Starter limit [LIM-1], and it's the slot the fallback (wf-05) needs if it's built later. So P10-T3 blocks this variant on Workflows Starter when 4 or more flows are on.

1. Create helper `POC-FBM Token Sweep – Per Client` in folder `POC-ITP-FBM`. Name it and turn on **Save all data that passes through the flow** in the first Save dialog, as in Part A.
   - **H1 Helper Flow**: inputs `User ID` (Text) and `Client` (Object).
   - **H2 Branching – Continue If**: **value a** ← H1.User ID; `not equal to`; **value b** `<OKTA_WF_CONNECTION_USER_ID>`; message `Refusing to act on the Workflows connection account`.
   - **H3 Object – Get**: **object** ← H1.Client; **path** `client_id`; output Text [API-4].
   - **H4 Text – Concatenate**: `/api/v1/users/`, ← H1.User ID, `/clients/`, ← H3.output, `/tokens`.
   - **H5 Error Handling – If Error**:
     - Try: **H5.1 Okta – Custom API Action** (`POC-Okta`), `DELETE`, **Relative URL** ← H4.output [API-5].
     - If Error: **H5.2 Flow Control – Assign** `sweep status` (Number) = `0`.
     - View Outputs: `status` (Number), Try ← H5.1.Status Code, If Error ← H5.2.sweep status.
   - **H6 Branching – Lookup**: **Value** ← H5.status; `204` → `success`; Otherwise `failure`.
   - **H7 Date & Time – Now**.
   - **H8 Tables – Create Row** (`POC-FBM Logout Results`): Time ← H7.date; User ID ← H1.User ID; App name `Okta token sweep`; Status code ← H5.status; Outcome ← H6.Result.
   - Save and turn the flow ON.
2. In the dispatcher, after C8:
   - **B1 Text – Concatenate**: `/api/v1/users/`, ← C1.User ID, `/clients`.
   - **B2 Okta – Custom API Action** (`POC-Okta`): `GET`, **Relative URL** ← B1.output. Its Body is a JSON array [API-4], typed Object [ACT-4].
   - **B3 JSON – Stringify**: **object** ← B2.Body.
   - **B4 JSON – Parse**: **string** ← B3.output; output type **List of Objects** [FN-17].
   - **B5 List – For Each**: list ← B4.output; Helper Flow `POC-FBM Token Sweep – Per Client`; `User ID` ← C1.User ID; `Client` = **item**; concurrency `1`.

Checklist: the helper has H1–H8 and is ON; the dispatcher has B1–B5 after C8 and is saved and ON.
