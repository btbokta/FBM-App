# wf-01 POC-FBM Logout – Per App (P6-T2)

This flow is the guide's `FBM Logout – Per App` (guide Step 2). It logs one user out of one registry app and classifies the response. It retries 429 and 5xx up to three times by calling itself (decision D-RETRY), writes one `POC-FBM Logout Results` row per attempt (D-RESULTS), and returns the final status to its caller. Every card name and label is in the ledger, [wf-card-reference.md](wf-card-reference.md); IDs in square brackets point to its entries.

Connection mode for this run: `GTR_AUTH_MODE=<GTR_AUTH_MODE>`. It changes C8.1, C8.2, and C8.6.1 only.

## Flow settings

| Setting | Value |
| --- | --- |
| Folder | `POC-ITP-FBM` |
| Flow name | `POC-FBM Logout – Per App` (en dash) |
| Kind | Helper flow: its event card is Helper Flow [EVT-1] |
| Save all data that passes through the flow | On. P6-T4 reads card values from the executions [SCR-6] |
| First save | Right after C1, so the flow exists when C15.4 has to select it [SCR-8] |
| Turn on | After the checklist, before you build wf-02 |

Saving all data puts the test users' emails and the 5-minute access token from C1 into execution history, where other Workflows admins can see them [SCR-6]. That's accepted for this POC; see the report.

## Build

1. Open folder `POC-ITP-FBM` and click **+ New Flow** [SCR-5]. Don't rename it with the pencil icon; the first Save names it.
2. Build C1. Then click **Save** [SCR-5, SCR-6]. In the **Save flow** dialog:
   - Type the name `POC-FBM Logout – Per App`.
   - Turn on **Save all data that passes through the flow**; Okta's tutorial calls it **Save All Data**.
   - Click **Save**.

   If a naming dialog opens before you add C1, do the same there.
3. Build C2 to C16 in order. Add each card with **Add function** > *category* > *card*. Inside a branch or section, add cards the same way.
4. **Save** and work through the checklist. Then click the activation control at the top of the flow builder: **Flow is OFF**. Okta's save-data page calls it the **Flow Activation** button [SCR-6, SCR-7]. Make sure **Save all data that passes through the flow** is on, then switch the flow ON. It should now show ON and **Saving data**. ⚠ UNVERIFIED that this is one control. If you find two, turn on saving with the Flow Activation button, and switch ON with the Flow is OFF toggle.

Notation: `←` means drag that output into the field; a value in `code` means type it. Leave every card's gear > **Error handling** at its defaults [SCR-10].

### C1 Helper Flow (event) [EVT-1]

Click **Add Event** > **Helper Flow**. Under **Inputs to this Flow**, click **Click or drag to create** five times and create these fields:

| Name | Type |
| --- | --- |
| `Row` | Object |
| `User profile` | Object |
| `Access token` | Text |
| `Attempt` | Number |
| `User ID` | Text |

Save now (Build step 2).

### C2 Branching – Continue If [FN-7]: connection-account guard

