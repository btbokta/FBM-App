# Set up the Okta connections for the FBM logout flows

The flows reach your Okta org through two Okta Workflows connections: **Okta** (user lookups and Custom API Actions) and **Okta ITP** (Global Token Revocation and user risk). Both authorize through the org's built-in **Okta Workflows OAuth** app. You create them once per org, so do this again in every new environment.

These steps are org-neutral. The POC's build sheet, [wf-00](build-sheets/wf-00-folder-tables-connections.md) §3, holds the same steps with POC names. Console labels come from the [Workflows card reference](build-sheets/wf-card-reference.md) (SCR-12, CON-1, CON-2).

This page is not about the Super Administrator API token in `OKTA_API_TOKEN`. That token is for Terraform and the setup scripts only (see [ac-02](build-sheets/ac-02-api-token.md)). The flows never use it.

## What you need

- **The connection account:** a Super Administrator that you can sign in as. The account that creates the connections must be assigned to the Okta Workflows OAuth app and have super admin credentials. Every flow refuses to act on this account, so note its user ID. Keep it out of every ITP rule and out of the groups the rules target.
- **Access to the Workflows console:** the **Okta Workflows** app must be assigned to that account.
- **Your org domain**, for example `acme.okta.com`: no `https://`, and no `-admin`. A preview org looks like `acme.oktapreview.com`.
- **A Workflows folder** for the flows, if you use Folder Access Control.

## 1. Check the Okta Workflows OAuth app

1. Sign in to the Admin Console as the connection account.
2. Go to **Applications and Resources** > **Applications** > **Okta Workflows OAuth** > **Okta API Scopes** tab.
3. Confirm these scopes are granted. A granted scope shows **Revoke**; one that isn't shows **Grant**.

   | Scope | Needed for |
   | --- | --- |
   | `okta.users.read` | Read User and the dispatcher's Custom API Action. Required |
   | `okta.schemas.read` | Read User. Required |
   | `okta.universalLogout.manage` | The API behind Global Token Revocation. Unverified that the card uses it |
   | `okta.userRisk.manage` | The API behind Upsert User Risk (risk reset only). Unverified that the card uses it |
   | `okta.users.manage` | The token sweep, if you build it |
   | `okta.eventHooks.manage` | Okta event cards. The fallback flow's event may need it. Unverified |

4. Grant the missing scopes. This changes an existing app, so get approval from whoever owns it. A card without a granted scope fails with an Insufficient Scope error.
5. If you change a scope after the connection exists, **reauthorize** the connection (see Troubleshooting).

## 2. Get the client credentials

On the same app, open the **Sign On** tab and copy the **Client ID** and **Client secret**. Paste them straight into the connection dialog. They never go in a file, a flow card, or chat.

These values differ in every org. Do not reuse another org's.

## 3. Create the Okta connection

1. Open the Workflows console: Admin Console > **Workflow** > **Workflows console**.
2. Go to the **Connections** page and click **New Connection** > **Okta**.
3. Under **Folder Access (optional)**, select your folder.
4. Fill in the dialog:
   - **Connection Nickname**: a name you will recognize, for example `Okta`.
   - **Domain**: your org domain, with no `https://` and no `-admin`.
   - **Client ID** and **Client Secret**: from step 2.
5. On the **Permissions** tab, choose **Use default scopes**. Choose **Customize scopes (advanced)** only if you need to limit them.
6. Click **Create**. If Okta asks you to sign in, sign in as the connection account and allow the request.

## 4. Create the Okta ITP connection

Repeat step 3 with these changes:
- Pick **Okta ITP** in the connector list. The Okta page's text says "Select the Okta connector", which looks copied; choose the Okta ITP icon.
- Use the same Domain, Client ID, and Client Secret.
- Choose **Use default scopes**.
- Use a different nickname, for example `Okta ITP`.

## 5. Create the Client Credentials connection

The Okta connectors can only call your Okta org, and they sign every call with the Okta Workflows OAuth app. The calls to your apps' GTR endpoints go to your apps' hosts, and need a token for the **dispatcher's own client**, so they use the standard **API Connector** card (Raw Request) with an API Connector connection of auth type **Client Credentials**. That connection fetches the token from your custom authorization server and adds `Authorization: Bearer …` to every request, so no flow card builds a header or passes a token.

(A Custom API Action can't do this: its relative path only resolves against your org's domain, and it signs with the Workflows app's own authorization.)

| Connection | Auth type | Used by | Needed when |
| --- | --- | --- | --- |
| GTR calls | **Client Credentials** | Per App C8.6.1 | `oauth` mode |
| Static GTR bearer | **Custom Header** | Per App C8.6.1 | `static` mode, instead of the one above |

Don't use the **OAuth** auth type. It is an authorization-code flow (Authorize Path, redirect URI, signed-in user), and the dispatcher has no user.

### 5a. Create the dispatcher client in Okta first

Hand-tested on 2026-10-28; each of these caused a failure:

1. **Use the classic app wizard.** Applications > Create App Integration > choose the classic experience, then **API Services**. A client made with the new API Services wizard failed with `This client cannot use a custom authorization server` in the server's Token Preview.
2. **Turn DPoP off.** On the app's General tab > General Settings, clear **Require Demonstrating Proof-of-Possession (DPoP) header in token requests**. If it stays on, the Workflows connection fails with `invalid_dpop_proof_missing_header` (Token Preview doesn't send the DPoP check, so it passes there and misleads).
3. **Add an access policy and rule** on the custom authorization server (Security > API > the server > Access Policies). Assign the client to the policy, and add a rule that allows the **Client Credentials** grant and your logout scope. Without it, System Log shows `access_denied` with empty `GrantedScopes`.
4. **Define the scope** on that server.
5. Use the server's **Token Preview** tab (client, grant type Client Credentials, your scope) to confirm a token issues. Record `iss`, `aud`, `scp`, `cid` and `exp`; every GTR app must validate these.

