# wf-00 Workflows folder, tables, and connections (P6-T1)

Do this in the Workflows Console: Admin Console > Workflows > Workflows console. Sources: [Create a table](https://help.okta.com/wf/en-us/Content/Topics/Workflows/build/create-table.htm), [Import from CSV](https://help.okta.com/wf/en-us/content/topics/workflows/build/import-from-csv.htm), [API Connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/function-reference/http/http_authorization.htm), [Okta ITP connection](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/overviews/authorization.htm).

Sign in to Workflows as the **connection account** (`OKTA_WF_CONNECTION_USER_ID`) so the Okta connections are authorized by that account.

## 1. Folder

1. Flows > Folders > **+** (new folder). Name: `POC-ITP-FBM`. Save.

## 2. Tables

In folder `POC-ITP-FBM`, open the **Tables** tab and click **+ New Table** for each table below. Add columns with **+ New Column**, using exactly these names and types.

### `POC-FBM Logout Registry`

| Column | Type |
| --- | --- |
| App name | String |
| App instance ID | String |
| Method | String |
| Endpoint or API | String |
| Identifier attribute | String |
| Enabled | Boolean |

Then **Import** > Choose CSV File > `tables/poc-fbm-logout-registry.csv` from the repo. In the mapping step, check each CSV field maps to the column with the same name. Click **Import**.

Expected: 4 rows. `POC-FBM-OIDC`, `POC-FBM-SAML`, `POC-Mock-Vendor` have Enabled = true; `POC-Disabled-Canary` has Enabled = false. **Report what Enabled shows for each row** (this settles U8). If Enabled imported as empty or text, set the four values by hand in the table view and tell the executor.

### `POC-FBM Logout Results`

| Column | Type |
| --- | --- |
| Time | Date |
| User ID | String |
| App name | String |
| Status code | Number |
| Outcome | String |

Leave it empty. (`tables/poc-fbm-logout-results.csv` is the header for reference only.)

### `POC-Respond Probe`

| Column | Type |
| --- | --- |
| Time | Date |
| Input User ID | String |
| Okta User ID | String |
| Caller ID | String |
| Caller Type | String |
| Caller Display Name | String |
| Caller Alternate ID | String |

Leave it empty.

## 3. Connections

Open the **Connections** page and click **+ New Connection** for each connection below.

### `POC-Okta` (Okta connector)

1. Get the client credentials from the **existing** app, without changing anything there: Admin Console > Applications > Applications > `Okta Workflows OAuth` > General > Client Credentials.
2. Fill in:
   - Connection Nickname: `POC-Okta`
   - Domain: `<org subdomain>.oktapreview.com` (no `https://`, no `-admin`)
   - Client ID and Client Secret: from step 1
3. Permissions: **Use default scopes**.
4. Create, then authorize as the connection account.

### `POC-Okta ITP` (Okta ITP connector)

Same fields as `POC-Okta`, with Connection Nickname `POC-Okta ITP` and **Use default scopes**.

### `POC-API None` (API Connector)

Auth Type: **None**. Nickname `POC-API None`.

### `POC-AS Token (Basic)` (API Connector), only when `GTR_AUTH_MODE=oauth`

- Auth Type: **Basic**. Nickname `POC-AS Token (Basic)`.
- Username: run `npm run secret:copy -- tf:dispatcher_client_id`, then paste.
- Password: run `npm run secret:copy -- tf:dispatcher_client_secret`, then paste.

### `POC-Mock GTR Static (Custom Header)` (API Connector), only when `GTR_AUTH_MODE=static`

- Auth Type: **Custom**. Nickname `POC-Mock GTR Static (Custom Header)`.
- Header Name: `Authorization`.
- Header Value: run `npm run secret:copy -- bearer:MOCK_GTR_STATIC_BEARER`, then paste (it already starts with `Bearer `).

### `POC-Mock Vendor (Custom Header)` (API Connector)

- Auth Type: **Custom**. Nickname `POC-Mock Vendor (Custom Header)`.
- Header Name: `X-API-Key`.
- Header Value: run `npm run secret:copy -- MOCK_VENDOR_API_KEY`, then paste.

## Report to the executor

- Registry: row count and Enabled values.
- Results and Probe: created, empty.
- Each connection's name and whether it shows as connected.
- Anything that didn't match this sheet.
