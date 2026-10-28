# wf-03 POC-ITP FBM – Respond (P6-T5, P7-T4, P10-T1)

Guide name: `ITP FBM – Respond` (guide Step 4). This is the delegated flow that ITP's entity risk rule, session protection, and the SOC run. It's built in two passes:
- **Part A** is a probe that only records what the Delegated Flow card receives.
- **Part B** adds the logout cards, once the probe shows how ITP passes the user (U1).

Sources: [Build a delegated flow](https://help.okta.com/wf/en-us/content/topics/workflows/build/build-delegated-flow.htm), [ITP delegated flows](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm), [Global Token Revocation](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/globaltokenrevocation.htm), [Upsert User Risk](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/upsertuserrisk.htm).

## Part A: probe version (P6-T5)

Create the flow in folder `POC-ITP-FBM` and name it `POC-ITP FBM – Respond`.

**C1 Delegated Flow** (Add event > **Delegated Flow**). Inputs: add `User ID` (Text).

**C2 Date & Time – Now**. Output `started`.

**C3 Tables – Create Row** (`POC-Respond Probe`):
- Time ← C2.started
- Input User ID ← C1 Inputs > User ID
- Okta User ID ← C1 User Context > Okta User ID
- Caller ID ← C1 Context > Caller > ID
- Caller Type ← C1 Context > Caller > Type
- Caller Display Name ← C1 Context > Caller > Display Name
- Caller Alternate ID ← C1 Context > Caller > Alternate ID

Save, then turn the flow **ON** (ITP lists only flows that exist and are on; the Run button needs it on).

**Report to the executor:**
- The browser URL of the flow editor. The executor takes the number after `/flows/` as `WF_RESPOND_FLOW_ID` (U5). If the URL has no such number, say so.
- Confirmation that the flow is ON.

## Choosing the outcome (P7-T3)

ac-05 gives you three Probe rows:
- **ITP**: written when the entity risk rule ran the flow for user02.
- **Manual, empty**: you ran it from Delegated flows with User ID blank.
- **Manual, with ID**: you ran it with user02's ID.

| Outcome | When the rows look like this | Target user | Manual-run guard |
| --- | --- | --- | --- |
| **A** | ITP row: Input User ID = user02's ID | Input User ID | Input User ID must not be empty |
| **B** | ITP row: Input User ID empty, Okta User ID = user02's ID, Caller ID not empty. Manual-empty row: Caller ID empty | Input User ID if Caller ID is empty, else Okta User ID | Target must not be empty |
| **C1** | ITP row: user02's ID only in Okta User ID, and Caller ID looks the same as in the manual rows | Okta User ID | Respond is removed from the SOC resource set (`POC_SOC_INCLUDE_RESPOND=false`); the SOC uses Respond by Email |
| **C2** | user02's ID appears in no field of the ITP row | — | Blocked: the executor proposes a plan change |

## Part B: logout cards (P7-T4)

Keep C1–C3. Add cards C4 and C5 for your outcome, then the common cards C6–C11.

### Outcome A

- **C4 Continue If**: value a ← C1 Inputs > User ID, comparison is not empty. Message `User ID is required`.
- **C5 Flow Control – Assign**: `target user id` ← C1 Inputs > User ID.

### Outcome B

- **C4 Assign If**:
  - value a ← C1 Context > Caller > ID; comparison is empty
  - value if true ← C1 Inputs > User ID; value if false ← C1 User Context > Okta User ID
  - Output `target user id`.
- **C5 Continue If**: value a ← C4.target user id, comparison is not empty. Message `Manual runs must enter a User ID`.

### Outcome C1

- **C4 Flow Control – Assign**: `target user id` ← C1 User Context > Okta User ID.
- **C5 Continue If**: value a ← C4.target user id, comparison is not empty. Message `No user`.

### Common cards (all outcomes)

**C6 Continue If**
- value a ← target user id; comparison not equal to; value b `<OKTA_WF_CONNECTION_USER_ID>`
- message `Refusing to act on the Workflows connection account`

**C7 If Error**
- Try section: **Okta ITP – Global Token Revocation** (connection `POC-Okta ITP`), User ID ← target user id. Map Status Code to the If Error output `gtr status`.
- If Error section: **Flow Control – Assign** `gtr status` = `0`, mapped to the output.
- View Outputs: `gtr status` (Number).

**C8 Date & Time – Now**. Output `gtr done`.

**C9 Lookup**: Value ← C7.gtr status; `204` → `success`; Otherwise → `failure`. Output `gtr outcome`.

**C10 Tables – Create Row** (`POC-FBM Logout Results`):
- Time ← C8.gtr done
- User ID ← target user id
- App name `Okta GTR`
- Status code ← C7.gtr status
- Outcome ← C9.gtr outcome

**C11 Flow Control – Call Flow**: Helper Flow `POC-FBM Logout – Dispatcher`, User ID ← target user id. No outputs.

Save. Leave the flow ON.

### Checklist (Part B)

- [ ] C1–C3 unchanged (Probe row is still written on every run)
- [ ] C4–C5 match the recorded outcome
- [ ] C6 guard has the real connection-account user ID
- [ ] C7 uses `POC-Okta ITP` and maps only `target user id`
- [ ] C10 writes `Okta GTR`; C11 calls the Dispatcher
- [ ] Flow is ON

## Part C: risk reset (P10-T1, conditional on `decision.riskReset == add`)

Add after C11:

- **C12 Okta ITP – Upsert User Risk** (`POC-Okta ITP`): User ID ← target user id; Risk Level `Low`.
- **C13 Date & Time – Now**.
- **C14 Tables – Create Row** (Results):
  - Time ← C13
  - User ID ← target user id
  - App name `Okta risk reset`
  - Status code `0`
  - Outcome ← C12 output Risk Level
- **C15**: none. Save.

Checklist: C12–C14 added after C11; flow saved and ON.
