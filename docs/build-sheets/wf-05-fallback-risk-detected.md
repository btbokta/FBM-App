# wf-05 POC-ITP FBM – Risk Detected (fallback) (P10-T5, conditional)

Build this only when `decision.fallback == build` (T6 failed its thresholds). This is the guide's fallback (Alternatives considered; Go/no-go 1). The entity risk rule switches to Logout and revoke tokens in P10-T6. This flow starts on the User Risk Detected event, applies the same conditions as the rule (escalation to High, member of `POC-ITP-Test`, not the connection account), and calls the dispatcher.

Sources: [User Risk Detected](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/events/userriskdetected.htm), [List functions](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/functions.htm).

Create the flow in folder `POC-ITP-FBM` and name it `POC-ITP FBM – Risk Detected (fallback)`.

**C1 Okta ITP – User Risk Detected** (event, connection `POC-Okta ITP`).

**C2 Continue If**: ← C1.Risk Level, equal to, `HIGH`. Message `Not high`.

**C3 Continue If**: ← C1.Previous Level, not equal to, `HIGH`. Message `Not an escalation`.

**C4 Continue If**: ← C1 Okta User > ID, not equal to, `<OKTA_WF_CONNECTION_USER_ID>`. Message `Connection account`.

**C5 Text – Concatenate**: `/api/v1/users/`, ← C1 Okta User > ID, `/groups`.

**C6 Okta – Custom API Action** (`POC-Okta`): `GET`, Relative URL ← C5.

**C7 List – Pluck**: list ← C6.Body; key `id`. Output `group ids`.

**C8 List – Includes**: list ← C7.group ids; value `<poc_group_id>`. Output `in scope`.

**C9 Continue If**: ← C8.in scope, equal to, `true`. Message `Not in POC-ITP-Test`.

**C10 Date & Time – Now**.

**C11 Tables – Create Row** (Results):
- Time ← C10
- User ID ← C1 Okta User > ID
- App name `Fallback trigger`
- Status code `0`
- Outcome `started`

**C12 Flow Control – Call Flow**: `POC-FBM Logout – Dispatcher`, User ID ← C1 Okta User > ID.

Save, then turn the flow **ON**.

## Checklist

- [ ] C1 event from `POC-Okta ITP`
- [ ] C2–C4 and C9 guards present with real values
- [ ] C12 calls the Dispatcher
- [ ] Flow is ON. With Per App, Dispatcher, Respond, and Respond by Email this makes 5 active flows: the Starter limit.
