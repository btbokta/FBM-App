# wf-03 POC-ITP FBM – Respond (P6-T5, P7-T4, P10-T1)

This flow is the guide's `ITP FBM – Respond` (guide Step 4), the delegated flow that ITP's entity risk rule, session protection, and the SOC all run. Every card name and label is in the ledger, [wf-card-reference.md](wf-card-reference.md).

You build it in up to three passes:
- **Part A** (P6-T5): a probe that only records what the Delegated Flow card receives. It logs no one out.
- **Part B** (P7-T4): adds the logout cards, once the probe shows how ITP passes the user (U1).
- **Part C** (P10-T1, conditional): adds the risk reset.

## Flow settings

| Setting | Value |
| --- | --- |
| Folder | `POC-ITP-FBM` |
| Flow name | `POC-ITP FBM – Respond` (en dash) |
| Kind | Delegated flow: its event card is Delegated Flow [EVT-2]. ITP supports only delegated flows |
| Save all data that passes through the flow | On. ac-04 and ac-06 ask you to read the Global Token Revocation status from its executions [SCR-6] |
| Turn on | At the end of Part A. Okta's ITP steps turn the flow on before a rule uses it [EVT-2], and the Run button works only while it's on [SCR-11]. Whether ITP lists a flow that's off is U2 |

Leave every card's gear > **Error handling** at its defaults [SCR-10].

## Part A: probe version (P6-T5)

1. Open folder `POC-ITP-FBM` and click **+ New Flow** [SCR-5]. Don't rename it with the pencil icon; the first Save names it.
2. Build C1–C4.
3. Click **Save** [SCR-5, SCR-6]. In the **Save flow** dialog:
   - Type the name `POC-ITP FBM – Respond`.
   - Turn on **Save all data that passes through the flow** (**Save All Data**).
   - Click **Save**.
4. Work through the Part A checklist. Then click the activation control at the top of the flow builder: **Flow is OFF**. Okta's save-data page calls it the **Flow Activation** button [SCR-6, SCR-7]. Make sure **Save all data that passes through the flow** is on, then switch the flow ON. It should now show ON and **Saving data**. ⚠ UNVERIFIED that this is one control. If you find two, turn on saving with the Flow Activation button, and switch ON with the Flow is OFF toggle.

### C1 Delegated Flow (event) [EVT-2]

Click **Add Event** > **Delegated Flow**; it's in the Built-in triggers section. Under **Inputs**, create one field: `User ID`, type Text. Leave User Context and Context as they are; the card fills them.

### C2 Date & Time – Now [FN-16]

The output you use is **date**.

### C3 Tables – Create Row [FN-23]

**Choose Table** > select `POC-Respond Probe` > **Choose**, then **Save** on the card. Check all seven columns, then **Save** [FN-23].

| Column | Value |
| --- | --- |
| Time | ← C2.date |
| Input User ID | ← C1.Inputs > User ID |
| Okta User ID | ← C1.User Context > Okta User ID |
| Caller ID | ← C1.Context > Caller > ID |
| Caller Type | ← C1.Context > Caller > Type |
| Caller Display Name | ← C1.Context > Caller > Display Name |
| Caller Alternate ID | ← C1.Context > Caller > Alternate ID |

⚠ UNVERIFIED: whether the card lets you drag Caller's sub-fields one by one [EVT-2]. If it shows Caller only as a single object, stop and tell the executor.

### C4 Branching – Continue If [FN-7]: connection-account guard on the typed ID

