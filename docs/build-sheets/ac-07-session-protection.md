# ac-07 Session protection and the human steps for T3 (P9-T2, P9-T4, teardown)

Session protection has one policy per org. Its **Status applies to the whole org**; Groups impacted limits only the additional action. This org is dedicated to the POC. Before this sheet, the executor saved the rule (`npm run sp -- snapshot`) and excluded your connection account by API.

Sources: [Configure session protection](https://help.okta.com/oie/en-us/content/topics/itp/configure-session-protection.htm), [Continuous access evaluation](https://help.okta.com/oie/en-us/content/Topics/itp/continuous-access-evaluation.htm), [Enforce session protection (older layout)](https://help.okta.com/OIE/en-us/content/topics/itp/enforce-continuous-access.htm).

## §1 Record the original settings (P9-T2)

Go to **Security > Identity Threat Protection > Detection and Response** tab > **Session Protection**. In the older layout it's **Security > Authentication Policies > Session protection**.

Write down and send to the executor:
- **Status** (Monitoring or Enforced). In the older layout, the Enforce policies toggle and mode.
- **Session violation detection**: Risk level, and User's new IP is.
- **Enforcement settings**: inherited actions, Run an additional action, and Groups impacted.

The executor saves this to `reports/evidence/sp-original-ui.md` for teardown.

## §2 Apply the POC settings (P9-T2)

1. **Session violation detection > Edit**:
   - Risk level: **Low and above**
   - User's new IP is: **Any IP**
   - Save.
2. **Enforcement settings > Edit**:
   - Leave the inherited actions as they are.
   - Run an additional action: **Run a workflow**, then choose `POC-ITP FBM – Respond`.
   - Groups impacted: `POC-ITP-Test` only.
   - Save.
3. **Status**: **Enforced**. In the older layout: Enforce policies on, mode **Enforced with action**. Save.
4. Report the three values now shown (Status, workflow, Groups impacted). The executor runs `npm run sp -- verify`.

## §3 T3 human steps (P9-T4)

You need the second network whose IP is in `POC_DENY_ZONE_CIDR`. The FBM apps' sign-in policy denies `POC-ITP-Test` users from that zone (`POC-Deny-Zone` rule).

1. On your **normal** network, close all private windows and open a new one.
2. Open `<MOCK_BASE_URL>/oidc/login?as=custom` and sign in as user01.
3. In a second tab, open `<OKTA_ORG_URL>/app/UserHome`. Tell the executor "ready". It runs `npm run poc -- t3 arm`.
4. Switch this computer to the **second network**. Confirm your public IP matches `POC_DENY_ZONE_CIDR`. Then reload the dashboard tab, and reload `<MOCK_BASE_URL>/oidc/login?as=custom` in the first tab. Tell the executor "switched and reloaded". It runs `npm run poc -- t3 observe` for up to 9 minutes.
5. When asked, report how many `POC-Respond Probe` rows were added since step 3.
6. Switch back to your normal network.

## §4 Restore at teardown (ac-09 step 1)

Set every value from §1 back exactly as recorded, Status last. The executor's `npm run sp -- restore` puts the rule's conditions and actions back by API; this step covers Status and anything only the UI shows.
