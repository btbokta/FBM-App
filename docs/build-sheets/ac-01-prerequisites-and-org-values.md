# ac-01 Prerequisites and org values (P1-T1)

Fill these values in `.env` in the repo root. Edit the file directly; the executor never reads values back.

## 1. Org URL

1. Copy your preview org's URL, for example `https://acme-poc.oktapreview.com`, with no trailing slash and no `-admin`.
2. Set both `OKTA_ORG_URL` and `POC_EXPECTED_ORG_URL` to it.

## 2. ITP and Workflows are on

In the Admin Console:

1. Confirm **Security > Identity Threat Protection** and **Security > Entity Risk Policy** exist ([Entity risk policy](https://help.okta.com/oie/en-us/content/topics/itp/entity-risk-policy.htm)). If not, stop: ITP isn't enabled.
2. Open **Workflows > Workflows console**. Note the Workflows plan (Starter, Light, Medium, or Maximum) and how many flows are currently ON. Starter allows 5 active flows in total; the POC needs 4, or 5 with the fallback ([Workflows system limits](https://help.okta.com/wf/en-us/Content/Topics/workflows/workflows-system-limits.htm)).

## 3. Connection account

The connection account is the super admin who will authorize the Workflows connections in wf-00. Use your own super admin account.

1. **Directory > People**, search for that account, and open it.
2. The user ID is the `00u…` value in the browser URL. Set `OKTA_WF_CONNECTION_USER_ID` to it.

This account must never be in `POC-ITP-Test`. Every rule and flow in the POC excludes it.

## 4. Test-user email domain

`POC_USER_EMAIL_DOMAIN` defaults to `example.com`. Test users get passwords directly, so no email is needed. Change it only if your org's authenticator enrollment policy requires the **Email** authenticator (check Security > Authenticators > Enrollment). In that case use a domain with a catch-all inbox you can read.

## 5. Deny zone for T3

1. Connect this computer to your second network (for example your phone's hotspot).
2. Look up the public IP, for example by opening `https://ifconfig.me`.
3. Set `POC_DENY_ZONE_CIDR` to that IP with `/32`, for example `203.0.113.7/32`.
4. Reconnect to your normal network and confirm its public IP is different.

## 6. Run the preflight

Tell the executor you're done. It runs `npm run preflight`, which prints `PASS guard org=00o… url=…`.

1. Copy the `00o…` org ID into `POC_EXPECTED_ORG_ID`.
2. Tell the executor; it runs the preflight again.

## Report to the executor

- Workflows plan and number of flows currently ON.
- Whether the Email authenticator is required for enrollment.
- Any step that didn't match.
