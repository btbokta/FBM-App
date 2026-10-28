# wf-04 POC-ITP FBM – Respond by Email (P7-T4)

Guide name: `ITP FBM – Respond by Email` (guide Step 6, optional email wrapper). This is a delegated flow for SOC analysts who would rather enter an email address than an Okta user ID.

Sources: [Build a delegated flow](https://help.okta.com/wf/en-us/content/topics/workflows/build/build-delegated-flow.htm), [Read User](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/actions/readuser.htm), [Global Token Revocation](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/globaltokenrevocation.htm).

Create the flow in folder `POC-ITP-FBM` and name it `POC-ITP FBM – Respond by Email`.

**C1 Delegated Flow**. Inputs: `Email` (Text).

**C2 Continue If**: value a ← C1 Inputs > Email; comparison is not empty. Message `Email is required`.

**C3 Okta – Read User** (`POC-Okta`): ID or Login ← C1 Inputs > Email. Keep the output **ID**. POC users' login equals their email (U27).

**C4 Continue If**
- value a ← C3.ID; comparison not equal to; value b `<OKTA_WF_CONNECTION_USER_ID>`
- message `Refusing to act on the Workflows connection account`

**C5 If Error**
- Try section: **Okta ITP – Global Token Revocation** (`POC-Okta ITP`), User ID ← C3.ID. Map Status Code to the output `gtr status`.
- If Error section: Flow Control – Assign `gtr status` = `0`.
- View Outputs: `gtr status` (Number).

**C6 Date & Time – Now**.

**C7 Lookup**: ← C5.gtr status; `204` → `success`; Otherwise → `failure`.

**C8 Tables – Create Row** (`POC-FBM Logout Results`):
- Time ← C6
- User ID ← C3.ID
- App name `Okta GTR`
- Status code ← C5.gtr status
- Outcome ← C7

**C9 Flow Control – Call Flow**: `POC-FBM Logout – Dispatcher`, User ID ← C3.ID.

Save, then turn the flow **ON**. Report the flow editor URL; the executor sets `WF_RESPOND_BY_EMAIL_FLOW_ID` from the number after `/flows/`.

## Checklist

- [ ] C1–C9 present
- [ ] C4 guard has the real connection-account user ID
- [ ] Flow is ON
