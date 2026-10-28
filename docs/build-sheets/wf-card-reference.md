# Workflows card reference (ledger)

Every card, event, connector action, connection type, console screen, and platform behavior that the wf-00 to wf-05 sheets rely on. A sheet may use only entries listed here; the sheets cite them by ID in square brackets, for example [FN-7].

- **Checked:** every page below was fetched on 2026-10-27, in this session, and read as raw page text in a browser. developer.okta.com pages render with JavaScript, so they were read in the same browser after the plain fetcher returned only their titles.
- **Labels** are recorded exactly as the page shows them, including capitalization. Behavior is paraphrased, not quoted.
- **Source rank:** (1) help.okta.com, (2) developer.okta.com, (3) support.okta.com KB articles, (4) Okta forums, for corroboration only and labeled as such.
- **`⚠ UNVERIFIED:`** marks a claim that no fetched page settles. Each one names the U-ID or PLAN task that settles it, or is listed in [wf-verification-report.md](wf-verification-report.md).
- Pages that didn't load: `.../tables/stash_searchrows.htm` (404; the current page is `stash_searchrows2.htm`), `.../oktaitp/overviews/scopes.htm` (404; no scope list for the Okta ITP connector was found), and `.../topics/workflows-elements.htm` (404; the correct path is `.../topics/workflows/workflows-elements.htm`).

## Index

| ID | Entry | Where in the console | Status |
| --- | --- | --- | --- |
| SCR-1 | Workflows Console | Admin Console > Workflow > Workflows console | ✅ |
| SCR-2 | Create a top-level folder | Flows page > **+** in the side navigation panel | ✅ |
| SCR-3 | Tables tab: new table, columns, Import, Export | Folder > Tables tab | ✅ |
| SCR-4 | Connections: folder-level and org-level | Folder > Connections tab; Connections page | ✅ |
| SCR-5 | New flow, Add Event, Add function, name, Save | Folder > + New Flow | ✅ |
| SCR-6 | Save all data that passes through the flow | Save flow dialog; Flow Activation button | ✅ |
| SCR-7 | Flow is OFF / ON | Flow builder toolbar | ✅ |
| SCR-8 | Run (Run Flow window), Run this card, Choose Flow dialog | Flow builder | ✅ |
| SCR-9 | Execution History | Flow builder > Execution History | ✅ |
| SCR-10 | Card error handling (gear > Error handling) | Any card's gear icon | ✅ |
| SCR-11 | Delegated flows page (Run flow dialog) | Admin Console > Workflows > Delegated flows | ✅ |
| SCR-12 | Okta Workflows OAuth app: Client ID and Client secret | Admin Console > Applications and Resources > Applications | ✅ |
| SCR-13 | Fields, types, mapping, custom fields | Every card | ✅ |
| CON-1 | Okta connection | New Connection > Okta | ✅ |
| CON-2 | Okta ITP connection | New Connection > Okta ITP | ✅ |
| CON-3 | API Connector connection: None, Basic, Custom Header | New Connection > API Connector, or a card's + New Connection | ✅ with ⚠ |
| EVT-1 | Helper Flow | Add Event > Helper Flow | ✅ with ⚠ |
| EVT-2 | Delegated Flow | Add event > Delegated Flow | ✅ with ⚠ (U1) |
| EVT-3 | Okta ITP – User Risk Detected | Add Event > Okta ITP > User Risk Detected | ✅ |
| ACT-1 | Okta ITP – Global Token Revocation | Add app action > Okta ITP | ✅ with ⚠ |
| ACT-2 | Okta ITP – Upsert User Risk | Add app action > Okta ITP | ✅ |
| ACT-3 | Okta – Read User | Add app action > Okta | ✅ |
| ACT-4 | Okta – Custom API Action | Add app action > Okta | ✅ with ⚠ |
| FN-1 | Flow Control – Call Flow | Add function > Flow Control | ✅ |
| FN-2 | Flow Control – Return | Add function > Flow Control | ✅ |
| FN-3 | Flow Control – Assign | Add function > Flow Control | ✅ |
| FN-4 | Flow Control – Wait For | Add function > Flow Control | ✅ |
| FN-5 | Branching – If/Else | Add function > Branching | ✅ |
| FN-6 | Branching – If/ElseIf | Add function > Branching | ✅ |
| FN-7 | Branching – Continue If | Add function > Branching | ✅ |
| FN-8 | Branching – Lookup | Add function > Branching | ✅ |
| FN-9 | Branching – Assign If | Add function > Branching | ✅ |
| FN-10 | Error Handling – If Error | Add function > Error Handling | ✅ with ⚠ (U6) |
| FN-11 | Object – Get | Add function > Object | ✅ with ⚠ |
| FN-12 | Object – Construct | Add function > Object | ✅ |
| FN-13 | Text – Concatenate | Add function > Text | ✅ |
| FN-14 | Number – Add | Add function > Number | ✅ |
| FN-15 | Number – Multiply | Add function > Number | ✅ |
| FN-16 | Date & Time – Now | Add function > Date & Time | ✅ |
| FN-17 | JSON – Parse | Add function > JSON | ✅ |
| FN-18 | JSON – Stringify | Add function > JSON | ✅ |
| FN-19 | List – For Each | Add function > List | ✅ |
| FN-20 | List – Pluck | Add function > List | ✅ |
| FN-21 | List – Includes | Add function > List | ✅ |
| FN-22 | Tables – Search Rows | Add function > Tables | ✅ with ⚠ (U7) |
| FN-23 | Tables – Create Row | Add function > Tables | ✅ |
| FN-24 | API Connector – Raw Request | Add function > API Connector | ✅ with ⚠ (U6) |
| LIM-1 | Active-flow limit | Platform | ✅ |
| LIM-2 | Recursion limit | Platform | ✅ |
| LIM-3 | History, payload, and table limits | Platform | ✅ |
| LIM-4 | Okta connector rate limits | Platform | ✅ |
| LIM-5 | Return and Continue If inside containers | Platform | ✅ |
| LIM-6 | Card timeouts, type errors, and flows that won't turn on | Platform | ✅ |
| API-1 | `GET /api/v1/users/{id}` | Okta Management API | ✅ |
| API-2 | `GET /api/v1/users/{id}/groups` | Okta Management API | ✅ |
| API-3 | `DELETE /api/v1/users/{userId}/sessions` | Okta Management API | ✅ |
| API-4 | `GET /api/v1/users/{userId}/clients` | Okta Management API | ✅ |
| API-5 | `DELETE /api/v1/users/{userId}/clients/{clientId}/tokens` | Okta Management API | ✅ |
| API-6 | Scopes the Okta connector cards need | Okta Workflows OAuth app | ✅ |
| API-7 | `POST /oauth2/v1/global-token-revocation` and its scope | Okta OAuth API | ✅ |
| API-8 | `PUT /api/v1/users/{userId}/risk` and its scope | Okta Management API | ✅ |
| KB-1 to KB-7 | Support articles used as corroboration | — | ✅ |

