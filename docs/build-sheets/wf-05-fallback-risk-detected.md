# wf-05 POC-ITP FBM – Risk Detected (fallback) (P10-T5, conditional)

Build this only when `decision.fallback == build`, meaning T6 failed its thresholds. This is the guide's fallback (Alternatives considered; Go/no-go 1). In P10-T6 the entity risk rule switches to Logout and revoke tokens, and this flow handles the FBM apps.

The flow starts on the User Risk Detected event. It applies the same conditions as the rule: an escalation to High, a member of `POC-ITP-Test`, and not the connection account. Then it calls the dispatcher. Every card name and label is in the ledger, [wf-card-reference.md](wf-card-reference.md).

## Flow settings

| Setting | Value |
| --- | --- |
| Folder | `POC-ITP-FBM` |
| Flow name | `POC-ITP FBM – Risk Detected (fallback)` (en dash) |
| Kind | Event flow, started by Okta ITP – User Risk Detected [EVT-3]. Not helper, not delegated |
| Save all data that passes through the flow | On, for debugging P10-T7 [SCR-6] |
| Turn on | After the checklist. `POC-FBM Logout – Dispatcher` must already be ON. With Per App, Dispatcher, Respond, and Respond by Email, this makes **5 active flows, the Starter limit** [LIM-1] |

## Build

1. Open folder `POC-ITP-FBM` and click **+ New Flow** [SCR-5]. Don't rename it with the pencil icon; the first Save names it.
2. Build C1–C14, all at the top level.
3. Click **Save** [SCR-5, SCR-6]. In the **Save flow** dialog:
   - Type the name `POC-ITP FBM – Risk Detected (fallback)`.
   - Turn on **Save all data that passes through the flow** (**Save All Data**).
   - Click **Save**.

   Check that the **Flow Activation** button reads **Saving data**. If it reads Not saving data, open it and turn the option on.
4. Work through the checklist, then switch **Flow is OFF** to ON [SCR-7].

Leave every card's gear > **Error handling** at its defaults [SCR-10].

### C1 Okta ITP – User Risk Detected (event) [EVT-3]

Click **Add Event** > **Okta ITP** > **User Risk Detected**, with connection `POC-Okta ITP`.

If the card shows a connection or scope warning, stop and tell the executor. The event may need a scope that isn't granted in the Okta Workflows OAuth app [EVT-3], and changing that app needs approval.

### C2 Branching – Continue If [FN-7]: only High

- **value a** ← C1.Risk > Level
- **comparison**: `equal to`
- **value b**: `HIGH` (uppercase, as the event sends it)
- **message**: `Not high`

### C3 Branching – Continue If: only escalations

- **value a** ← C1.Risk > Previous Level
- **comparison**: `not equal to`
- **value b**: `HIGH`
- **message**: `Not an escalation`

### C4 Branching – Continue If: connection-account guard

- **value a** ← C1.Okta User > ID
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Connection account`

### C5 Text – Concatenate [FN-13]

- **text 1**: `/api/v1/users/`
- **text 2** ← C1.Okta User > ID
- **text 3**: `/groups`

### C6 Okta – Custom API Action [ACT-4]

- **Connection**: `POC-Okta`
- **Request Type**: `GET`
- **Relative URL** ← C5.output

Its **Body** is the user's groups as a JSON array [API-2], typed Object.

### C7 JSON – Stringify [FN-18]

- **object** ← C6.Body

### C8 JSON – Parse [FN-17]

- **string** ← C7.output
- **output**: set the type to **List of Objects**.

### C9 List – Pluck [FN-20]

- **list** ← C8.output
- **key**: `id`
- **values**: set the type to **List of Text**.

### C10 List – Includes [FN-21]

- **list** ← C9.values
- **value**: `<poc_group_id>` (Text)

### C11 Branching – Continue If: only POC-ITP-Test members

- **value a** ← C10.result
- **comparison**: `equal to`
- **value b**: `true`, with its type set to True/False
- **message**: `Not in POC-ITP-Test`

### C12 Date & Time – Now [FN-16]

### C13 Tables – Create Row [FN-23]

**Choose Table**: `POC-FBM Logout Results`. Check all five columns, then **Save**.

| Column | Value |
| --- | --- |
| Time | ← C12.date |
| User ID | ← C1.Okta User > ID |
| App name | `Fallback trigger` |
| Status code | `0` |
| Outcome | `started` |

### C14 Flow Control – Call Flow [FN-1]

- **Helper Flow**: **Choose Flow** > `POC-FBM Logout – Dispatcher`
- **With these inputs**: `User ID` ← C1.Okta User > ID
- Create no outputs.

## Checklist

- [ ] `POC-ITP FBM – Risk Detected (fallback)` is in folder `POC-ITP-FBM`. It has C1–C14 at the top level, saves data, and is ON.
- [ ] C1 is the Okta ITP User Risk Detected event, with `POC-Okta ITP`.
- [ ] The guards C2, C3, C4, and C11 come before C14. C4 has the real connection-account user ID, and C10 has the real `POC-ITP-Test` group ID.
- [ ] C14 calls `POC-FBM Logout – Dispatcher`.
- [ ] The Workflows Console shows 5 flows ON in total.

## Report to the executor

- The flow is ON and saving data, and the number of flows now ON in the org.
- Any warning on C1.
- Anything that differed from this sheet, with the exact labels.
