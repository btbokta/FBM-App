# ac-06 SOC admin and the human steps for T4 (P7-T6, P8-T4)

`poc-soc-admin@<POC_USER_EMAIL_DOMAIN>` holds only custom role `POC-SOC-Delegated-Flows` on resource set `POC-SOC-Flows`. Its password comes from `npm run secret:copy -- POC_USER_PASSWORD`.

Sources: [About delegated flows](https://help.okta.com/en-us/Content/Topics/automation-hooks/delegated-flows/about-delegated-flows.htm), [Run a delegated flow](https://help.okta.com/oie/en-us/content/Topics/automation-hooks/delegated-flows/run-delegated-flow.htm).

## §1 First sign-in and visibility (P7-T6)

1. In a new private window, open `<OKTA_ORG_URL>` and sign in as the SOC admin. Enroll an authenticator if asked; the Admin Console usually requires MFA.
2. Open the Admin Console (the **Admin** button, or `https://<org subdomain>-admin.oktapreview.com`).
3. Go to **Workflows > Delegated flows**.
4. Report which flows are listed and whether each has an enabled **Run** button. Expect `POC-ITP FBM – Respond` and `POC-ITP FBM – Respond by Email`, or only the email wrapper if the probe outcome was C1.

## §2 T4 runs (P8-T4)

The executor runs `npm run poc -- t4 prepare` and gives you:
- user03's Okta user ID: `<user03 id>`
- user04's email: `<user04 email>`

In the SOC admin's private window, at **Workflows > Delegated flows**:

1. **T4**: click **Run** next to `POC-ITP FBM – Respond`, enter User ID `<user03 id>`, and click Run. Skip this under outcome C1.
2. **T4b**: click **Run** next to `POC-ITP FBM – Respond by Email`, enter Email `<user04 email>`, and click Run.
3. **T4c**: click **Run** next to `POC-ITP FBM – Respond`, leave User ID **blank**, and click Run. Skip this under outcome C1. It should stop at the guard and log nobody out.
4. Tell the executor "done". It runs `npm run poc -- t4 observe`.
5. Then answer, from the Workflows console execution history (signed in as yourself):
   1. Global Token Revocation Status Code for the T4 run.
   2. Global Token Revocation Status Code for the T4b run.
   3. Whether the T4c run stopped at the Continue If guard (yes/no).
