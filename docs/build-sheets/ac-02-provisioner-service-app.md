# ac-02 POC-Provisioner service app (P1-T2)

This is the OAuth 2.0 service app that Terraform and the setup and teardown scripts use. It authenticates with private key JWT. Sources: [Implement OAuth for Okta with a service app](https://developer.okta.com/docs/guides/implement-oauth-for-okta-serviceapp/main/), [DPoP default (Okta KB)](https://support.okta.com/help/s/article/receiving-use-dpop-nonce-error-when-requesting-access-token).

## Steps

1. **Applications > Applications > Create App Integration > API Services > Next.** App integration name: `POC-Provisioner`. Save.
2. **General** tab > **Client Credentials** > **Edit**:
   1. Set Client authentication to **Public key / Private key**.
   2. Under Public keys, click **Add key**.
   3. Run `npm run secret:copy -- jwk:provisioner` in the repo and paste. This is the public key only.
   4. Click **Done**, then **Save**.
   5. Confirm the key's KID shown in the table equals `OKTA_PROVISIONER_KEY_ID` in `.env`. If Okta shows a different KID, put Okta's value in `.env`.
3. **General** tab > **General Settings** > **Edit**. Under **Proof of possession**, clear **Require Demonstrating Proof of Possession (DPoP) header in token requests**. Save.
4. **Okta API Scopes** tab: click **Grant** for each of these, and only these:
   - `okta.users.manage`
   - `okta.users.read`
   - `okta.groups.manage`
   - `okta.groups.read`
   - `okta.apps.manage`
   - `okta.apps.read`
   - `okta.appGrants.manage`
   - `okta.policies.manage`
   - `okta.policies.read`
   - `okta.authorizationServers.manage`
   - `okta.authorizationServers.read`
   - `okta.networkZones.manage`
   - `okta.networkZones.read`
   - `okta.roles.manage`
   - `okta.roles.read`
   - `okta.orgs.read`
   - `okta.schemas.read`
   - `okta.logs.read`
5. **Admin roles** tab > **Edit assignments** > Role: **Super Administrator** > **Save changes**. Terraform needs it to create custom admin roles, resource sets, and the entity risk rule.
6. Copy the **Client ID** from the General tab into `OKTA_PROVISIONER_CLIENT_ID` in `.env`.

Tell the executor you're done. It runs `npm run preflight` and expects five PASS lines.

## Contingency: harness roles (used only if P3-T6 blocks on role assignment)

If Terraform can't assign admin roles to `POC-Harness`, do it here:

1. **Applications > Applications > POC-Harness > Admin roles** tab > **Edit assignments**.
2. Add **Read-only Administrator**. Save.
3. **Add assignment**: Role `POC-Harness-Risk`, Resource set `POC-ITP-Test-Users`. Save.

Tell the executor; it runs `npm run check -- harness`.
