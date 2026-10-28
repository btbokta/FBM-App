# wf-01 POC-FBM Logout – Per App (P6-T2)

Guide name: `FBM Logout – Per App` (guide Step 2). This helper logs one user out of one registry app, retries 429 and 5xx up to three times by calling itself (decision D-RETRY), writes one Results row per attempt (D-RESULTS), and returns the final status.

Sources: [Call Flow](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_spawn.htm), [Return](https://help.okta.com/wf/en-us/Content/Topics/Workflows/function-reference/flow-control/flocontrol_return.htm), [Object – Get](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/object/object_get.htm), [If/ElseIf](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_branch.htm), [If Error](https://help.okta.com/wf/en-us/Content/Topics/Workflows/function-reference/Error-Handling/errorhandling_trycatch.htm), [Raw Request](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_raw.htm), [Lookup](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_lookup.htm), [Assign If](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_assignif.htm), [Wait For](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_wait.htm), [Recursion KB](https://support.okta.com/help/s/article/set-up-recursion-in-workflows).

Create the flow in folder `POC-ITP-FBM` and name it `POC-FBM Logout – Per App`. Save it once before card 14, because card 14 calls this same flow.

## Cards

**C1 Helper Flow** (event: Add event > Helper Flow). Click or drag to create these inputs:

| Input | Type |
| --- | --- |
| `Row` | Object |
| `User profile` | Object |
| `Access token` | Text |
| `Attempt` | Number |
| `User ID` | Text |

**C2 Object – Get**
- object ← C1.Row
- path `Identifier attribute`
- Rename the output to `identifier key` (Text).

**C3 Object – Get**
- object ← C1.User profile
- path ← C2.identifier key
- Rename the output to `identifier value` (Text).

**C4 Object – Get**
- object ← C1.Row
- path `Method`
- Output `method` (Text).

**C5 Object – Get**
- object ← C1.Row
- path `Endpoint or API`
- Output `endpoint` (Text).

**C6 Object – Get**
- object ← C1.Row
- path `App name`
- Output `app name` (Text).

> Paths in C2 and C4–C6 assume Search Rows returns flat row objects keyed by column name (U7). P6-T4 checks this; if rows are nested (for example under `Fields`), the executor updates these paths and you edit them.

**C7 If/ElseIf**
- Edit Conditions:
  - Branch 1 is ← C4.method, equal to, `gtr`.
  - Branch 2 is ← C4.method, equal to, `vendor`.
  - Keep the Else branch.
- View Outputs: add `status code` (Number).

Branch 1 (`gtr`):
- **C7.1 Text – Concatenate**: `Bearer ` (with the trailing space), then ← C1.Access token. Output `auth header`. *(Static mode: skip C7.1.)*
- **C7.2 Object – Construct**: key `Authorization` ← C7.1.auth header (static mode: omit this key); key `Content-Type` = `application/json`; key `Accept` = `application/json`. Output `headers`.
- **C7.3 Text – Compose**: type `{"sub_id":{"format":"email","email":"`, drag in ← C3.identifier value, then type `"}}`. Output `body`.
- **C7.4 If Error**:
  - **Try** section: **API Connector – Raw Request**.
    - Connection: `POC-API None` (oauth mode) or `POC-Mock GTR Static (Custom Header)` (static mode)
    - URL ← C5.endpoint
    - Method `POST`
    - Headers ← C7.2.headers
    - Query: empty
    - Body ← C7.3.body
    - Map the Raw Request output **Status Code** to the If Error output `status`.
  - **If Error** section: **Object – Get**, object ← the If Error card's error object, path `statusCode`, output `err status` (Number). Map it to the If Error output `status`.
  - View Outputs on C7.4: `status` (Number).

  > Path `statusCode` is the POC default (U6). In scenario S2 the executor asks you to open the failed execution and copy the error object; if the 422 is somewhere else, the executor gives you the path to use here and in C7.8.
- Map ← C7.4.status to the branch output `status code`.

Branch 2 (`vendor`):
- **C7.5 Text – Compose**: type `{"email":"`, drag ← C3.identifier value, type `"}`. Output `body`.
- **C7.6 Object – Construct**: `Content-Type` = `application/json`, `Accept` = `application/json`. Output `headers`.
- **C7.7 If Error**: same as C7.4 except the Raw Request connection is `POC-Mock Vendor (Custom Header)`, Headers ← C7.6.headers, Body ← C7.5.body.
- **C7.8**: the If Error section's Object – Get, same as in C7.4. Map ← C7.7.status to the branch output `status code`.

Else branch:
- **C7.9 Flow Control – Assign**: `status code` = `0`. Map it to the branch output `status code`.

**C8 Lookup** (Value ← C7.status code). Lookup Table:

| When Value Is | Then Result Is |
| --- | --- |
| `200` | `success` |
| `201` | `success` |
| `202` | `success` |
| `204` | `success` |
| `404` | `success` |
| `429` | `retry` |
| `500` | `retry` |
| `502` | `retry` |
| `503` | `retry` |
| `504` | `retry` |

Otherwise Result Is `failure`. Output `classification`.

**C9 Assign If**
- value a ← C1.Attempt; comparison greater than or equal; value b `4`
- value if true `last`; value if false `more`
- Output `attempt state`.

**C10 Text – Concatenate**: ← C8.classification, `-`, ← C9.attempt state. Output `outcome key`.

**C11 Lookup** (Value ← C10.outcome key):

| When Value Is | Then Result Is |
| --- | --- |
| `success-more` | `success` |
| `success-last` | `success` |
| `retry-more` | `retry` |
| `retry-last` | `failure-retries-exhausted` |
| `failure-more` | `failure` |
| `failure-last` | `failure` |

Otherwise Result Is `failure`. Output `outcome`.

**C12 Date & Time – Now**. Output `now`.

**C13 Tables – Create Row**: Table `POC-FBM Logout Results`.
- Time ← C12.now
- User ID ← C1.User ID
- App name ← C6.app name
- Status code ← C7.status code
- Outcome ← C11.outcome

**C14 If/Else**
- Condition: value a ← C11.outcome, comparison equal to, value b `retry`.
- Create Outputs: `final status` (Number), `final outcome` (Text), `attempts` (Number).

True branch:
- **C14.1 Number – Multiply**: ← C1.Attempt × `2`. Output `delay seconds`.
- **C14.2 Flow Control – Wait For**: delay ← C14.1.delay seconds, unit `second`.
- **C14.3 Number – Add**: ← C1.Attempt + `1`. Output `next attempt`.
- **C14.4 Flow Control – Call Flow**: Helper Flow = `POC-FBM Logout – Per App` (this flow).
  - With these inputs: Row ← C1.Row, User profile ← C1.User profile, Access token ← C1.Access token, Attempt ← C14.3.next attempt, User ID ← C1.User ID.
  - Create outputs by hand with exactly these names and types: `Status code` (Number), `Outcome` (Text), `Attempts` (Number).
- Map C14.4 outputs to `final status`, `final outcome`, and `attempts`.

False branch:
- Map ← C7.status code to `final status`, ← C11.outcome to `final outcome`, and ← C1.Attempt to `attempts`.

**C15 Flow Control – Return**: add fields `Status code` (Number) ← C14.final status, `Outcome` (Text) ← C14.final outcome, `Attempts` (Number) ← C14.attempts.

Save, then turn the flow **ON**.

## Checklist

- [ ] 15 top-level cards (C1–C15); C7 has 3 branches; C14 has 2 branches
- [ ] Helper inputs: Row, User profile, Access token, Attempt, User ID
- [ ] Raw Request in `gtr` uses `POC-API None` (oauth) or `POC-Mock GTR Static (Custom Header)` (static); in `vendor` uses `POC-Mock Vendor (Custom Header)`
- [ ] No secret typed into any card
- [ ] Call Flow targets this same flow and has outputs Status code, Outcome, Attempts
- [ ] Return has Status code, Outcome, Attempts
- [ ] Flow is ON
