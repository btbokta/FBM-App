# ac-02 Okta API token (P1-T2)

Terraform and the setup, session protection, and teardown scripts authenticate with a Super Administrator's SSWS API token. It replaces the `POC-Provisioner` service app the plan first described (plan change, 2026-10-27: this org is a throwaway POC). Sources: [Create an API token](https://developer.okta.com/docs/guides/create-an-api-token/main/), [Terraform provider authentication](https://github.com/okta/terraform-provider-okta/blob/master/docs/index.md).

## Steps

If you already have a token from a Super Administrator, skip to step 4.

1. Sign in to the Admin Console as the Super Administrator whose privileges the token should carry. The token inherits that account's privileges, and Okta removes the token if the account is deactivated (F15a).
2. Go to **Security > API > Tokens > Create token**. The exact menu label wasn't re-checked on 2026-10-27; if it differs, look under Security > API.
3. Name it `POC-Terraform`. If the form offers a network restriction, leave it on any IP, or include this computer's public IP. Create the token and copy the value. Okta shows it only once.
4. Open `.env` in the repo root and paste the value after `OKTA_API_TOKEN=`. Edit the file directly; don't paste the token into chat.
5. Tell the executor you're done. It runs `npm run preflight` and expects four PASS lines: `guard`, `org`, `ITP entity risk policy`, and `session protection policy`.

## Things to know

- The token is valid for 30 days from creation or last use. If the POC sits idle for 30 days, create a new one.
- If the token has a network restriction, the scripts fail from any other IP.
- Anyone who has this token has your Super Administrator access. It lives only in `.env`, which is gitignored. Revoke it at teardown (ac-09 step 5).

## Contingency: harness roles (used only if P3-T6 blocks on role assignment)

If Terraform can't assign admin roles to `POC-Harness`, do it here:

1. **Applications > Applications > POC-Harness > Admin roles** tab > **Edit assignments**.
2. Add **Read-only Administrator**. Save.
3. **Add assignment**: Role `POC-Harness-Risk`, Resource set `POC-ITP-Test-Users`. Save.

Tell the executor; it runs `npm run check -- harness`.
