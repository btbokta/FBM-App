# ac-05 Entity risk rule check and probe readout (P7-T3)

Before this sheet, the executor has created rule `POC-ITP-High-Risk` (P7-T1) and run the probe (P7-T2), which raised `poc-itp-user02` to High. User02's Okta ID is `<user02 id>`.

Sources: [Add an entity risk policy rule](https://help.okta.com/oie/en-us/content/topics/itp/add-entity-risk-policy-rule.htm), [Run a delegated flow](https://help.okta.com/oie/en-us/content/Topics/automation-hooks/delegated-flows/run-delegated-flow.htm).

## 1. Check the rule in the Admin Console

**Security > Entity Risk Policy**. Rule `POC-ITP-High-Risk` should be first, above the catch-all, with:
- **User's group membership includes**: `POC-ITP-Test`; your connection account excluded.
- **Entity Risk Level**: High.
- **Take this action**: Run a Workflow; **Workflow triggered by action**: `POC-ITP FBM – Respond`.

Report whether each matches. Also open the **Workflow triggered by action** list (then cancel without saving) and report whether `POC-ITP FBM – Respond` was offered (U2).

## 2. Read the ITP probe row

Workflows console > folder `POC-ITP-FBM` > Tables > `POC-Respond Probe`. Copy the newest row's values for every column into chat. User IDs aren't secrets. This is the **ITP** row.

## 3. Two manual runs

These are safe because the flow is still the probe version and logs no one out.

1. Admin Console > **Workflows > Delegated flows** > **Run** next to `POC-ITP FBM – Respond`.
2. Leave **User ID** blank and click **Run**. This is the **Manual, empty** row.
3. **Run** again with **User ID** = `<user02 id>`. This is the **Manual, with ID** row.
4. Copy both new Probe rows into chat.

The executor uses wf-03's outcome table to choose A, B, C1, or C2.

## Contingency for P7-T1 (only on an approved plan change)

If Terraform can't set the rule's workflow:

1. Delete the half-created rule if one exists.
2. Click **Add Rule** and fill in:
   - Rule Name `POC-ITP-High-Risk`
   - User's group membership includes: at least one of `POC-ITP-Test`
   - Exclude users: your connection account
   - Detection: Any
   - Entity Risk Level: High
   - Take this action: Run a Workflow > `POC-ITP FBM – Respond`
3. Save, then drag the rule to the top.
4. Tell the executor. It reads the rule ID by API and runs `terraform import` so teardown still removes it.
