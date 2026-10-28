# wf-00 Workflows folder, tables, and connections (P6-T1)

You'll create the folder `POC-ITP-FBM`, its three tables, and the five connections the flows use. Every console label comes from the ledger, [wf-card-reference.md](wf-card-reference.md); IDs in square brackets point to its entries.

Connection mode for this run: `GTR_AUTH_MODE=<GTR_AUTH_MODE>`. It decides which one of `POC-AS Token (Basic)` or `POC-Mock GTR Static (Custom Header)` you create.

**Reusable or test only:** the folder, the Registry's columns (not its four test rows), the Results table, and `POC-Okta`, `POC-Okta ITP`, `POC-API None`, and `POC-AS Token (Basic)` are reusable. `POC-Respond Probe` and `POC-Mock Vendor (Custom Header)` are test only. `POC-Mock GTR Static (Custom Header)` is conditional: static mode only (D-AUTH). See [reusable-workflow.md](../reusable-workflow.md).

## Before you start

1. Sign in to the Admin Console as the **connection account**, `<OKTA_WF_CONNECTION_USER_ID>`. It's the super admin that authorizes the Okta connections, so every rule and flow in the POC refuses it [CON-1, KB-6].
2. Look at the scopes of the existing **Okta Workflows OAuth** app, without changing anything [SCR-12]: Admin Console > **Applications and Resources** > **Applications** > **Okta Workflows OAuth** > **Okta API Scopes** tab. A granted scope offers **Revoke** and one that isn't granted offers **Grant**; don't click either. Find these six scopes:
   - `okta.users.read`: needed by Read User and by the dispatcher's Custom API Action [API-6].
   - `okta.schemas.read`: needed by Read User [API-6].
   - `okta.users.manage`: needed only if P10-T3 adds the token sweep [API-3].
   - `okta.universalLogout.manage`: the scope of the API behind Global Token Revocation [API-7]. ⚠ UNVERIFIED that the card uses it (U9).
   - `okta.userRisk.manage`: the scope of the API behind Upsert User Risk, which only P10-T1 adds [API-8]. ⚠ UNVERIFIED that the card uses it.
   - `okta.eventHooks.manage`: needed by Okta connector event cards [API-6]. The fallback's Okta ITP event (wf-05, P10-T5 only) may need it too. ⚠ UNVERIFIED.

   If `okta.users.read` or `okta.schemas.read` isn't granted, stop and tell the executor; granting a scope changes an existing app and needs approval. Report the other four either way, so U9 is known before P8-T1.
3. Open Admin Console > **Workflow** > **Workflows console**. It opens on the **Home** page; click **Flows** to open the Flows page [SCR-1]. Opening the console needs the **Okta Workflows** app assigned to your account. If you can't open it, stop and tell the executor; assigning an existing app needs approval.

## 1. Folder

1. On the Flows page, click the **+** button in the side navigation panel [SCR-2].
2. In the **Create new folder** dialog:
   - Name: `POC-ITP-FBM`.
   - Description: `POC: ITP FBM logout`.
3. Click **Save**.

## 2. Tables

Select folder `POC-ITP-FBM` and open its **Tables** tab [SCR-3]. For each table below:

1. Click **+ New Table** (top right).
2. Type the table name exactly, and leave the description empty.
3. Click **+ New Column** once per row of the table below. Type the column name exactly, choose the type, and confirm.

### `POC-FBM Logout Registry`

| Column | Type |
| --- | --- |
| `App name` | String |
| `App instance ID` | String |
| `Method` | String |
| `Endpoint or API` | String |
| `Identifier attribute` | String |
| `Enabled` | Boolean |

Then import the rows:

1. Click **Import**. The **Import Data** dialog opens.
2. Click **Choose CSV File** and pick `tables/poc-fbm-logout-registry.csv` from the repo.
3. For each CSV field, check that the table column with the same name is selected. It's the default when the names match.
4. Click **Import**.

Expected: 4 rows. **Test only:** these rows point at the mock app. A deployment adds one row per real FBM app instead.
- `POC-FBM-OIDC`, `POC-FBM-SAML`, and `POC-Mock-Vendor` show Enabled = true.
- `POC-Disabled-Canary` shows Enabled = false.

**Report what Enabled shows for each row**; this settles U8. If a value is empty or wrong, click the cell, set it by hand [SCR-3], and say which rows you fixed.

### `POC-FBM Logout Results`

| Column | Type |
| --- | --- |
| `Time` | Date |
| `User ID` | String |
| `App name` | String |
| `Status code` | Number |
| `Outcome` | String |

Leave it empty. `tables/poc-fbm-logout-results.csv` holds only the header, for reference.

### `POC-Respond Probe`

| Column | Type |
| --- | --- |
| `Time` | Date |
| `Input User ID` | String |
| `Okta User ID` | String |
| `Caller ID` | String |
| `Caller Type` | String |
| `Caller Display Name` | String |
| `Caller Alternate ID` | String |

Leave it empty. **Test only:** it records what the Delegated Flow card receives (wf-03 Part A). A deployment doesn't need it.

## 3. Connections

Create each connection on the Workflows Console **Connections** page and give folder `POC-ITP-FBM` access to it [SCR-4]. A connection that isn't added to the folder can't be used by the folder's flows.

1. On the **Connections** page, click **New Connection**, then click the connector's icon.
2. Click **Folder Access (optional)** and select `POC-ITP-FBM`.
3. Fill in the fields given below for that connection, then click **Create**.

If you missed Folder Access, find the connection on the Connections page, click **Open** next to its connector, and use **Assign Folders** to add `POC-ITP-FBM`. If your folder has its own **Connections** tab, creating the connection there also works; it's then usable only in that folder.

