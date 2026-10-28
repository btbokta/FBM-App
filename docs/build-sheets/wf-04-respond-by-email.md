# wf-04 POC-ITP FBM – Respond by Email (P7-T4)

This flow is the guide's `ITP FBM – Respond by Email` (guide Step 6, the optional email wrapper). It's a delegated flow for SOC analysts who would rather enter an email address than an Okta user ID. Every card name and label is in the ledger, [wf-card-reference.md](wf-card-reference.md).

**Reusable or test only:** optional, as in the guide. Keep it if the POC recommends it (D-EMAIL), and always under probe outcome C1, where it's the SOC's only manual route. See [reusable-workflow.md](../reusable-workflow.md).

## Flow settings

| Setting | Value |
| --- | --- |
| Folder | `POC-ITP-FBM` |
| Flow name | `POC-ITP FBM – Respond by Email` (en dash) |
| Kind | Delegated flow: its event card is Delegated Flow [EVT-2] |
| Save all data that passes through the flow | On. ac-06 asks for this flow's Global Token Revocation status [SCR-6] |
| Turn on | After the checklist. `POC-FBM Logout – Dispatcher` must already be ON |

## Build

1. Open folder `POC-ITP-FBM` and click **+ New Flow** [SCR-5]. Don't rename it with the pencil icon; the first Save names it.
2. Build C1–C9, all at the top level.
3. Click **Save** [SCR-5, SCR-6]. In the **Save flow** dialog:
   - Type the name `POC-ITP FBM – Respond by Email`.
   - Turn on **Save all data that passes through the flow** (**Save All Data**).
   - Click **Save**.
4. Work through the checklist. Then click the activation control at the top of the flow builder: **Flow is OFF**. Okta's save-data page calls it the **Flow Activation** button [SCR-6, SCR-7]. Make sure **Save all data that passes through the flow** is on, then switch the flow ON. It should now show ON and **Saving data**. ⚠ UNVERIFIED that this is one control. If you find two, turn on saving with the Flow Activation button, and switch ON with the Flow is OFF toggle.

Leave every card's gear > **Error handling** at its defaults [SCR-10].

### C1 Delegated Flow (event) [EVT-2]

Click **Add Event** > **Delegated Flow**. Under **Inputs**, create one field: `Email`, type Text.

### C2 Branching – Continue If [FN-7]

- **value a** ← C1.Inputs > Email
- **comparison**: `is not empty`
- **message**: `Email is required`

### C3 Okta – Read User [ACT-3]

- **Connection**: `POC-Okta`
- **ID or Login** ← C1.Inputs > Email
- The output you use is **System Properties > ID**.
- If the card shows an **Attributes** list when you add it, select nothing extra and click **Done**. The ID is a system property. ⚠ UNVERIFIED: what the list offers [ACT-3].

POC users' login equals their email (U27, settled by P8-T4 T4b). An email that matches no user makes the card fail, and the flow stops before C5.

### C4 Branching – Continue If: connection-account guard

- **value a** ← C3.System Properties > ID
- **comparison**: `not equal to`
- **value b**: `<OKTA_WF_CONNECTION_USER_ID>`
- **message**: `Refusing to act on the Workflows connection account`

### C5 Error Handling – If Error [FN-10]

- **Try** section:
  - **C5.1 Okta ITP – Global Token Revocation** [ACT-1]
    - **Connection**: `POC-Okta ITP`
    - **User > ID** ← C3.System Properties > ID. This is the `opaque` format.
    - ⚠ UNVERIFIED: how the card asks for the format [ACT-1]. If it offers a format or protocol choice, choose the one with the ID field (`opaque`). If ISS or SUB still show as required, stop and tell the executor.
- **If Error** section:
  - **C5.2 Flow Control – Assign** [FN-3]: create `gtr error status`, type Number, value `0`.
- **View Outputs** on C5: add `gtr status`, type Number.
  - Try field ← C5.1.Status Code
  - If Error field ← C5.2.gtr error status

### C6 Date & Time – Now [FN-16]

### C7 Branching – Lookup [FN-8]

- **Value** ← C5.gtr status. ⚠ UNVERIFIED: the Number-to-text conversion into Value, as in wf-01 C9 [FN-8].
- One row: `204` → `success`.
- **Otherwise Result Is**: `failure`.

### C8 Tables – Create Row [FN-23]

**Choose Table** > select `POC-FBM Logout Results` > **Choose**, then **Save** on the card. Check all five columns, then **Save** [FN-23].

| Column | Value |
| --- | --- |
| Time | ← C6.date |
| User ID | ← C3.System Properties > ID |
| App name | `Okta GTR` |
| Status code | ← C5.gtr status |
| Outcome | ← C7.Result |

### C9 Flow Control – Call Flow [FN-1]

- **Helper Flow**: **Choose Flow** > `POC-FBM Logout – Dispatcher`
- **With these inputs**: `User ID` ← C3.System Properties > ID
- Create no outputs.

## Checklist

- [ ] `POC-ITP FBM – Respond by Email` is in folder `POC-ITP-FBM`. It has C1–C9 at the top level, saves data, and is ON.
- [ ] C1 has one input, `Email` (Text).
- [ ] C4 comes before C5 and has the real connection-account user ID.
- [ ] C3 uses `POC-Okta`, and C5.1 uses `POC-Okta ITP`.
- [ ] C9 calls `POC-FBM Logout – Dispatcher` with User ID from C3.

## Report to the executor

- The full browser URL of the open flow. The executor sets `WF_RESPOND_BY_EMAIL_FLOW_ID` from the part after `/flows/`. **If that part isn't all digits, say so plainly** (U5; see wf-03 Part A).
- Confirmation that the flow is ON and saving data.
- Anything that differed from this sheet, with the exact labels.
