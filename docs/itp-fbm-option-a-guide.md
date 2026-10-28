# ITP Universal Logout for FBM Apps: Option A Implementation Guide

Oct 27, 2026 · @Brian

## Overview

ITP runs one delegated flow that performs Okta's Global Token Revocation, then logs the user out of each Federation Broker Mode (FBM) app. The SOC can run the same flow by hand, and it needs no app assignments or containment group.

**The gap.** FBM is available only on custom SAML and OIDC app integrations, and Universal Logout (ULO) doesn't work for those apps while FBM is on. Okta's workaround is explicit user assignments ([FBM known limitations](https://help.okta.com/oie/en-us/content/topics/apps/apps-fbm-known-issues.htm)), which is the assignment volume this org moved to FBM to avoid.

**The approach.** The Okta ITP connector's Global Token Revocation card is the Workflows equivalent of a full ULO. It calls the same `/oauth2/v1/global-token-revocation` endpoint as the admin action that clears sessions for apps with logout enabled. The Clear User Sessions card, by contrast, only clears the Okta session ([Okta KB](https://support.okta.com/help/s/article/how-to-perform-universal-logout-using-workflows)).

After the card runs, the flow calls each FBM app's own logout method from a registry table. Apps with no logout method rely on short absolute session timeouts.

**Out of scope.** There's no containment group. After logout, re-entry is governed by the normal sign-in policies; see Limitations and residual risk.

**Alternatives considered.**

- *Shadow app event emitter:* ruled out. It needs one app user per person, the same assignment cost FBM avoids.
- *Native rule logout plus an event-card flow:* the fallback. The entity risk rule logs users out of Okta immediately, and a flow started by the User Risk Detected card handles the FBM apps. Use it only if test T6 shows the Okta-layer delay through Workflows is too long, because that flow must mirror the rule's conditions.

## At a glance

&#91;embedded content: response flow · 3 triggers, 1 delegated flow, FBM fan-out\]

Every trigger runs the same delegated flow: Global Token Revocation first, then one call per registry app.

## Prerequisites

Confirm these before you build; a missed connection-account exclusion is the one that breaks things.

- **Admin roles.** For the entity risk rule, a super admin or a custom role with Manage policy and the entity risk policy resource set. For session protection, a super admin or org admin.
- **Workflows plan.** Room for 3 active flows, or 4 with the optional email wrapper. Workflows Starter allows 5 ([Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm)).
- **Connections.** The Okta ITP connector for the Global Token Revocation card, the Okta connector for Read User, and a vendor connector with least-privilege admin credentials for each SaaS app in the registry.
- **Connection account exclusion.** Exclude the account that authorizes the Workflows Okta connections from every ITP rule. Clearing its sessions and tokens breaks the connection ([Okta KB](https://support.okta.com/help/s/article/Okta-Workflows-connection-fails-with-The-refresh-token-is-invalid-or-expired-error-and-requires-reauthorization)).
- **App inventory.** Sort the FBM apps into three groups: in-house apps that can expose a Global Token Revocation endpoint, SaaS apps with a session-revocation API, and apps with neither.
- **Phishing-resistant authenticators.** FastPass or FIDO2 available for the policies that guard FBM apps; without containment, this is the main control against re-entry.

## Step 1: Build the FBM logout registry

One Workflows table lists every FBM app that has a logout method; the dispatcher reads it on every run.

1. In the Workflows Console, open this project's folder and create a table named `FBM Logout Registry`.
2. Add these columns:

| Column | Type | Example | Purpose |
| --- | --- | --- | --- |
| App name | Text | Payroll Portal | Display and logging |
| App instance ID | Text | `0oa1example` | The FBM app's ID in Okta |
| Method | Text | `gtr` | `gtr` for in-house endpoints, `vendor` for SaaS APIs |
| Endpoint or API | Text | `https://payroll.example.com/global-token-revocation` | Where the per-app helper sends the call |
| Identifier attribute | Text | `email` | The Okta profile attribute the app keys users by |
| Enabled | True/False | `true` | Turns a row off without deleting it |

3. Add one row per FBM app that has a logout method. Leave apps with no logout method out.
4. Create a second table, `FBM Logout Results`, with the columns Time, User ID, App name, Status code, and Outcome.

A Workflows table holds up to 500,000 rows ([Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm)). The registry stays far below that, but export and clear the results table on a schedule.

## Step 2: Build the per-app helper flow

`FBM Logout – Per App` logs one user out of one app and reports the result; the dispatcher calls it once per registry row.

1. Create a flow named `FBM Logout – Per App` and add the Helper Flow event card with these inputs: Row (object), User profile (object), Access token. Then use Object – Get to read the identifier value from the profile, with the row's Identifier attribute as the key.
2. Add a branch on the row's Method.
3. For `gtr` (in-house apps), use HTTP – Raw Request to POST to the row's Endpoint:
   1. Headers: `Authorization: Bearer <access token>` and `Content-Type: application/json`.
   2. Body: `{"sub_id":{"format":"email","email":"<profile email>"}}`.
   3. Only Okta can sign its native ULO token, so these endpoints also accept a client-credentials access token with a dedicated logout scope. Otherwise they follow Okta's Global Token Revocation contract ([Build Universal Logout for your app](https://developer.okta.com/docs/guides/oin-universal-logout-overview/)).
4. For `vendor` (SaaS apps), use the vendor connector's Custom API Action to call its session-revocation API with the identifier value (see Appendix).
5. Classify the status code:
   - 204, any other 2xx, or 404 (user not found): success.
   - 429 or 5xx: wait, then retry up to three times. Connector cards have built-in backoff and retry; raw HTTP calls need this logic ([Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm)).
   - 400, 401, 403, or 422: failure; don't retry.
6. Return the status code and outcome to the caller.

## Step 3: Build the dispatcher flow

`FBM Logout – Dispatcher` reads the registry and calls the per-app helper for every enabled row, one row at a time.

1. Create a flow named `FBM Logout – Dispatcher` with the Helper Flow event card and one input: User ID.
2. Okta – Read User with that user ID, to get the user's profile.
3. Tables – Search Rows on `FBM Logout Registry` where Enabled is true.
4. If any row's Method is `gtr`, get one client-credentials access token from your authorization server with HTTP – Raw Request.
5. List – For Each over the rows, calling `FBM Logout – Per App` with the row, the user profile, and the token.
6. Tables – Create Row in `FBM Logout Results` for each result.
7. Optional token sweep, only if test T5 shows an FBM OIDC refresh token survives:
   1. Okta – Custom API Action: GET `/api/v1/users/{userId}/clients` to list the clients that hold grants or tokens for the user.
   2. For each client, DELETE `/api/v1/users/{userId}/clients/{clientId}/tokens` to revoke its refresh tokens ([User OAuth 2.0 token management API](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserOAuth/)).

The dispatcher calls every enabled app instead of looking up which apps the user touched. A call for a user with no session is harmless, and it keeps a System Log search out of every run.

## Step 4: Build the respond flow

`ITP FBM – Respond` is the delegated flow that both ITP and the SOC run. It performs Global Token Revocation, then calls the dispatcher.

1. Create a flow named `ITP FBM – Respond`. Add the Delegated Flow event card with one input, User ID; ITP's delegated flows take the user ID ([Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm)).
2. Okta ITP – Global Token Revocation: map the user ID into the card's User ID field (the opaque format, not ISS and SUB) ([Global Token Revocation card](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/globaltokenrevocation.htm)).
3. Check the card's status code. 204 means the user's tokens and sessions were revoked; 403 means the connection lacks permission. On anything other than 204, log and alert, but continue to the dispatcher.
4. Call Flow: `FBM Logout – Dispatcher` with the user ID.
5. Optional: Okta ITP – Upsert User Risk to set the user's risk to Low. Add it only if test T2 shows the card doesn't reset risk the way native ULO does.
6. Save the flow and turn it on.

Why step 5 matters: Okta sets entity risk to Low when the entity risk policy or Clear user sessions triggers ULO ([Elevate or lower an entity risk level](https://help.okta.com/oie/en-us/Content/Topics/itp/manual-actions.htm)). The entity risk policy is evaluated when a user's risk level changes ([View System Log events for ITP](https://help.okta.com/oie/en-us/content/topics/itp/system-log-events.htm)), so a user left at High may not trigger the rule again on a new detection.

## Step 5: Wire ITP to the respond flow

Point both ITP response engines at `ITP FBM – Respond`.

### Entity risk rule

1. In the Admin Console, go to Security > Entity Risk Policy and click Add Rule, or edit your High-risk rule.
2. Set the group membership, detection, and Entity Risk Level conditions. Exclude the Workflows connection account.
3. In Take this action, select Run a Workflow. In Workflow triggered by action, choose `ITP FBM – Respond` ([Add an entity risk policy rule](https://help.okta.com/oie/en-us/content/topics/itp/add-entity-risk-policy-rule.htm)).
4. Save, then drag the rule above the catch-all rule.

Each rule takes one action and at most one delegated flow, so add a separate rule for each risk level that needs a different response.

### Session protection

1. Go to Security > Identity Threat Protection > Detection and Response > Session Protection.
2. Under Enforcement settings, select Run an additional action > Run a workflow, and choose `ITP FBM – Respond`.
3. In Groups impacted, select the groups the action applies to. Set Status to Enforced and save ([Configure session protection](https://help.okta.com/oie/en-us/content/topics/itp/configure-session-protection.htm)).

Session protection's own logout clears only the session on the device where the violation happened ([Universal Logout revocations](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-revocations.htm)). This flow signs the user out everywhere. If that's too broad for session violations, point session protection at a lighter delegated flow that only calls the dispatcher.

## Step 6: Give the SOC a manual run

The SOC runs `ITP FBM – Respond` from the Admin Console when they log a user out by hand, because Clear user sessions alone doesn't reach FBM apps.

### Grant access

1. In the Admin Console, go to Security > Administrators and create a resource set that contains the `ITP FBM – Respond` delegated flow.
2. Create a custom admin role with the Run delegated flow permission.
3. Assign that role and resource set to the SOC analysts ([Delegated flows](https://help.okta.com/en-us/Content/Topics/automation-hooks/delegated-flows/about-delegated-flows.htm)).

### Run it

1. In the Admin Console, go to Workflows > Delegated flows.
2. Click Run next to `ITP FBM – Respond`.
3. Enter the user's Okta user ID and click Run ([Run a delegated flow](https://help.okta.com/oie/en-us/content/Topics/automation-hooks/delegated-flows/run-delegated-flow.htm)).

### Optional email wrapper

If analysts would rather enter an email address than an Okta user ID, build a second delegated flow, `ITP FBM – Respond by Email`, and add it to the same resource set:

1. Delegated Flow event card with one input, Email.
2. Okta – Read User, looking the user up by email or login.
3. Okta ITP – Global Token Revocation with the user's ID.
4. Call Flow: `FBM Logout – Dispatcher` with the user's ID.

## Testing and validation

Run these in a preview org in about half a day; the design passes when T1, T3, and T4 each produce one Global Token Revocation and one call to every registry app. Use test users only, because registry endpoints receive their email addresses.

### Setup

- Two or three test users covered by the entity risk rule and by session protection's Groups impacted.
- One FBM SAML app and one FBM OIDC app, each with a registry row pointing at a test endpoint you control.
- All flows on, the results table empty, and the System Log open.

### Test matrix

| Test | What it checks | How to run it | Pass |
| --- | --- | --- | --- |
| T1 | Entity risk rule | Directory > People > user > More actions > Elevate Risk Level, or the [Upsert the user's risk](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserRisk/#tag/UserRisk/operation/upsertUserRisk) API | The respond flow runs once, the card returns 204, the Okta session ends, and each registry app gets one call |
| T2 | Risk level after the flow | Check the user's risk level right after T1 | Record whether it reset to Low, then decide on Step 4's optional reset |
| T3 | Session protection | Add a test rule that denies one network zone, then move the user into it mid-session | The respond flow runs once and the FBM calls land |
| T4 | SOC manual run | Run the flow from Workflows > Delegated flows as a SOC admin | Same as T1 |
| T5 | FBM OIDC tokens | Get a refresh token for the FBM OIDC app, run T1, then try to refresh | The refresh fails; if it works, add Step 3's token sweep |
| T6 | Latency | Compare the rule's event time, the card's response time, and the last registry call | Seconds per step recorded, and an acceptable Okta-layer delay agreed |
| T7 | Burst | Raise 25 test users to High within one minute through the API | Every user processed once, 429s retried, nothing stuck in progress |

### Go/no-go

1. If T6's Okta-layer delay is unacceptable, switch to the fallback: set the rule to Logout and revoke tokens, and start the dispatcher from the User Risk Detected card, filtered to escalations to High.
2. If T5 fails, add the token sweep to the dispatcher.
3. If T2 shows the risk stays High, decide whether to add the Upsert User Risk step.

## Scale and operations

ITP fires on risk changes and session violations, not on every sign-in, so this design runs well inside Workflows limits. Watch three things: Okta connector concurrency, vendor API limits in a mass incident, and the lack of a latency guarantee.

| Limit | Value | What it means here |
| --- | --- | --- |
| Active flows | Starter 5, Light 50, Medium 150, Maximum unlimited | This design uses 3, or 4 with the email wrapper |
| Step executions | Starter 50 million per month; no limit on Light, Medium, or Maximum | Not a constraint at ITP volumes |
| Okta connector concurrency | 30 concurrent requests per org | Shared with every other flow, so keep the fan-out sequential |
| Okta connector volume | 6,000 requests per minute per org | Ample for Read User and token calls |
| Flow invocations through the API | 10 per second per flow | Watch for queuing in burst test T7 |

Source: [Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm). The Okta ITP connector's limits aren't listed separately, so T7 also shows how Global Token Revocation behaves under a burst.

### Mass incidents

- Process each user's registry rows one at a time.
- Vendor connectors include built-in backoff and retry; the raw HTTP calls in the `gtr` branch rely on Step 2's retry logic.
- If one incident can flag hundreds of users, route the dispatcher's work to an external queue or SOAR that paces calls to each vendor.

### Latency

Workflows has no latency SLA, and in this design the Okta-layer logout also waits on Workflows. Set expectations from T6, and keep the fallback in the Go/no-go list ready.

### Duplicates

The entity risk rule and session protection can both run the flow for one user within minutes. Revocation calls are safe to repeat, so duplicates only add load; add a recent-runs check keyed by user if that load matters.

### Monitoring

- Alert when the Global Token Revocation card returns anything but 204, and when registry calls return 401, 403, or 422.
- Watch the System Log events listed in the Appendix, and confirm in T1 which events the card writes.
- Review `FBM Logout Results` weekly for apps that keep failing.

### Maintenance

- Add a registry row when an FBM app gains a logout method, and disable rows for retired apps.
- Rotate vendor and client-credentials secrets on their normal schedule.
- Re-run T1 after any change to the entity risk policy or the flows.

## Limitations and residual risk

The main residual risk is re-entry: with no containment group, a user logged out by ITP can sign back in as soon as they pass the normal sign-in policies.

- **Re-entry without containment.** An attacker holding only stolen cookies must authenticate again and fails. One who can pass authentication, through a phished OTP or push fatigue, gets back in. Require phishing-resistant authenticators on the policies that guard FBM apps, and make sure risk returns to Low after logout (T2 and Step 4) so a new detection can fire the rule again.
- **Okta-layer timing.** The Okta session ends only when Workflows runs the flow, and Workflows has no latency SLA. The fallback restores an immediate Okta logout.
- **Manual logouts.** Clear user sessions in the Admin Console doesn't reach FBM apps; the SOC uses the delegated flow instead (Step 6).
- **Session protection scope.** The flow signs the user out on every device, which is broader than session protection's own per-device logout.
- **Connection account.** The account behind the Workflows Okta connections must stay excluded from every ITP rule.
- **Custom authorization server tokens.** Okta's revocation table doesn't mark them as revoked by ULO, so T5 checks the FBM OIDC apps ([Universal Logout revocations](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-revocations.htm)).
- **Vendor behavior differs.** Okta lists the Microsoft apps as partial ULO that only revokes refresh tokens, and Slack ULO works only for Slack Enterprise accounts ([Third-party apps that support Universal Logout](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-supported-third-party-apps-list.htm)).
- **Apps with no logout method.** They rely on short absolute session timeouts. Idle timeouts don't help, because an attacker's activity keeps them alive.
- **Reporting.** Okta's ULO reporting doesn't show FBM apps; per-app results live in `FBM Logout Results`.

## Appendix

### Global Token Revocation request for in-house apps

```text
POST <endpoint URL>
Authorization: Bearer <access token>
Content-Type: application/json

{"sub_id": {"format": "email", "email": "user@example.com"}}
```

| Response | Meaning | Per-app helper treats it as |
| --- | --- | --- |
| 204 | User logged out | Success |
| 404 | User not found | Success |
| 400 | Malformed request | Failure |
| 401 or 403 | Missing or insufficient credentials | Failure, alert |
| 422 | App couldn't log the user out | Failure, alert |

Native Okta calls carry a JWT with typ `global-token-revocation+jwt`, signed with the key Okta uses for ID tokens or SAML assertions ([Build Universal Logout for your app](https://developer.okta.com/docs/guides/oin-universal-logout-overview/)).

### System Log events

| Event type | Appears when |
| --- | --- |
| `user.risk.detect` | An entity's risk level changes |
| `policy.entity_risk.action` | Okta evaluates the entity risk policy and invokes an action |
| `workflows.user.delegatedflow.run` | Okta runs a delegated flow in response to a session violation |
| `user.session.universal_logout` | Okta or an admin invokes ULO for a user |
| `user.session.clear` | An admin clears a user's sessions |
| `policy.auth_reevaluate.fail` | A session protection re-evaluation finds a policy violation |

Source: [View System Log events for Identity Threat Protection](https://help.okta.com/oie/en-us/content/topics/itp/system-log-events.htm).

### Vendor session-revocation APIs

These are the APIs Okta's own ULO connectors call; use them in the `vendor` branch.

| App | Session-revocation API | Note |
| --- | --- | --- |
| Box | Create jobs to terminate user sessions |  |
| Dropbox for Business | `/devices/list_member_devices`, then `/devices/revoke_device_session_batch` |  |
| Google Workspace | Admin SDK `users.signOut` | Also signs the user out of Google Cloud Platform |
| Salesforce | `AuthSession` object | Delete the user's session records |
| Slack | `admin.users.session.reset` | Slack Enterprise only |
| Zendesk | Delete session |  |
| Zoom | Revoke a user's SSO token |  |
| Microsoft apps | Refresh-token revocation | Partial: sessions last until access tokens expire |

Source: [Third-party apps that support Universal Logout](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-supported-third-party-apps-list.htm).

### Sources

- [Federation Broker Mode known limitations](https://help.okta.com/oie/en-us/content/topics/apps/apps-fbm-known-issues.htm)
- [Perform Universal Logout Using Okta Workflows (Okta KB)](https://support.okta.com/help/s/article/how-to-perform-universal-logout-using-workflows)
- [Global Token Revocation card](https://help.okta.com/wf/en-us/content/topics/workflows/connector-reference/oktaitp/actions/globaltokenrevocation.htm)
- [Create delegated flows for policy actions](https://help.okta.com/oie/en-us/content/topics/itp/workflows-itp-create-delegated-flows.htm)
- [Add an entity risk policy rule](https://help.okta.com/oie/en-us/content/topics/itp/add-entity-risk-policy-rule.htm)
- [Configure session protection](https://help.okta.com/oie/en-us/content/topics/itp/configure-session-protection.htm)
- [Elevate or lower an entity risk level](https://help.okta.com/oie/en-us/Content/Topics/itp/manual-actions.htm)
- [Delegated flows](https://help.okta.com/en-us/Content/Topics/automation-hooks/delegated-flows/about-delegated-flows.htm)
- [Run a delegated flow](https://help.okta.com/oie/en-us/content/Topics/automation-hooks/delegated-flows/run-delegated-flow.htm)
- [Universal Logout revocations](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-revocations.htm)
- [Third-party apps that support Universal Logout](https://help.okta.com/oie/en-us/content/topics/itp/universal-logout-supported-third-party-apps-list.htm)
- [View System Log events for Identity Threat Protection](https://help.okta.com/oie/en-us/content/topics/itp/system-log-events.htm)
- [Build Universal Logout for your app](https://developer.okta.com/docs/guides/oin-universal-logout-overview/)
- [Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm)
- [User OAuth 2.0 token management API](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserOAuth/)
- [Okta KB: Workflows connection fails after its sessions are cleared](https://support.okta.com/help/s/article/Okta-Workflows-connection-fails-with-The-refresh-token-is-invalid-or-expired-error-and-requires-reauthorization)