| Connection | Connector | Auth type | Create when | In a deployment |
| --- | --- | --- | --- | --- |
| `POC-Okta` | Okta | (OAuth, Okta Workflows OAuth app) | always | Reusable |
| `POC-Okta ITP` | Okta ITP | (OAuth, Okta Workflows OAuth app) | always | Reusable |
| `POC-API None` | API Connector | None | always | Reusable, oauth mode: the `gtr` calls |
| `POC-Mock Vendor (Custom Header)` | API Connector | Custom Header | always | Test only: the mock's API key |
| `POC-AS Token (Basic)` | API Connector | Basic | `GTR_AUTH_MODE=oauth` | Reusable, oauth mode: the token request |
| `POC-Mock GTR Static (Custom Header)` | API Connector | Custom Header | `GTR_AUTH_MODE=static` | Conditional: static mode only |

### `POC-Okta` (Okta connector) [CON-1]

1. In a second tab, read the client credentials from the **existing** Okta Workflows OAuth app, without changing anything there [SCR-12]: Admin Console > **Applications and Resources** > **Applications** > **Okta Workflows OAuth** > **Sign On** tab > **Client ID** and **Client secret**. Copy them straight into the dialog below; they never go into the repo or the chat.
2. On the Connections page: **New Connection** > **Okta**. Under **Folder Access (optional)**, select `POC-ITP-FBM`.
3. In the New Connection window:
   - **Connection Nickname**: `POC-Okta`.
   - **Domain**: `<org subdomain>.oktapreview.com`, with no `https://` and no `-admin`.
   - **Client ID** and **Client Secret**: paste them from step 1.
4. On the **Permissions** tab, choose **Use default scopes**.
5. Click **Create**. If Okta asks you to sign in, sign in as the connection account.

If creation fails with an authorization error, the connection account may not be assigned to the Okta Workflows OAuth app [SCR-12]. Stop and tell the executor; assigning it changes an existing app and needs approval.

### `POC-Okta ITP` (Okta ITP connector) [CON-2]

Repeat the `POC-Okta` steps with **New Connection** > **Okta ITP**, Folder Access `POC-ITP-FBM`, Connection Nickname `POC-Okta ITP`, the same Domain, Client ID, and Client Secret, and **Use default scopes**.

### API Connector connections [CON-3]

For each connection below:

1. Click **New Connection** > **API Connector**.
2. Under **Folder Access (optional)**, select `POC-ITP-FBM`.
3. Enter the nickname.
4. Choose the auth type from the dropdown.
5. Fill in its values and click **Create**.

If the selector has no **API Connector** icon, skip these three for now. Create each one later from the **+ New Connection** button on the first Raw Request card that uses it, with the same values. That card is in wf-01 for `POC-API None`, `POC-Mock Vendor (Custom Header)`, and `POC-Mock GTR Static (Custom Header)`, and in wf-02 for `POC-AS Token (Basic)`. Tell the executor.

- **`POC-API None`**: auth type **None**. No values.
- **`POC-Mock Vendor (Custom Header)`**: auth type **Custom Header**; the page also calls it **Custom**, so pick whichever exists.
  - **Header Name**: `X-API-Key`.
  - **Header Value**: run `npm run secret:copy -- MOCK_VENDOR_API_KEY`, then paste.
- **`POC-AS Token (Basic)`**, only when `GTR_AUTH_MODE=oauth`: auth type **Basic**.
  - **Username**: run `npm run secret:copy -- tf:dispatcher_client_id`, then paste.
  - **Password**: run `npm run secret:copy -- tf:dispatcher_client_secret`, then paste.
  - Workflows sends these as `Authorization: Basic …`, which is the `client_secret_basic` method the dispatcher client uses (U11).
- **`POC-Mock GTR Static (Custom Header)`**, only when `GTR_AUTH_MODE=static`: auth type **Custom Header**.
  - **Header Name**: `Authorization`.
  - **Header Value**: run `npm run secret:copy -- bearer:MOCK_GTR_STATIC_BEARER`, then paste. The copied value already starts with `Bearer `.

Workflows doesn't test API Connector connections when you create them. The first flow runs test them, in P6-T4.

## Checklist

- [ ] Folder `POC-ITP-FBM` exists.
- [ ] `POC-FBM Logout Registry` has 6 columns with the types above and 4 rows, with Enabled true, true, true, false.
- [ ] `POC-FBM Logout Results` has 5 columns and `POC-Respond Probe` has 7 columns, with the types above. Both are empty.
- [ ] The Connections page lists `POC-Okta`, `POC-Okta ITP`, `POC-API None`, `POC-Mock Vendor (Custom Header)`, and the one connection for this mode. Each shows **Folder Access** of 1 or more, the number of folders it's added to [SCR-4]. If a card in wf-01 or wf-02 later doesn't offer one of these connections, add the folder to it with **Open** > **Assign Folders** [SCR-4].
- [ ] You typed or pasted a secret only into a connection dialog, never into a table, a card, or the chat.

## Report to the executor

- Okta Workflows OAuth: which of `okta.users.read`, `okta.schemas.read`, `okta.users.manage`, `okta.universalLogout.manage`, `okta.userRisk.manage`, and `okta.eventHooks.manage` are granted.
- Registry: the row count, the Enabled value of each row (U8), and any cell you fixed by hand.
- Results and Probe: created and empty.
- Each connection: its name, its connector, and its Folder Access count.
- For `POC-Okta` and `POC-Okta ITP`, click the **Test connection** icon next to each on the Connections page and report the result [SCR-4]. API Connector connections get tested by the first flow runs, in P6-T4.
- Whether any connection had to be created another way, for example from a card.
- Anything that didn't match this sheet.
