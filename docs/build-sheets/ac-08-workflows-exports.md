# ac-08 Workflows exports and execution history (P8-T5, P9-T5, P11-T1)

Sources: [Create a table (Export)](https://help.okta.com/wf/en-us/Content/Topics/Workflows/build/create-table.htm), [Workflows system limits (history kept 30 days)](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm), [Export and import flows](https://help.okta.com/wf/en-us/content/topics/workflows/build/export-import-flows.htm).

## §1 Export the tables and the folder

Workflows console > folder `POC-ITP-FBM` > **Tables**:

1. Open `POC-FBM Logout Results`, click **Export**, and save the CSV to `reports/data/results-export.csv` in the repo.
2. Open `POC-Respond Probe`, click **Export**, and save the CSV to `reports/data/probe-export.csv`.
3. Export the whole folder for a redeploy ([wf-card-reference.md](wf-card-reference.md) SCR-14). On the **Flows** page, select folder `POC-ITP-FBM`, open its **Actions** dropdown, and select **Export**. In the **Export folder** dialog, choose **Export the entire folder tree**, click **Export**, then click **Download**. Save the file as `reports/data/POC-ITP-FBM.folder`. The export keeps the flows and table columns but drops all connection information and table data, and no card holds a secret, so the file holds none.

Don't edit the files. Tell the executor "exported".

## §2 Check for stuck executions (T7)

For each of `POC-ITP FBM – Respond`, `POC-FBM Logout – Dispatcher`, and `POC-FBM Logout – Per App`, open the flow's **Execution History** and set the status filter to **In Progress** ([View flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-view.htm)). Look at executions since the burst started. Report **yes** if none is in progress, otherwise **no** with the count.