### 5b. Create the connection in Workflows

1. On the **Connections** page, click **New Connection** > **API Connector**. If the list has no API Connector icon, create it from the **+ New Connection** button on the first Raw Request card that uses it, with the same values.
2. Under **Folder Access (optional)**, select your folder.
3. Enter a nickname, for example `GTR Client Credentials`.
4. Set the auth type to **Client Credentials** and enter:
   - **Access Token Path**: `<auth_server_issuer>/v1/token`, the **custom** server's issuer, for example `https://<org>.okta.com/oauth2/<authServerId>` (or `/oauth2/default`).
   - **Client ID** and **Client Secret**: the dispatcher service app's, pasted straight in.
   - **Scope**, if your form has the field: your logout scope. Okta's documentation lists only the path, ID, and secret, but a hand test sent `fbm.logout` and succeeded, so check what your form offers. ⚠ UNVERIFIED where the scope is entered; note it here once you know.
5. Click **Create**.

Workflows doesn't test API Connector connections when you create them. Test it as below.

For static mode, create an API Connector connection of type **Custom Header** instead, with Header Name `Authorization` and Header Value `Bearer <the shared token>` (include the word `Bearer` and a space).

### 5c. Test the connection

1. In a scratch flow, add an API Connector **Raw Request** card using the connection. Use `GET <your org>/oauth2/<server>/v1/userinfo` as the URL and click **Run this card**.
2. Expect an error with `statusCode` 403 and a `www-authenticate` header containing `insufficient_scope` (the token has no `openid` scope, which a client-credentials token can never carry). Okta only reports a scope problem after accepting the token, so this shows a valid token was attached. A 401 would mean no valid token was sent.
3. A plain `GET …/v1/keys` returns 200 whether or not a token was sent, so it proves nothing.
4. Raw Request errors on a non-2xx response, and the status is at `statusCode` on the error object (there is no `code` key).
5. Not yet verified: whether the connection refreshes the token after it expires. Set the policy rule's access token lifetime to 5 minutes, run the card, wait more than 5 minutes, and run it again; a second 403 `insufficient_scope` (not a 401 `invalid_token`) means it refreshes. P6-T4 records the result (U11).

Troubleshooting a failed connection or call: open Reports > System Log, filter `eventType eq "app.oauth2.as.token.grant"`, and read the `Reason` (`access_denied` = policy or rule, `invalid_dpop_proof_missing_header` = DPoP still on, `invalid_client` = wrong ID or secret). Never paste the log's `ClientSecret` field into chat or a file; rotate the secret if you did.

## 6. Make sure the flows can use them

- If you missed **Folder Access**, go to the **Connections** page, click **Open** next to the connector, and use **Assign Folders** to add your folder.
- If you imported the flows from a `.folder` file, the export dropped every connection. Open each card below and choose the connection again:

  | Flow | Okta | Okta ITP |
  | --- | --- | --- |
  | Dispatcher | C4, and the Part B Custom API Action cards (H5.1 in the sweep helper) | |
  | Respond | C8.1 | C13, if Part C was added |
  | Respond by Email | C3 | C5.1 |
  | Fallback | C6 | C1 |

## 7. Check it

1. The Connections page lists both connections with a **Folder Access** of 1 or more.
2. Open a flow that uses one and run a card that calls Okta, or run the dispatcher for a test user. A 200 from the Custom API Action (`GET /api/v1/users/{id}`) confirms the Okta connection. A 204 from Global Token Revocation confirms Okta ITP.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Authorization error when you create the connection | The connection account isn't assigned to the Okta Workflows OAuth app, or isn't a super admin. Assigning it changes an existing app, so get approval |
| Insufficient Scope error from a card | A scope in section 1 isn't granted. Grant it, then reauthorize the connection |
| A connection that worked stops working | Its refresh token is no longer valid. Reauthorize it. Only the connection's own super admin, a Workflows Administrator, or a Connection Manager can |
| Domain rejected | You included `https://` or `-admin`. Use the plain org domain |
| Cards show a missing connection after an import | Imports drop connections. Choose the connection again in each card listed in section 6 |

## Sources

- [Okta connector authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/authorization.htm)
- [Okta ITP authorization](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/overviews/authorization.htm)
- [Guidance for Okta connector](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/okta/overviews/guidanceforoktaconnector.htm)