## Console screens and flow settings

### SCR-1 Workflows Console
- **Where:** Admin Console > **Workflow** > **Workflows console**. The menu reads "Workflow" on the build page and "Workflows" on the delegated-flow page; it's the same menu.
- **Behavior relied on:**
  - The console opens on the **Home** page. Its links go to **Flows** (folders, flows, tables) and **Connections**.
  - Home's **Usage and plan limits** dashboard shows how many flows are active.
  - To open the console, a user must have the **Okta Workflows** app assigned by a super admin. This is a different app from Okta Workflows OAuth.
- **Sources:** [Workflows Console](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-workflowsconsole.htm), [Build and test a flow](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-build-a-flow.htm)

### SCR-2 Create a top-level folder
- **Where:** Flows page > the **+** button in the side navigation panel > **Create new folder** dialog.
- **Fields:** a name (required) and a description (optional). Then **Save**.
- **Behavior relied on:**
  - Deleting a folder deletes its flows and tables.
  - Before deleting, turn off every flow in it, helper flows included, then type the folder name to confirm.
- **Source:** [Folders and subfolders](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-folders.htm)

### SCR-3 Tables tab
- **Where:** a folder's **Tables** tab > **+ New Table** (top right).
- **Fields:** a table name (default `Unnamed`) and a description. **+ New Column** adds a column; its type is one of `String`, `Number`, `Date`, `Boolean`, `Counter`. The gear icon next to a column edits it.
- **Import:** **Import** > **Import Data** dialog > drag a CSV in, or **Choose CSV File** > map each CSV field to a table column (a column with the same name is the default suggestion) > **Import**.
- **Export:** **Export** creates a CSV of the table's data.
- **Behavior relied on:**
  - To add or edit a record, click in the row and type.
  - Fields marked `(Auto)`, such as the row ID and creation date, are generated.
  - Changes save immediately.
