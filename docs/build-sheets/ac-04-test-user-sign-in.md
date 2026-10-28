# ac-04 Test-user sign-in and the human steps for T1 and T5

Use a **separate browser profile or a private window** for test users, so your admin session isn't affected. The password for every POC test user comes from `npm run secret:copy -- POC_USER_PASSWORD`.

- User01's username is `poc-itp-user01@<POC_USER_EMAIL_DOMAIN>`.
- The mock app is at `<MOCK_BASE_URL>`.

## §1 First sign-in (P4-T3)

1. In the private window, open `<MOCK_BASE_URL>/oidc/login?as=custom`.
2. Sign in as user01 with the password. If Okta asks you to enroll an authenticator (org policy), enroll one on your phone.
3. The mock shows `Signed in as poc-itp-user01@… via custom authorization server. Refresh token: yes`.
4. In the same window, open `<MOCK_BASE_URL>/oidc/login?as=org`. You may not be asked to sign in again. The page should end with `via org authorization server. Refresh token: yes`.
5. Tell the executor the two `Refresh token:` values. It runs `npm run check -- oidc --user 01`.

The FBM app doesn't appear on the Okta End-User Dashboard; that's expected for FBM ([FBM known limitations](https://help.okta.com/oie/en-us/content/topics/apps/apps-fbm-known-issues.htm)).

## §2 T1 human steps (P8-T1)

The executor runs `npm run poc -- t1 prepare` and shows you this section.

1. Close all private windows, then open a new private window.
2. Open `<MOCK_BASE_URL>/oidc/login?as=custom` and sign in as user01.
3. In a second tab of the same window, open `<OKTA_ORG_URL>/app/UserHome`. You should see the End-User Dashboard.
4. Tell the executor "ready". It runs `npm run poc -- t1 run`, which raises user01's risk to High and watches for the logout. This takes up to 5 minutes.
5. When the executor says the registry calls have landed, reload the dashboard tab.
6. Answer the executor's three questions:
   1. Did the dashboard tab return to the Okta sign-in page? (yes/no)
   2. In the Workflows console, open `POC-ITP FBM – Respond`'s execution history and the newest execution. What Status Code did the Global Token Revocation card return?
   3. In table `POC-Respond Probe`, how many rows were added since you said "ready"?

## §3 T5 human steps (P8-T3)

The executor runs `npm run poc -- t5 prepare` and shows you this section.

1. Close all private windows, then open a new private window.
2. Open `<MOCK_BASE_URL>/oidc/login?as=custom` and sign in as user01. Confirm `Refresh token: yes`.
3. Open `<MOCK_BASE_URL>/oidc/login?as=org`. Confirm `Refresh token: yes`.
4. Tell the executor "ready". It runs `npm run poc -- t5 run`, which checks both refresh tokens, raises risk, waits for the logout, and checks the tokens again. It may also run the sweep probe. Nothing more is needed from you.