- **value a** ← C1.Inputs > User ID
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Refusing to act on the Workflows connection account`

The probe changes no user. C4 is here so the flow already refuses the connection account before Part B adds the logout cards after it.

### Checklist (Part A)

- [ ] `POC-ITP FBM – Respond` is in folder `POC-ITP-FBM`. It has C1–C4, its Flow Activation button reads **Saving data**, and it's ON.
- [ ] C1 has one input, `User ID` (Text).
- [ ] C3 writes all seven Probe columns.
- [ ] C4 has the real connection-account user ID.

### Report to the executor (Part A)

- The full browser URL of the open flow. The executor needs the flow's ID for the entity risk rule, which takes a number (U5, U3). Okta's KB shows flow URLs as `…/app/flows/<ID>` with a 26-character letters-and-digits ID [KB-2]. **If the part after `/flows/` isn't all digits, say so plainly.**
- Confirmation that the flow is ON and saving data.

## Choosing the outcome (P7-T3)

ac-05 gives you three Probe rows:
- **ITP**: written when the entity risk rule ran the flow for user02.
- **Manual, empty**: you ran it from Delegated flows with User ID blank.
- **Manual, with ID**: you ran it with user02's ID.

| Outcome | When the rows look like this | Target user (C5) | Manual-run guard |
| --- | --- | --- | --- |
| **A** | ITP row: Input User ID = user02's ID | Input User ID | C6: the target must not be empty |
| **B** | ITP row: Input User ID empty, Okta User ID = user02's ID, Caller ID not empty. Manual-empty row: Caller ID empty | Input User ID if Caller ID is empty, else Okta User ID | C6: the target must not be empty |
| **C1** | ITP row: user02's ID appears only in Okta User ID, and Caller ID looks the same as in the manual rows | Okta User ID | Respond is removed from the SOC resource set (`POC_SOC_INCLUDE_RESPOND=false`), and the SOC uses Respond by Email |
| **C2** | user02's ID appears in no field of the ITP row | — | Blocked: the executor proposes a plan change |

## Part B: logout cards (P7-T4)

Keep C1–C4 unchanged; the Probe row is still written on every run. Add C5 for your outcome, then the common cards C6–C12, all at the top level of the flow. Save; the flow stays ON.

### C5 for outcome A: Flow Control – Assign [FN-3]

Create one input: `target user id`, type Text, value ← C1.Inputs > User ID.

### C5 for outcome B: Branching – Assign If [FN-9]

- **value a** ← C1.Context > Caller > ID
- **comparison**: `is empty`
- **value b**: leave empty; it's ignored
- **value if true** ← C1.Inputs > User ID
- **value if false** ← C1.User Context > Okta User ID
- **output**: set the type to Text.

### C5 for outcome C1: Flow Control – Assign

Create one input: `target user id`, type Text, value ← C1.User Context > Okta User ID.

Under outcome C1, never run Respond by hand: the target would be whoever runs it. C7 refuses the connection account, but it can't protect other admins.

From here on, **C5 target** means C5.target user id under outcomes A and C1, and C5.output under outcome B.

### C6 Branching – Continue If: refuse an empty target

- **value a** ← C5 target
- **comparison**: `is not empty`
- **message**: `No target user ID. Manual runs must enter a User ID`

### C7 Branching – Continue If: connection-account guard on the target

- **value a** ← C5 target
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Refusing to act on the Workflows connection account`

### C8 Error Handling – If Error [FN-10]

- **Try** section:
  - **C8.1 Okta ITP – Global Token Revocation** [ACT-1]
    - **Connection**: `POC-Okta ITP`
    - **User > ID** ← C5 target. This is the `opaque` format.
    - ⚠ UNVERIFIED: how the card asks for the format [ACT-1]. If it offers a format or protocol choice, choose the one with the ID field (`opaque`). If ISS or SUB still show as required, stop and tell the executor.
- **If Error** section:
  - **C8.2 Flow Control – Assign**: create `gtr error status`, type Number, value `0`.
- **View Outputs** on C8: add `gtr status`, type Number.
  - Try field ← C8.1.Status Code
  - If Error field ← C8.2.gtr error status

Anything but 204 is logged as a failure in C11, and the flow still goes on to the dispatcher (guide Step 4.3).

### C9 Date & Time – Now

### C10 Branching – Lookup [FN-8]

- **Value** ← C8.gtr status. ⚠ UNVERIFIED: the Number-to-text conversion into Value, as in wf-01 C9 [FN-8].
- One row: `204` → `success`.
- **Otherwise Result Is**: `failure`.

### C11 Tables – Create Row

**Choose Table** > select `POC-FBM Logout Results` > **Choose**, then **Save** on the card. Check all five columns, then **Save** [FN-23].

| Column | Value |
| --- | --- |
| Time | ← C9.date |
| User ID | ← C5 target |
| App name | `Okta GTR` |
| Status code | ← C8.gtr status |
| Outcome | ← C10.Result |

### C12 Flow Control – Call Flow [FN-1]

- **Helper Flow**: **Choose Flow** > `POC-FBM Logout – Dispatcher`
- **With these inputs**: `User ID` ← C5 target
- Create no outputs; the dispatcher returns nothing.

### Checklist (Part B)

- [ ] C1–C4 are unchanged.
- [ ] C5 matches the outcome the executor recorded as finding `probe.outcome`.
- [ ] C6 and C7 are top-level cards before C8, and C7 has the real connection-account user ID.
- [ ] C8.1 uses `POC-Okta ITP` and maps only User > ID, from C5 target.
- [ ] C11 writes App name `Okta GTR`, and C12 calls `POC-FBM Logout – Dispatcher`.
- [ ] The flow is saved, still saving data, and ON.

### Report to the executor (Part B)

- The outcome you built, and that the checklist passes.
- Anything that differed from this sheet, with the exact labels.

## Part C: risk reset (P10-T1, conditional on `decision.riskReset == add`)

Add after C12, at the top level:

### C13 Okta ITP – Upsert User Risk [ACT-2]

- **Connection**: `POC-Okta ITP`
- **User > ID** ← C5 target
- **Risk Level**: `Low`

### C14 Date & Time – Now

### C15 Tables – Create Row

**Choose Table** > select `POC-FBM Logout Results` > **Choose**, then **Save** on the card. Check all five columns, then **Save** [FN-23].

| Column | Value |
| --- | --- |
| Time | ← C14.date |
| User ID | ← C5 target |
| App name | `Okta risk reset` |
| Status code | `0` |
| Outcome | ← C13.User > Risk Level |

Checklist: C13–C15 come after C12, and the flow is saved and ON. Report: "C13–C15 added".