- **Sources:** [Create and edit a table](https://help.okta.com/wf/en-us/content/topics/workflows/build/create-table.htm), [Import data from a CSV file](https://help.okta.com/wf/en-us/content/topics/workflows/build/import-from-csv.htm)

### SCR-4 Connections: org-level and folder-level
- **Org-level (the sheets' route):** Workflows Console **Connections** page > **New Connection** > click the connector's icon > fill in the connection > **Folder Access (optional)**: select the folders that may use it.
  - An org-level connection can't be used until it's added to a folder.
  - On the Connections page, **Open** next to a connector, then **Assign Folders**, adds an existing connection to a folder later.
  - The Okta and Okta ITP authorization pages also start from the Connections page.
- **Folder-level:** Flows page > select the folder > **Connections** tab > **New Connection**. Only flows in that folder can use these connections.
- ⚠ UNVERIFIED: whether a folder has a Connections tab at all. The Configure a connection page documents one, but the "Flows and tables" page says a folder shows only two tabs, Flows and Tables. The sheets use the org-level route, which works either way.
- **The Connections page** (marked Beta release):
  - Its columns are Application, Name, Description, Created by, Created on, Level, and **Folder Access**, which shows the *number* of folders.
  - There's no health column. A **Test connection** icon next to each connection tests it.
  - **Open** > **Actions** offers Edit details, Usage, Reauthorize, and Delete connection.
- **On a card:**
  - The connection name shows at the top of the card; click it to change the connection.
  - A red icon means the connection isn't working or options are missing; a green check means it's healthy.
  - When you first add a card, the connection you last used for that app is preselected.
- **Sources:** [Configure a connection](https://help.okta.com/wf/en-us/content/topics/workflows/build/configure-connection.htm), [Connections](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-applications-connections.htm), [Connections page](https://help.okta.com/wf/en-us/content/topics/workflows/build/view-connections-page.htm), [Flows and tables](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-folder-view.htm), [Okta connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/authorization.htm)

### SCR-5 New flow, naming, saving
- **Where:** in a folder, **+ New Flow**.
- **Building:**
  - In the first card, **Add Event**.
  - Later cards are added with **Add app action** or **Add function**. The help tutorial's path for a second card is **Add Another > Function > Text > Compose**.
  - Cards inside a branch or section are added the same way as in the flow.
- **Name:** if the flow has no name yet, clicking **Save** lets you name it there. In Okta's tutorial, that naming step is also where you select **Save All Data**, then click **Save** [SCR-6]. The pencil icon beside the flow name (default `Unnamed`) edits the flow's properties instead. The sheets don't use the pencil, so the first Save still asks for a name.
- **Save:** the **Save** button at the top of the flow builder, or Ctrl+S / ⌘+S.
- **Sources:** [Build and test a flow](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-build-a-flow.htm), [Build a user creation flow (tutorial)](https://help.okta.com/wf/en-us/content/topics/workflows/tutorials/timebasedactions-walkthrough/build-user-creation-flow.htm), [Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm), [Cards in flows](https://help.okta.com/wf/en-us/Content/Topics/Workflows/learn/about-cards.htm), [Add a helper flow (tutorial)](https://help.okta.com/wf/en-us/content/topics/workflows/Tutorials/processjson-walkthrough/add-helper-flow.htm)

### SCR-6 Save all data that passes through the flow
- **New flow:** in the **Save flow** dialog, turn on **Save all data that passes through the flow**. The tutorial calls it **Save All Data** in the same dialog where you name the flow.
- **Existing flow:** open the flow options with the **Flow Activation** button on the navigation bar and toggle the same option. The button then reads **Saving data** (or **Not saving data**). The ITP page offers the same choice when you toggle the flow on.
- The ITP page says clicking **Flow is OFF** gives both the ON toggle and the save-all-data choice. So the Flow Activation button is most likely the same control as **Flow is OFF / ON** [SCR-7].
- ⚠ UNVERIFIED: that they are one control. The sheets give a fallback for two controls: set saving with Flow Activation, and switch ON with Flow is OFF.
- The sheets set the option in the first Save dialog. At the end, the builder opens that control, confirms the option is on, and switches the flow ON.
- **Behavior relied on:**
  - Without it, Execution History keeps only metadata such as status and times. With it, you can open an execution and see every card's input and output values.
  - Saved data is kept 30 days.
  - The data includes whatever the cards process, such as emails and the dispatcher's access token, and other Workflows admins can see it.
- **Sources:** [Save flow data to execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-save.htm), [View flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-view.htm), [Raw Request caution](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_raw.htm)

### SCR-7 Flow is OFF / ON
- **Where:** the **Flow is OFF** toggle in the flow builder; switch it to ON.
- **Behavior relied on:**
  - A flow takes about 60 seconds to enable. After turning it on, wait one minute before triggering it.
  - Flows that are off don't count against the active-flow limit [LIM-1].
  - The Okta tutorials and the error-notification KB turn helper flows on after saving them [KB-2].
- ⚠ UNVERIFIED: whether a helper flow must be on to be called. The sheets turn every helper on before its caller, so the answer doesn't change the build.
- **Sources:** [Build and test a flow](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-build-a-flow.htm), [Add a helper flow (tutorial)](https://help.okta.com/wf/en-us/content/topics/workflows/Tutorials/processjson-walkthrough/add-helper-flow.htm)

### SCR-8 Run, Run this card, Choose Flow dialog
- **Run:** the **Run** button at the top of the flow builder (Ctrl+Shift+Enter / ⌘+Shift+Enter) opens the **Run Flow** window. Enter test data into the event card's fields and click **Run**.
  - Run saves pending changes first.
  - A check mark appears on each card that ran.
  - A helper flow run this way has Caller `id` and `execution_id` set to null.
  - The 2022 KB screenshot shows a **Test** button in the same place; the current docs say **Run**.
- **Run this card:** tests one action or function card with sample inputs. It's the documented way to test an API Connector connection.
- **Choose Flow dialog:** opened from the **Helper Flow** field of Call Flow and For Each. Choose an existing flow or create one.
- ⚠ UNVERIFIED: that a new flow must be saved before it appears in its own Choose Flow dialog (needed for recursion). No page states it. Saving first is harmless, so the sheet does it.
- **Sources:** [Build and test a flow](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-build-a-flow.htm), [Cards in flows](https://help.okta.com/wf/en-us/Content/Topics/Workflows/learn/about-cards.htm), [Call Flow](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_spawn.htm), [Helper flows](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-helper-flows.htm)

### SCR-9 Execution History
- **Where:** open the flow > **Execution History**.
- **Behavior relied on:**
  - The side panel lists executions with status, start time, and duration. Selecting one shows each card's inputs and outputs, but only for flows that save data [SCR-6].
  - The status filter offers `All`, `Error`, `Success`, `In Progress`, `Throttled`, and `Canceled`.
  - The search box runs full-text search across one flow's executions.
  - History is kept 30 days.
- **Sources:** [View flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history-view.htm), [Flow execution history](https://help.okta.com/wf/en-us/content/topics/workflows/execute/execution-history.htm)

### SCR-10 Card error handling (not the If Error card)
- **Where:** a card's gear icon (**Other options**) > **Error handling**.
- **Fields:**
  - **Retry**: how many times to re-run the card; default 0.
  - **After**: wait between retries; default 5 minutes.
  - **Then**: `Halt Flow`, `Return Values`, or `Run another Flow`.
- **Behavior relied on:**
  - Card-level retries happen only for HTTP 429.
  - These codes are never retried: 400, 401, 402, 403, 404, 405, 409, 413, 421, 422, 500, 503, 504.
  - This setting is separate from the Error Handling – If Error function card [FN-10]. **The sheets leave it at the defaults on every card.** A Retry on a Raw Request card would hide 429s from the flow's own retry logic and wait 5 minutes.
- **Source:** [Set error handling for cards in flows](https://help.okta.com/wf/en-us/content/topics/workflows/build/set-error-handling.htm)

### SCR-11 Admin Console Delegated flows page
- **Where:** Admin Console > **Workflows** > **Delegated flows**. The page lists the flows your admin role allows, with a **Filter by flow** box.
- **Run:** **Run** next to a flow opens the **Run flow** dialog; fill it in and click **Run**. The page then shows progress and status.
- **Behavior relied on:**
  - The Run button is unavailable while a flow is off [KB-4].
  - Inputs aren't required when you run a flow, so the flow itself must validate them [KB-4].
- **Sources:** [Run a delegated flow](https://help.okta.com/oie/en-us/content/Topics/automation-hooks/delegated-flows/run-delegated-flow.htm), [Delegated flows](https://help.okta.com/en-us/Content/Topics/automation-hooks/delegated-flows/about-delegated-flows.htm), [KB-4](https://support.okta.com/help/s/article/how-to-configure-delegated-workflows)

### SCR-12 Okta Workflows OAuth app credentials
- **Where:** Admin Console > **Applications and Resources** > **Applications** > **Okta Workflows OAuth** > **Sign On** tab. Copy **Client ID** and **Client secret** from there.
- **Scopes:** **Applications and Resources** > **Okta Workflows OAuth** > **Okta API Scopes** lists the available scopes, each with a **Grant** or **Revoke** button.
  - A granted scope offers Revoke, and one that isn't granted offers Grant.
  - Clicking either changes this existing app, so the sheets only look.
- **Behavior relied on:**
  - The account that creates an Okta or Okta ITP connection must be assigned to this app and have super admin credentials.
  - The scopes the cards need must be granted in this app. A card without a granted scope fails with an Insufficient Scope error.
  - Reauthorize the connection after a scope change.
- **Sources:** [Okta connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/authorization.htm), [Okta ITP authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/overviews/authorization.htm), [Guidance for Okta connector](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/guidanceforoktaconnector.htm)

### SCR-13 Fields, types, mapping, custom fields
- **Types:**
  - The basic types are `Text`, `Number`, `True/False`, `Date & Time`, and `File`.
  - The composite types are `Object` and `List` (a list of one type).
  - Some reference pages write `String` for Text and `Various` for a field whose type you choose.
- **Mapping:** drag an output field onto an input field.
  - The output's format and the input's format must match.
  - An input tries to convert an incoming value to its own type. A number converts to text; the text `potato` doesn't convert to a number.
  - ⚠ The pages disagree about mapping across types. Fields says inputs convert. Workflow elements says the formats must match. Troubleshoot inactive flows says an action card's Number output mapped to an input of another type "will likely not run properly". The sheets map Number status codes into Lookup's String **Value** [FN-8], and P6-T4 S3 tests that path.
- **Custom fields:**
  - Many cards offer an empty field labeled **Click or drag to create** (custom output) or **Click or drop to create** (custom input). Click it and give the field a name.
  - Dragging an output onto it copies the origin's name and type.
  - Set the type of every custom output correctly; a wrong type causes runtime errors.
- **Renaming:** gear > **Edit card** lets you rename fields. The sheets don't use it; they refer to built-in outputs by their default labels.
- **Type icons:** the KB screenshot shows `Aa` on Text fields and `123` on Number fields. Icons aren't described on a help page.
- **Sources:** [Fields](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-fields.htm), [Workflow elements](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-elements.htm), [Cards in flows](https://help.okta.com/wf/en-us/Content/Topics/Workflows/learn/about-cards.htm), [KB-1](https://support.okta.com/help/s/article/How-to-Iterate-Over-Rows-in-a-Workflows-Table)

## Connections

### CON-1 Okta connection
- **Where:** New Connection > **Okta** [SCR-4].
- **Fields:**
  - **Connection Nickname**.
  - **Domain**: the org domain without `https://` or `-admin`.
  - **Client ID** and **Client Secret**, from SCR-12.
  - **Permissions** tab: **Use default scopes** or **Customize scopes (advanced)**. Then **Create**.
- **Behavior relied on:**
  - The default scopes cover what the Okta connector cards need, provided the scopes are granted in the Okta Workflows OAuth app [API-6].
  - Reauthorizing takes the connection's own super admin, a Workflows Administrator, or a Connection Manager.
- **Source:** [Okta connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/authorization.htm)

### CON-2 Okta ITP connection
- **Where:** New Connection > **Okta ITP**. The page's step text says "Select the Okta connector", which looks copied from the Okta page; pick the Okta ITP icon.
- **Fields:** the same as CON-1, from the same Okta Workflows OAuth app.
- ⚠ UNVERIFIED: which scopes Global Token Revocation needs. No Okta ITP scope page exists. This is U9, settled by P8-T1.
- **Source:** [Okta ITP authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/overviews/authorization.htm)

### CON-3 API Connector connection (None, Basic, Custom Header)
- **Where:** the doc's own path is an API Connector card's **+ New Connection** button, which opens the **New Connection** dialog. The generic New Connection selector [SCR-4] is the other route.
- **Fields:** a nickname, then an authentication type from a dropdown listing `Basic`, `Custom Header`, `OAuth`, `Client Credentials`, and `None`. Then the type's values, then **Create**.
  - **None**: no values. Used for requests that carry their own Authorization header, or unauthenticated ones.
  - **Basic**: **Username** and **Password**. Every request carries `Authorization: Basic ` followed by base64 of `<username>:<password>`.
  - **Custom Header** (the section heading on the page says **Custom**): **Header Name** and **Header Value**, sent with every request.
- **Behavior relied on:**
  - Credentials are stored securely, and the header is created automatically.
  - API Connector connections aren't tested when you create them. Test them with **Run this card** [SCR-8] or a flow run.
- ⚠ UNVERIFIED: whether the dropdown says `Custom Header` or `Custom`. Pick whichever exists.
- ⚠ UNVERIFIED: whether an **API Connector** icon appears in the folder's New Connection selector. If it doesn't, use the card's + New Connection.
- **Source:** [Authenticate with API Connector cards](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_authorization.htm)

## Event cards

### EVT-1 Helper Flow
- **Where:** **Add Event** > **Helper Flow**. The KB screenshot shows the card titled "On Demand / Helper Flow".
- **Outputs:**
  - **Inputs to this Flow**: custom fields you create with **Click or drag to create**, each with a name and a type. Every caller must supply them by those exact names.
  - **context**:
    - `Index` (Number): the item's position when For Each or Map calls the flow.
    - `Caller` (Object, with keys `id`, `name`, `execution_id`, `method`): null `id` when run manually.
    - `Error` (Object): set only when the flow is called for card error handling.
    - `Execution ID`.
- **Behavior relied on:** a helper runs when a parent calls it with Call Flow, Call Flow Async, For Each, or Map.
- ⚠ UNVERIFIED: whether it must be on [SCR-7].
- **Sources:** [Helper flows](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-helper-flows.htm), [Parent flows and other flow types](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-parent-flows.htm), [Add a helper flow (tutorial)](https://help.okta.com/wf/en-us/content/topics/workflows/Tutorials/processjson-walkthrough/add-helper-flow.htm)

### EVT-2 Delegated Flow
- **Where:** **Add event** > **Delegated Flow**. The KB places it in the **Built-in triggers** section.
- **Fields on the card:**
  - **Inputs**: extensible fields whose type can only be `Text`, `Number`, `True or False`, or `Date & Time`. List isn't allowed.
  - **User Context > Okta User ID** (String): the KB says it holds the ID of the admin who runs the flow.
  - **Context > Caller** (Object, with sub-fields `ID`, `Alternate ID`, `Display Name`, `Type`): filled when another Okta product calls the flow.
- **Behavior relied on:**
  - Pause and Pause Raw cards can't be used in a delegated flow.
  - ITP supports only delegated flows. The flow must exist and be on before an entity risk rule can use it.
  - Active delegated flows count toward the flow limit.
  - Admins aren't forced to fill in inputs, so the flow must validate them [KB-4].
- ⚠ UNVERIFIED (U1): which field ITP fills with the at-risk user. Settled by P7-T3.
- ⚠ UNVERIFIED: whether the card exposes Caller's sub-fields for dragging, or only the whole object. The doc lists the sub-fields under Caller, so the sheets drag them.
- **Sources:** [Build a delegated flow](https://help.okta.com/wf/en-us/content/topics/workflows/build/build-delegated-flow.htm), [Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm), [KB-4](https://support.okta.com/help/s/article/how-to-configure-delegated-workflows)

### EVT-3 Okta ITP – User Risk Detected
- **Where:** **Add Event** > **Okta ITP** > **User Risk Detected**, with an Okta ITP connection.
- **Outputs used:**
  - **Risk > Level** (Text; values `LOW`, `HIGH`, `MEDIUM`, uppercase).
  - **Risk > Previous Level** (Text).
  - **Okta User > ID** (Text).
  - The card has many more outputs, including Event Type `user.risk.detect`.
- ⚠ UNVERIFIED: which scopes the event needs. Okta connector event cards need `okta.eventHooks.manage` [API-6]; no page lists the ITP event's scopes.
- **Source:** [User Risk Detected](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/events/userriskdetected.htm)

## Connector action cards

### ACT-1 Okta ITP – Global Token Revocation
- **Where:** **Add app action** > **Okta ITP** > **Global Token Revocation**.
- **Inputs:**
  - **User > ID** (Text; format `opaque`; SAML or OIDC; required).
  - The page also lists **ISS** and **SUB** (Text) for format `iss_sub`, which this POC doesn't use.
- **Outputs:** **Response > Status Code** (Number). 204 means the user's tokens and sessions were revoked; 403 means a permission is missing.
- **Behavior relied on:**
  - The card is the Workflows equivalent of a full Universal Logout.
  - KB-3 says to map the user ID into the card's User ID field.
  - The card's description matches the API operation `POST /oauth2/v1/global-token-revocation`. That operation needs scope `okta.universalLogout.manage` and uses the opaque format for Okta user IDs [API-7].
- ⚠ UNVERIFIED (U9): that the card uses that scope through the Okta ITP connection. No Okta ITP scope page exists.
- ⚠ UNVERIFIED: how the card presents the opaque/iss_sub choice. The input table has Format and Protocol columns and marks ID, ISS, and SUB all required, which suggests the card asks for a format first. The sheets say: choose the ID (opaque) format, and stop if ISS or SUB still show as required.
- ⚠ UNVERIFIED: whether a non-2xx response makes the card error. The sheets wrap it in If Error either way.
- **Sources:** [Global Token Revocation](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/globaltokenrevocation.htm), [Okta ITP connector](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/oktaitp.htm), [KB-3](https://support.okta.com/help/s/article/how-to-perform-universal-logout-using-workflows)

### ACT-2 Okta ITP – Upsert User Risk
- **Where:** **Add app action** > **Okta ITP** > **Upsert User Risk**.
- **Inputs:** **User > ID** (Text, required) and **Risk Level** (Dropdown: `Low`, `High`; required).
- **Outputs:** **User > Risk Level** (Text) and **Reason** (Text).
- **Behavior relied on:** the matching API operation, `PUT /api/v1/users/{userId}/risk`, needs scope `okta.userRisk.manage` [API-8].
- ⚠ UNVERIFIED: that the card uses that scope.
- **Source:** [Upsert User Risk](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/upsertuserrisk.htm)

### ACT-3 Okta – Read User
- **Where:** **Add app action** > **Okta** > **Read User**.
- **Inputs:** **ID or Login** (Text, required). It takes the user's ID or login username.
- **Outputs used:** **System Properties > ID** (Text). The card also returns profile fields one by one, such as **Primary email** and **Username**, rather than as one profile object.
- **Behavior relied on:**
  - It needs scopes `okta.users.read` and `okta.schemas.read` [API-6].
  - Reading an app user returns 404.
  - Custom profile properties are generated when you configure the card. In Okta's tutorial, adding Read User shows an **Attributes** list, where you select attributes and click **Done**.
- ⚠ UNVERIFIED: which attributes that list offers. The sheets need only **System Properties > ID**, which is a system property.
- **Sources:** [Read User](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/actions/readuser.htm), [Build a user creation flow (tutorial)](https://help.okta.com/wf/en-us/content/topics/workflows/tutorials/timebasedactions-walkthrough/build-user-creation-flow.htm)

### ACT-4 Okta – Custom API Action
- **Where:** **Add app action** > **Okta** > **Custom API Action**.
- **Options:** **Request Type** (Dropdown: `GET`, `GET(Streaming)`, `POST`, `PUT`, `PATCH`, `DELETE`).
- **Inputs:**
  - **Relative URL** (Text, required; must start with `/`; may include `?query`).
  - **Headers** (Object): authorization and content-type are already handled.
  - **Query** (Object): key/value pairs.
  - **Body** (Object): POST, PUT, and PATCH only.
- **Outputs:** **Response > Status Code** (Number), **Headers** (Object), **Body** (Object).
- **Behavior relied on:**
  - It needs whatever scopes the called endpoint needs [API-6].
  - The page says a successful DELETE returns 200 (OK), while the Management API documents 204 for the DELETEs the sheets use [API-3, API-5]. Sheets treat both as success.
  - Body is typed Object. The sheets convert it with JSON – Stringify and JSON – Parse before list cards [FN-17, FN-18].
- ⚠ UNVERIFIED: whether a non-2xx response makes the card error.
- ⚠ UNVERIFIED: that an API returning a JSON array (groups, clients) comes through intact in the Object-typed Body. Stringify accepts any JSON type, but no page shows an array in this output. It's used only in the conditional P10 variants (wf-02 Part B per-client, wf-05).
- **Source:** [Custom API Action](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/actions/httprequest.htm)

## Function cards

Categories and card names were checked against the [function reference](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/functions.htm). There's no "HTTP Request", "Try/Catch", "Switch", or "Loop" card. "Filter" exists only as a List or Object card, which the sheets don't use. HTTP calls are **API Connector – Raw Request**, error handling is **Error Handling – If Error**, multi-way branching is **Branching – If/ElseIf**, and iteration is **List – For Each**.

### FN-1 Flow Control – Call Flow
- **Inputs:**
  - **Helper Flow** (Dialog, required): opens the **Choose Flow** dialog.
  - **With these inputs** (Various): filled in automatically from the helper's inputs once you choose the flow.
- **Outputs:** none until you create them by hand. Each must have the **exact name and type** of a value the helper returns with its Return card.
- **Behavior relied on:**
  - The calling flow waits until the helper finishes.
  - Call Flow Async doesn't wait; the sheets don't use it.
- **Source:** [Call Flow](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_spawn.htm)

### FN-2 Flow Control – Return
- **Inputs:** no defaults. Create fields by hand or drag outputs onto the card; the field names are the names the caller sees.
- **Outputs:** none.
- **Behavior relied on:**
  - Return ends the flow and returns its values to the caller.
  - Inside an If/ElseIf or If Error block it doesn't end the flow; it continues at the step after the container [LIM-5]. The sheets put Return only at the top level.
- **Source:** [Return](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_return.htm)

### FN-3 Flow Control – Assign
- **Inputs:** no defaults; create fields by hand (name, type, value) or drag outputs onto the card.
- **Outputs:** one output per input field, with the same name.
- **Source:** [Assign](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_let.htm)

### FN-4 Flow Control – Wait For
- **Inputs:** **delay** (Number, required) and **unit** (Dropdown, required: `second`, `minute`, `hour`, `day`).
- **Outputs:** none.
- **Behavior relied on:** the wait is at least one second and at most 30 days; a longer wait terminates the flow.
- **Source:** [Wait For](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_wait.htm)

### FN-5 Branching – If/Else
- **Condition:** **value a**, **comparison**, **value b**; click **Done** to go on to the branches.
- **Branches:** the upper orange container runs when the condition is true; the lower blue container runs when it's false.
- **Outputs:** **Create Outputs** adds fields to the whole If/Else, each with a name and a type. Fill a value for the true case and for the false case by dragging from that branch, or by clicking the box to pick from the outputs of steps in that branch.
- **Operators used:** `equal to`. Set the types of value a and value b so the comparison works as intended; `80 > 9` is true as numbers and false as text.
- **Source:** [If/Else](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_if.htm)

### FN-6 Branching – If/ElseIf
- **Conditions:** a list of conditions, each with **value a**, **comparison**, **value b**.
  - They're tested top to bottom, and only the first true one runs its branch; if none is true, **Else** runs.
  - Click the **+** icon right of a condition to open its branch. Use the dropdown at the top left to switch branches, or **Edit Conditions** to change or add conditions.
- **Outputs:** **View Outputs** at the top right opens a pane. Add an output with a name and a type; it gets one field per condition plus one for Else. Drop an output from the matching branch into each field.
- **Behavior relied on:**
  - A card after the If/ElseIf can't use an output from inside a branch; it must use View Outputs.
  - Return and Continue If inside a branch continue after the If/ElseIf instead of halting [LIM-5].
- **Source:** [If/ElseIf](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_branch.htm)

### FN-7 Branching – Continue If
- **Inputs:** **value a**, **comparison**, **value b**, and **message**, which is optional and returned when the condition is false and the flow stops.
- **Outputs:** **message** (String).
- **Operators used:**
  - `equal to` and `not equal to` work on text, numbers, dates, and true/false.
  - `is not empty` ignores value b and works only on Text and Object.
- **Behavior relied on:**
  - When the condition is false, the flow stops without an error.
  - Inside an If/ElseIf branch, a Try, or an If Error section, it only skips to the step after the container [LIM-5]. **Every guard in the sheets is a top-level card.**
- **Source:** [Continue If](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_continueif.htm)

### FN-8 Branching – Lookup
- **Inputs:**
  - **Value** (String, required).
  - **Lookup Table**: rows of **When Value Is** and **Then Result Is**. Click the bottom row to add a row, or the x to delete one.
  - **Otherwise Result Is**.
- **Outputs:** **Result**, Text by default. Changing its type also changes the Then Result Is column and Otherwise Result Is.
- **Behavior relied on:**
  - Only an exact match counts; anything else gives the Otherwise value.
  - A Number dragged into **Value** should be converted to text [SCR-13], so `204` matches a row typed `204`.
- ⚠ UNVERIFIED: that conversion; the docs conflict [SCR-13]. P6-T4 S3 settles it for every Lookup in the sheets. If 429 doesn't come back as `retry`, OIDC isn't retried, and `dispatcher-verify` S3 fails.
- ⚠ UNVERIFIED: what happens when **Value**, a required field, arrives empty or null. It may give the Otherwise value, or it may error.
- **Source:** [Lookup](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_lookup.htm)

### FN-9 Branching – Assign If
- **Inputs:** **value a**, **comparison**, **value b**, **value if true**, **value if false**.
- **Outputs:** **output** (Various; set its type).
- **Operators used:** `greater than or equal` and `is empty`. `is empty` works only on Text and Object.
- **Source:** [Assign If](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_assignif.htm)

### FN-10 Error Handling – If Error
- **Sections:** **Try** (the steps to attempt) and **If Error** (the steps that run if any Try step errors). A dropdown switches between them.
- **Error object:** each If Error section gets one, with these keys:
  - `message`: error text, when available.
  - `code`: error code, for example `500`.
  - `method`: ID of the step that failed.
  - `flo`: ID of the flow.
  - `execution`: ID of the execution.
- **Outputs:** **View Outputs** at the top right; each output has a name and a type. Each gets two fields: drag a Try output into the one used when no error happens, and an If Error output into the one used when one does.
- **Behavior relied on:**
  - The flow continues after an error is handled.
  - Return and Continue If inside Try or If Error continue after the container [LIM-5].
  - Okta recommends no more than three nested If Error blocks; the sheets nest none.
- **Other evidence about the error object:**
  - KB-7's runtime screenshot (2022 UI) supports `code`. An API Connector request got HTTP 500; the request card errored, the If Error section ran, and its **Error** object held `"statusCode":500`, `"message":"500 Internal Server Error"`, `"code":500`, a `body`, and `flo` as a number (`279441`).
  - KB-2's screenshot shows the design-time key list of the **Error** object: `message`, `method`, `flo`, `execution`, and an **Enter key name here** field. It doesn't show runtime values, so it doesn't prove `code` is absent.
  - KB-6 quotes an Okta-card error as `{"error":{"status":500,"message":{"statusCode":400,…}}}`, a 500 that wraps the API's 400. That's an Okta connector card, not Raw Request.
  - The Helper flows page says card error objects often carry `statusCode`.
- ⚠ UNVERIFIED (U6): whether `code` is present for a Raw Request HTTP error, and whether it's the HTTP status or a wrapping 500. Also unverified: what it holds when a request fails without a status. P6-T4 scenario S2 settles it for 422, and catches both wrong cases:
  - If `code` is 500, SAML gets three needless retries, so the mock records four calls instead of one.
  - If `code` is missing and Object – Get errors, the SAML execution fails before writing its Results row, and For Each skips any rows after it.
  
  See the report for the no-status case.
- **Sources:** [If Error](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/error-handling/errorhandling_trycatch.htm), [KB-7](https://support.okta.com/help/s/article/How-to-Handle-an-External-API-Call-Error-inWorkflows) (runtime screenshot), [KB-2](https://support.okta.com/help/s/article/How-to-setup-an-error-notification-flow-in-Okta-Workflows) (text and screenshot), [KB-6](https://support.okta.com/help/s/article/Okta-Workflows-connection-fails-with-The-refresh-token-is-invalid-or-expired-error-and-requires-reauthorization), [Helper flows](https://help.okta.com/wf/en-us/content/topics/workflows/learn/about-helper-flows.htm)

### FN-11 Object – Get
- **Inputs:** **object** (Object, required) and **path** (Text, required).
- **Outputs:** **output**, Text by default; set it to the value's real type.
- **Behavior relied on:**
  - `.` separates nested keys, and list positions count from 0 (`all.2.b`). Spaces aren't mentioned as special.
  - If the output type doesn't match the value's type, the flow can fail at runtime.
- ⚠ UNVERIFIED: paths containing spaces, such as `Identifier attribute` and `Endpoint or API` (U7, P6-T4 S1). Also unverified: the result for a path that doesn't exist, assumed null (report).
- **Source:** [Get](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/object/object_get.htm)

### FN-12 Object – Construct
- **Inputs:** fields you create, each a key in the new object, of any type including Object or List.
- **Outputs:** **output** (Object).
- **Behavior relied on:** to nest an object, build the inner object with one Construct card, then drag its output into an Object-typed key of a second Construct card (the doc's own example).
- **Source:** [Construct](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/object/object_construct.htm)

### FN-13 Text – Concatenate
- **Inputs:** **text 1** and **text 2** (String, required). **Click or drop here to create** adds text 3 and so on.
- **Outputs:** **output** (String). The inputs are joined with nothing between them.
- **Behavior relied on:** the doc's example puts a single space in its own input; the sheets do the same for `Bearer` and the token.
- **Source:** [Concatenate](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/text/text_concat.htm)

### FN-14 Number – Add
- **Inputs:** **number 1** and **number 2** (Number).
- **Outputs:** **total** (Number).
- **Source:** [Add](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/number/number_add.htm)

### FN-15 Number – Multiply
- **Inputs:** **number 1** and **number 2** (Number).
- **Outputs:** **output** (Number).
- **Source:** [Multiply](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/number/number_multiply.htm)

### FN-16 Date & Time – Now
- **Outputs used:** **date** (Date & Time): an ISO timestamp in UTC with `Z`, for example `2016-09-07T16:55:25.670Z`.
- The card also outputs `iso` (String, offset notation), `full`, `minute`, `hour`, `time`, `day`, `month`, `year`, `second`, and `millisecond`.
- **Source:** [Now](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/datetime/datetime_now.htm)

### FN-17 JSON – Parse
- **Inputs:** **string** (String, required).
- **Outputs:** **output**; set its type to what the string holds, for example Object, or List of Objects for `[{…}]`.
- **Behavior relied on:** invalid JSON is a runtime error, and a wrong output type can cause runtime errors.
- **Source:** [Parse](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/json/json_parse.htm)

### FN-18 JSON – Stringify
- **Inputs:** **object** (Object, required). It accepts any JSON type, including a list of objects.
- **Outputs:** **output** (String): compact JSON such as `{"id":"…","profile":{…}}`.
- **Behavior relied on:**
  - The Raw Request page recommends building a body with Object cards and JSON – Stringify.
  - Text – Compose documents no escaping, so a value containing `"` would break hand-typed JSON. The sheets build every JSON body with Construct and Stringify.
- **Sources:** [Stringify](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/json/json_stringify.htm), [Raw Request](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_raw.htm), [Compose](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/text/text_compose.htm)

### FN-19 List – For Each
- **Inputs:**
  - **For each item in this list > list** (required).
  - **Run this Flow > Helper Flow** (required; Choose Flow dialog).
  - **With the following values**:
    - **concurrency** (Number): enter `1` to process items in order.
    - The helper's inputs, added automatically when you choose the flow.
- **Mapping:**
  - Click an input and choose **item** from its dropdown to pass the current list item. The KB screenshot shows it as **Item**.
  - Dragging an output from an earlier card passes the same value for every item.
- **Outputs:** none.
- **Behavior relied on:** For Each stops processing further items if a helper execution errors. **For Each - Ignore Errors** keeps going, but the sheets don't use it; see the report.
- **Sources:** [For Each](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_each.htm), [For Each - Ignore Errors](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_asynceach.htm), [KB-1](https://support.okta.com/help/s/article/How-to-Iterate-Over-Rows-in-a-Workflows-Table)

### FN-20 List – Pluck
- **Inputs:** **list** (a list of objects) and **key** (text; may be a dot path).
- **Outputs:** **values**. Set its item type to match the values at that key, for example List of Text.
- **Source:** [Pluck](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_pluck.htm)

### FN-21 List – Includes
- **Inputs:** **list** (required) and **value** (required; the same type as the list's items).
- **Outputs:** **result** (true/false).
- **Source:** [Includes](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/list/list_includes.htm)

### FN-22 Tables – Search Rows
- **Options:**
  - **Choose Table**: pick the table, **Choose**, then **Save** on the card.
  - **Result Set**: `First matching row` or `All matching rows`.
  - Checkboxes choose which columns the results include; then **Save**.
- **Inputs:**
  - **Filter > Where Expression**: the **Filter…** button opens a dialog where you choose a column and a **Value**. **+ Add condition** adds tests. Matching is case sensitive, and the doc says it matches full or partial strings.
  - **Sort > Column** and **Direction**.
  - **Limit**: at most 3,500 rows are returned whatever it's set to.
  - **Offset**.
- **Outputs:**
  - One result: a row with `Created`, `Updated`, and the chosen fields, or null if nothing matches.
  - All matching rows: a list of rows, empty if nothing matches. The KB screenshot shows it as **Rows** under **Result**, with sub-fields for each chosen column plus `Row ID`, `Created`, and `Updated`.
- **Row shape:** the KB's helper-flow screenshot shows a row passed through For Each as one flat object, `{"Row ID":"…","Created":"…","Updated":"…","Country":"…","Code":"…"}`. Column values sit at the top level, keyed by column name, next to the metadata.
- ⚠ UNVERIFIED: the dialog's operator labels for a Boolean column (U7 and P6-T4 S1, which check that the disabled row gets no call). Also unverified: whether this org's rows still have the 2022 shape (U7, P6-T4 S1).
- **Sources:** [Search Rows](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/tables/stash_searchrows2.htm), [Read Row](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/tables/stash_readrow.htm), [KB-1 screenshots](https://support.okta.com/help/s/article/How-to-Iterate-Over-Rows-in-a-Workflows-Table)

### FN-23 Tables – Create Row
- **Options:** **Table**: **Choose Table** > pick the table > **Choose** > **Save** on the card.
- **Inputs:** check the columns to write and click **Save**; each checked column becomes an input on the card.
- **Outputs:** **Row ID**.
- **Source:** [Create Row](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/tables/stash_createrow.htm)

### FN-24 API Connector – Raw Request
- **Connection:** an API Connector connection [CON-3], chosen at the top of the card [SCR-4].
- **Inputs:**
  - **URL** (Text, required).
  - **Method** (Dropdown, required: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
  - **Headers** (Object): each key becomes a `key: value` header.
  - **Query** (Object): each key is appended as `?key=value&…`.
  - **Body** (Text).
  - **There's no timeout or retry input.**
- **Outputs:** **Response > Status Code** (Number), **Headers** (Object), **Body** (Text).
- **Behavior relied on:**
  - API Connector errors usually correspond to the HTTP code the API returned (HTTP Errors page).
  - Each card has an internal timeout that raises "Method timeout exceeded" [LIM-6].
  - Okta cautions that values passing through the card, such as access tokens, can be stored in execution history and seen by other Workflows admins.
- ⚠ UNVERIFIED (U6): whether every non-2xx response makes this card error, or some come back in Status Code. The sheets handle both cases. Settled by P6-T4 S2.
- **Sources:** [Raw Request](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_raw.htm), [HTTP Errors](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_errors.htm)

## Platform limits and behavior

### LIM-1 Active-flow limit
- Active flows allowed: Workflows Starter 5, Free Trial 5, Light 50, Medium 150, Maximum unlimited.
- Flows that are off aren't counted.
- Only legacy entitlements limit "active parent flows"; current plans count active flows with no exception for helper flows. Active delegated flows used by ITP count too.
- **This POC turns on 4 flows: Per App, Dispatcher, Respond, and Respond by Email. The fallback makes 5. The per-client sweep helper would be a sixth.**
- **Sources:** [Workflows system limits](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-system-limits.htm), [Flow limits](https://help.okta.com/wf/en-us/content/topics/workflows/flow-limits.htm), [Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm)

### LIM-2 Recursion limit
- A helper flow can call itself at most 250 times; beyond that it fails with "Stack limit exceeded". Per App goes at most 4 attempts deep.
- KB-5 confirms that flows can call themselves.
- **Sources:** [Workflows system limits](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-system-limits.htm), [KB-5](https://support.okta.com/help/s/article/set-up-recursion-in-workflows)

### LIM-3 History, payload, and table limits
- Execution history is kept 30 days.
- A single history message over 1 MB isn't stored.
- A table holds up to 500,000 rows and 64 columns, and a cell up to 16 KB.
- The Starter plan includes 50 million step executions a month.
- **Source:** [Workflows system limits](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-system-limits.htm)

### LIM-4 Okta connector rate limits
- 30 concurrent requests from Workflows to the org.
- 15 concurrent requests to `/api/v1/users/${id}`, not counted against the 30.
- 6,000 requests per minute.
- **Source:** [Workflows system limits](https://help.okta.com/wf/en-us/content/topics/workflows/workflows-system-limits.htm)

### LIM-5 Return and Continue If inside containers
- Inside an If/ElseIf branch, a Try section, or an If Error section, Return and a false Continue If skip to the step after the container instead of halting the flow.
- To halt, put Continue If outside the container, or use Return Error / Return Error If.
- **Sources:** [If/ElseIf](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_branch.htm), [If Error](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/error-handling/errorhandling_trycatch.htm), [Return](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/flow-control/flocontrol_return.htm), [Continue If](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/branching/branching_continueif.htm)

### LIM-6 Card timeouts, type errors, and flows that won't turn on
- Every card has an internal timeout; when it passes, the card fails with "Method timeout exceeded".
- "Invalid type conversion" occurs when a card gets a value it can't convert to its input type.
- A flow can't be activated when a connector it uses can't authenticate (invalid credentials). An alert in the Workflows Console names the connector.
- **Sources:** [Workflows error messages](https://help.okta.com/wf/en-us/content/topics/workflows/execute/workflows-error-messages.htm), [Troubleshoot inactive flows](https://help.okta.com/wf/en-us/content/topics/workflows/execute/inactive-flows.htm)

## Okta API endpoints the cards call

| ID | Call | Scope | Response used | Source |
| --- | --- | --- | --- | --- |
| API-1 | `GET /api/v1/users/{id}` | `okta.users.read` | 200; user object with a `profile` object | [Retrieve a user](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/getUser) |
| API-2 | `GET /api/v1/users/{id}/groups` | `okta.users.read` | 200; JSON array of groups, each with `id`; `limit` defaults to 200 | [User Resources](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserResources/) |
| API-3 | `DELETE /api/v1/users/{userId}/sessions` with query `oauthTokens=true` | `okta.users.manage` | 204. `oauthTokens` defaults to false. `forgetDevices` defaults to true in Identity Engine and also clears remembered factors | [User Sessions](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserSessions/) |
| API-4 | `GET /api/v1/users/{userId}/clients` | `okta.users.read` | 200; JSON array of clients, each with `client_id` | [User Resources](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserResources/) |
| API-5 | `DELETE /api/v1/users/{userId}/clients/{clientId}/tokens` | `okta.users.manage` | 204; revokes all refresh tokens for that user and client | [User OAuth 2.0 Token Management](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserOAuth/) |
| API-6 | Okta connector card scopes | Read User: `okta.users.read`, `okta.schemas.read`. Custom API Action: whatever the endpoint needs. Event cards: `okta.eventHooks.manage` | Default scopes `address`, `email`, `groups`, `offline_access`, `openid`, `phone`, and `profile` are always granted | [Scopes for Okta connector cards](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/scopes.htm) |
| API-7 | `POST /oauth2/v1/global-token-revocation` (the API behind ACT-1) | `okta.universalLogout.manage` | Revokes all tokens and sessions for the user in `sub_id`; use the `opaque` format for Okta user IDs | [Global Token Revocation API](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/GlobalTokenRevocation/) |
| API-8 | `PUT /api/v1/users/{userId}/risk` (the API behind ACT-2) | `okta.userRisk.manage` | Body `riskLevel` (`HIGH`, `MEDIUM`, `LOW`) | [User Risk](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserRisk/) |

## Support articles and forums (rank 3 and 4)

| ID | Article | What it corroborates |
| --- | --- | --- |
| KB-1 | [How to Iterate Over Rows in an Okta Workflows Table](https://support.okta.com/help/s/article/How-to-Iterate-Over-Rows-in-a-Workflows-Table) (updated 2026-09-30) | Search Rows feeds For Each, which passes each row whole to a helper with an Object input. The screenshots show the **Rows** output, **Item** mapping, concurrency `1`, and a flat row object with `Row ID`, `Created`, and `Updated` |
| KB-2 | [How to Setup an Error Notification Flow](https://support.okta.com/help/s/article/How-to-setup-an-error-notification-flow-in-Okta-Workflows) (2026-09-29) | The helper is saved and turned on; the error object's `message` and `execution` fields are used directly. The flow URL example is `https://example.workflows.oktapreview.com/app/flows/01K48DVKSQHWABCDSW820WSHTT`, a 26-character ID that isn't a number (see the report, U5) |
| KB-3 | [Perform Universal Logout Using Okta Workflows](https://support.okta.com/help/s/article/how-to-perform-universal-logout-using-workflows) (2026-04-02) | Use Okta ITP – Global Token Revocation, not Clear User Sessions; map the user ID into its User ID field |
| KB-4 | [Configure Delegated Workflows in Okta](https://support.okta.com/help/s/article/how-to-configure-delegated-workflows) (2026-08-24) | Delegated Flow sits under Built-in triggers. Inputs aren't required, so the flow must validate them. User Context > Okta User ID is the admin who runs the flow. Run is unavailable while the flow is off |
| KB-5 | [Workflows Collection: Build Flows with Recursion](https://support.okta.com/help/s/article/set-up-recursion-in-workflows) (2026-02-11) | A flow can call itself |
| KB-6 | [Workflows connection fails with "The refresh token is invalid or expired"](https://support.okta.com/help/s/article/Okta-Workflows-connection-fails-with-The-refresh-token-is-invalid-or-expired-error-and-requires-reauthorization) (2026-07-09) | Clearing the session of the account that authorized the connection breaks the connection; add flow logic that refuses that account |
| KB-7 | [How to Handle an External API Call Error in Workflows](https://support.okta.com/help/s/article/How-to-Handle-an-External-API-Call-Error-inWorkflows) (2025-08-11) | An API Connector call that gets HTTP 500 errors into the If Error section. The runtime Error object holds `code` 500 and `statusCode` 500, and `flo` is a number |
| FORUM-1 | [devforum: no public API to manage flows](https://devforum.okta.com/t/getting-workflow-configuration-through-management-api/34598) (Okta Developer Advocacy, 2025-11-19; corroboration only) | No public API manages flows or connectors |