- **value a** ← C1.User ID
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Refusing to act on the Workflows connection account`

### C3 Object – Get [FN-11]

- **object** ← C1.Row
- **path**: `Identifier attribute`
- **output**: leave the type Text. It holds the name of the profile attribute the app keys users by, for example `email`.

### C4 Object – Get

- **object** ← C1.User profile
- **path** ← C3.output
- **output**: Text. This is the user's identifier value, for example the email address.
- ⚠ UNVERIFIED: if the profile lacks that attribute, whether C4 returns empty or fails the execution [FN-11]. Every POC user has `email`, so the POC never hits this; see the report, trace PA-10.

### C5 Object – Get

- **object** ← C1.Row
- **path**: `Method`
- **output**: Text.

### C6 Object – Get

- **object** ← C1.Row
- **path**: `Endpoint or API`
- **output**: Text.

### C7 Object – Get

- **object** ← C1.Row
- **path**: `App name`
- **output**: Text.

> The paths in C3 and C5–C7 are the registry column names. Okta's KB screenshot shows Search Rows rows as flat objects keyed by column name, with `Row ID`, `Created`, and `Updated` beside them [FN-22]. ⚠ UNVERIFIED (U7): that this org returns the same shape, and that paths containing spaces work. P6-T4 scenario S1 checks both. If the shape differs, the executor gives you new paths for C3 and C5–C7.

### C8 Branching – If/ElseIf [FN-6]

Conditions (**Edit Conditions**):
1. **value a** ← C5.output; **comparison** `equal to`; **value b** `gtr`.
2. Add a second condition: **value a** ← C5.output; **comparison** `equal to`; **value b** `vendor`.

Click **View Outputs** (top right) and add one output: `status code`, type Number. It shows one field for condition 1, one for condition 2, and one for Else. You fill each one at the end of its branch, below.

Open a branch with the **+** icon right of its condition, and switch branches with the dropdown at the top left.

#### Branch 1: `gtr`

**C8.1 Text – Concatenate** [FN-13]. **Oauth mode only**; in static mode skip C8.1.
- **text 1**: `Bearer`
- **text 2**: a single space
- **text 3** (click **Click or drop here to create**) ← C1.Access token

**C8.2 Object – Construct** [FN-12]: the request headers. Create these inputs with **Click or drop to create**:

| Input name | Type | Value |
| --- | --- | --- |
| `Authorization` | Text | ← C8.1.output. **Oauth mode only**; in static mode don't create this input, because the connection adds the header |
| `Content-Type` | Text | `application/json` |
| `Accept` | Text | `application/json` |

**C8.3 Object – Construct**: the inner `sub_id` object.

| Input name | Type | Value |
| --- | --- | --- |
| `format` | Text | `email` |
| `email` | Text | ← C4.output |

**C8.4 Object – Construct**: the body object.

| Input name | Type | Value |
| --- | --- | --- |
| `sub_id` | Object | ← C8.3.output |

**C8.5 JSON – Stringify** [FN-18]
- **object** ← C8.4.output
- Its **output** (Text) is `{"sub_id":{"format":"email","email":"<user's email>"}}`, the Global Token Revocation body the guide requires.

**C8.6 Error Handling – If Error** [FN-10]

- **Try** section:
  - **C8.6.1 API Connector – Raw Request** [FN-24]
    - **Connection** (name at the top of the card; click it to change [SCR-4]): `POC-API None` in oauth mode, `POC-Mock GTR Static (Custom Header)` in static mode.
    - **URL** ← C6.output
    - **Method**: `POST`
    - **Headers** ← C8.2.output
    - **Query**: leave empty
    - **Body** ← C8.5.output
- **If Error** section (use the dropdown at the top of C8.6):
  - **C8.6.2 Object – Get**
    - **object** ← the **Error** object of C8.6's If Error section. It's shown at the left of the If Error section, under **context** [FN-10, KB-7].
    - **path**: `code`
    - **output**: set the type to Number.
- **View Outputs** on C8.6: add `status`, type Number.
  - Try field ← C8.6.1.Status Code
  - If Error field ← C8.6.2.output
- Back in C8's outputs pane: the condition 1 field of `status code` ← C8.6.status.

> The If Error page lists the error object's fields as `message`, `code`, `method`, `flo`, and `execution` [FN-10]. An Okta KB screenshot shows an API Connector call that got HTTP 500: the card errored into If Error, and the Error object held `code` 500 [KB-7].
>
> ⚠ UNVERIFIED (U6): that Raw Request behaves the same for a 4xx, so `code` holds 422. Mapping both sections into `status` covers either behavior. Scenario S2 forces a 422 and shows which case applies:
> - The right path gives one SAML call and one Results row (422, failure).
> - A wrapping 500 gives four SAML calls ending in `failure-retries-exhausted`.
> - A missing `code` fails the SAML execution before it writes a row.
>
> The executor then gives you the right path for C8.6.2 and C8.10.2.
>
> ⚠ UNVERIFIED: a request that fails with no HTTP status at all, such as a timeout, DNS, or TLS failure. If `code` is then missing or not a number, C8.6.2 may fail. The execution would end in an error without a Results row, and the dispatcher would skip the remaining apps [FN-19]. No PLAN task tests this yet; see the report, PA-6 and PC3.

#### Branch 2: `vendor`

**C8.7 Object – Construct**: the body object.

| Input name | Type | Value |
| --- | --- | --- |
| `email` | Text | ← C4.output |

**C8.8 JSON – Stringify**
- **object** ← C8.7.output
- Its **output** is `{"email":"<user's email>"}`.

**C8.9 Object – Construct**: the headers. The connection adds `X-API-Key`.

| Input name | Type | Value |
| --- | --- | --- |
| `Content-Type` | Text | `application/json` |
| `Accept` | Text | `application/json` |

**C8.10 Error Handling – If Error**

- **Try** section:
  - **C8.10.1 API Connector – Raw Request**
    - **Connection**: `POC-Mock Vendor (Custom Header)`
    - **URL** ← C6.output
    - **Method**: `POST`
    - **Headers** ← C8.9.output
    - **Query**: leave empty
    - **Body** ← C8.8.output
- **If Error** section:
  - **C8.10.2 Object – Get**
    - **object** ← the **Error** object of C8.10's If Error section. It's shown at the left of the If Error section, under **context** [FN-10, KB-7].
    - **path**: `code`
    - **output**: Number
- **View Outputs** on C8.10: add `status`, type Number.
  - Try field ← C8.10.1.Status Code
  - If Error field ← C8.10.2.output
- In C8's outputs pane: the condition 2 field of `status code` ← C8.10.status.

#### Else branch

**C8.11 Flow Control – Assign** [FN-3]
- Create one input: `status code`, type Number, value `0`.
- In C8's outputs pane: the Else field of `status code` ← C8.11.status code.

### C9 Branching – Lookup [FN-8]: classify the status

- **Value** ← C8.status code (C8's output). A Number should convert to text here [SCR-13]. ⚠ UNVERIFIED: the docs conflict on mapping a Number into this String field. Scenario S3 settles it: a 429 that isn't classified `retry` isn't retried, and S3 fails.
- **Lookup Table**: click the bottom row to add each row.

| When Value Is | Then Result Is |
| --- | --- |
| `200` | `success` |
| `201` | `success` |
| `202` | `success` |
| `203` | `success` |
| `204` | `success` |
| `205` | `success` |
| `206` | `success` |
| `207` | `success` |
| `208` | `success` |
| `226` | `success` |
| `404` | `success` |
| `429` | `retry` |
| `500` | `retry` |
| `501` | `retry` |
| `502` | `retry` |
| `503` | `retry` |
| `504` | `retry` |
| `505` | `retry` |
| `506` | `retry` |
| `507` | `retry` |
| `508` | `retry` |
| `510` | `retry` |
| `511` | `retry` |

- **Otherwise Result Is**: `failure`
- **Result**: leave the type Text.

These are guide Step 2.5's rules: 2xx and 404 are success, 429 and 5xx are retried, and everything else is a failure, including 400, 401, 403, 422, `0`, and an empty status. The 2xx and 5xx codes are the standard ones listed on Okta's HTTP status codes page.

⚠ UNVERIFIED: that an empty status gives `failure` rather than an error [FN-8]. Lookup's Value is required, and no page says what an empty one does. It matters only if C8.6.2 or C8.10.2 return nothing (U6), and scenario S2 catches that case.

### C10 Branching – Assign If [FN-9]

- **value a** ← C1.Attempt
- **comparison**: `greater than or equal`
- **value b**: `4`, with its type set to Number
- **value if true**: `last`
- **value if false**: `more`
- **output**: set the type to Text.

Attempt is always 1 to 4, so the comparison gives the same result as numbers or as text.

### C11 Text – Concatenate

- **text 1** ← C9.Result
- **text 2**: `-`
- **text 3** (Click or drop here to create) ← C10.output

### C12 Branching – Lookup: final outcome

- **Value** ← C11.output
- **Lookup Table**:

| When Value Is | Then Result Is |
| --- | --- |
| `success-more` | `success` |
| `success-last` | `success` |
| `retry-more` | `retry` |
| `retry-last` | `failure-retries-exhausted` |
| `failure-more` | `failure` |
| `failure-last` | `failure` |

- **Otherwise Result Is**: `failure`
- **Result**: Text.

### C13 Date & Time – Now [FN-16]

The output you use is **date** (Date & Time).

### C14 Tables – Create Row [FN-23]

- **Choose Table** > select `POC-FBM Logout Results` > **Choose**, then **Save** on the card. Check all five columns, then **Save** [FN-23].
- **Time** ← C13.date
- **User ID** ← C1.User ID
- **App name** ← C7.output
- **Status code** ← C8.status code
- **Outcome** ← C12.Result

### C15 Branching – If/Else [FN-5]: retry or finish

- **Condition**: **value a** ← C12.Result; **comparison** `equal to`; **value b** `retry`. Click **Done**.
- **Create Outputs**:

| Output | Type |
| --- | --- |
| `final status` | Number |
| `final outcome` | Text |
| `attempts` | Number |

#### True branch (upper, orange): retry

**C15.1 Number – Multiply** [FN-15]
- **number 1** ← C1.Attempt
- **number 2**: `2`

**C15.2 Flow Control – Wait For** [FN-4]
- **delay** ← C15.1.output
- **unit**: `second`

**C15.3 Number – Add** [FN-14]
- **number 1** ← C1.Attempt
- **number 2**: `1`

**C15.4 Flow Control – Call Flow** [FN-1]
- **Helper Flow**: **Choose Flow** > `POC-FBM Logout – Per App`, this same flow. Saving after C1 should make it appear in the list. ⚠ UNVERIFIED: no doc says so [SCR-8]. If it isn't listed, save again and reopen the dialog; if it's still missing, stop and tell the executor.
- **With these inputs**:

| Input | Value |
| --- | --- |
| Row | ← C1.Row |
| User profile | ← C1.User profile |
| Access token | ← C1.Access token |
| Attempt | ← C15.3.total |
| User ID | ← C1.User ID |

- **Outputs**: create three with **Click or drag to create**. They must match C16's fields exactly, in name and type:

| Output | Type |
| --- | --- |
| `Status code` | Number |
| `Outcome` | Text |
| `Attempts` | Number |

- In C15's outputs, the true values are:
  - `final status` ← C15.4.Status code
  - `final outcome` ← C15.4.Outcome
  - `attempts` ← C15.4.Attempts

#### False branch (lower, blue): finish

**C15.5 Flow Control – Assign**

| Input name | Type | Value |
| --- | --- | --- |
| `final status` | Number | ← C8.status code |
| `final outcome` | Text | ← C12.Result |
| `attempts` | Number | ← C1.Attempt |

In C15's outputs, the false values are:
- `final status` ← C15.5.final status
- `final outcome` ← C15.5.final outcome
- `attempts` ← C15.5.attempts

### C16 Flow Control – Return [FN-2]

Create three fields with **Click or drop to create**:

| Field | Type | Value |
| --- | --- | --- |
| `Status code` | Number | ← C15.final status |
| `Outcome` | Text | ← C15.final outcome |
| `Attempts` | Number | ← C15.attempts |

Save. Then turn the flow on (Build step 4).

## Checklist

- [ ] `POC-FBM Logout – Per App` is in folder `POC-ITP-FBM`. The **Flow Activation** button reads **Saving data**, and the flow is ON.
- [ ] There are 16 top-level cards, C1–C16.
  - C8 has three branches (`gtr`, `vendor`, Else) holding C8.1–C8.11.
  - C8.6 and C8.10 each have a Try card and an If Error card.
  - C15 has a true branch (C15.1–C15.4) and a false branch (C15.5).
- [ ] C1 has exactly these inputs: `Row` (Object), `User profile` (Object), `Access token` (Text), `Attempt` (Number), `User ID` (Text).
- [ ] C2 is the first card after C1, and value b is the real connection-account user ID.
- [ ] No Continue If or Return card sits inside a branch or section.
- [ ] C8.6.1 uses `POC-API None` (oauth) or `POC-Mock GTR Static (Custom Header)` (static). C8.10.1 uses `POC-Mock Vendor (Custom Header)`. Both are left at the default error handling.
- [ ] C8.6 and C8.10 each output `status` (Number), with both the Try and If Error fields filled.
- [ ] C8 outputs `status code` (Number), with the `gtr`, `vendor`, and Else fields filled.
- [ ] C9 has 23 rows and Otherwise `failure`. C12 has 6 rows and Otherwise `failure`.
- [ ] C15.4 calls this flow, with all five inputs mapped and outputs `Status code` (Number), `Outcome` (Text), `Attempts` (Number). C16 returns the same three names and types.
- [ ] No secret is typed into any card.

## Report to the executor

- The flow is saved, Save all data is on, and the flow is ON.
- The mode you built (oauth or static), and the connection shown on C8.6.1 and C8.10.1.
- Whether C15.4's Choose Flow dialog listed this flow.
- Every card, field, option, or label that looked different from this sheet, with the exact text you saw.
