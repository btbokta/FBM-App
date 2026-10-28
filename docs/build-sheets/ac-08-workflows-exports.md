# ac-08 Workflows exports and execution history (P8-T5, P9-T5, P11-T1)

Sources: [Create a table (Export)](https://help.okta.com/wf/en-us/Content/Topics/Workflows/build/create-table.htm), [Workflows system limits (history kept 30 days)](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm).

## §1 Export the tables

Workflows console > folder `POC-ITP-FBM` > **Tables**:

1. Open `POC-FBM Logout Results`, click **Export**, and save the CSV to `reports/data/results-export.csv` in the repo.
2. Open `POC-Respond Probe`, click **Export**, and save the CSV to `reports/data/probe-export.csv`.

Don't edit the files. Tell the executor "exported".

## §2 Check for stuck executions (T7)

For each of `POC-ITP FBM – Respond`, `POC-FBM Logout – Dispatcher`, and `POC-FBM Logout – Per App`, open the flow's **Execution History** and set the status filter to **In Progress** ([View flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-view.htm)). Look at executions since the burst started. Report **yes** if none is in progress, otherwise **no** with the count.
