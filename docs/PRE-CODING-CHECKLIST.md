# Pre-coding checklist: what you need to do before the POC can run

This is the human-side setup for [PLAN.md](PLAN.md). It follows the plan's §7 prerequisites and the HUMAN tasks P1-T1, P1-T2, and P1-T4, using the click paths in [build-sheets/ac-01](build-sheets/ac-01-prerequisites-and-org-values.md), [ac-02](build-sheets/ac-02-api-token.md), and [ac-03 §1](build-sheets/ac-03-vercel.md).

**Plan change (2026-10-27):** this is a throwaway org, so Terraform and the setup scripts use a Super Administrator **API token** (`OKTA_API_TOKEN`) instead of a `POC-Provisioner` service app. The `POC-Harness` service app for tests is unchanged.

**You don't have to finish this before coding starts.** P0-T1 to P0-T3 (toolchain, guard, keys, secrets) need nothing from you, and I can start them as soon as you say go. This checklist gates everything after that. P0-T3 creates `.env` and the key pairs that Parts C to E depend on.

## Order of work

| Part | What | When | Your time |
| --- | --- | --- | --- |
| A | Gather accounts and facts (no repo needed) | Now | 30 to 45 min |
| B | Tell me Part A is done | After A | 1 min |
| (me) | I run P0-T1 to P0-T3 | After B | none |
| C | Fill `.env` and run the preflight (P1-T1) | After P0-T3 | 15 min |
| D | Add your Okta API token to `.env` (P1-T2) | After C | 5 min |
| E | Vercel token (P1-T4) | After P0-T3, any time, can run alongside C and D | 10 min |

## This machine (checked 2026-10-27)

| Tool | Needed | Found |
| --- | --- | --- |
| Node | 24 LTS | v24.21.0 |
| Terraform | 1.6 or later | v1.9.8 |
| git | any | 2.50.1 |
| `pbcopy` | present (macOS) | `/usr/bin/pbcopy` |
| Repo | `main`, remote `origin` | `origin` is `btbokta/FBM-App`, plus an `upstream` remote; one commit so far |

Nothing to install. The `origin` repo is public. `.gitignore` already covers `.env`, `keys/`, `state/`, and `.vercel/`. I commit locally and won't push unless you ask.

---

## Part A: Gather now

Do these in any order. Write the answers in a scratch note. Don't create `.env` yourself, because `npm run setup:secrets` creates it in P0-T3.

### A1. A dedicated Okta preview org

- [ ] You have an org whose URL ends in `.oktapreview.com`. Example: `https://acme-poc.oktapreview.com`.
- [ ] It is **not** a customer tenant and not a shared or production org. The POC changes session protection org-wide, creates 25+ users, and adds an entity risk rule.
- [ ] Write down the URL with **no trailing slash and no `-admin`**.

The guard in the scripts refuses anything that isn't `*.oktapreview.com`. I won't edit the expected-org values to get past it.

### A2. The connection account

This is the super admin who will authorize every Workflows connection later (P6-T1).

- [ ] You can sign in to the org's Admin Console as a Super Administrator with this account.
- [ ] Open **Directory > People**, search for the account, open it, and copy the `00u…` ID from the browser URL. Write it down. It becomes `OKTA_WF_CONNECTION_USER_ID`.
- [ ] You understand the one rule: **never clear this account's sessions or sign it out everywhere.** Doing that breaks every Workflows connection ("The refresh token is invalid or expired", F52). The plan excludes this account from the entity risk rule and session protection, and keeps it out of `POC-ITP-Test`.

### A3. ITP is enabled

- [ ] In the Admin Console, **Security > Identity Threat Protection** exists.
- [ ] **Security > Entity Risk Policy** exists.

If either is missing, stop and tell me. ITP isn't enabled and the POC can't run.

### A4. Workflows plan and flow headroom

- [ ] Open **Workflows > Workflows console**. Write down the plan name (Starter, Light, Medium, or Maximum).
- [ ] Count the flows currently ON.
- [ ] Confirm there are at least 5 free active-flow slots. Starter allows 5 in total, and the POC needs 4 (5 with the optional fallback flow).

### A5. Authenticators and phone

- [ ] You have a phone with an authenticator app that the org's enrollment policy accepts. You need it for `poc-itp-user01` and `poc-soc-admin`.
- [ ] Quick check only: open **Security > Authenticators > Enrollment** and confirm the **Email** authenticator isn't required. Test users are created with a password and an email address (login = email), and nothing is ever sent to them, so the default `example.com` works. Only if Email is required would you need a domain with a catch-all inbox for `POC_USER_EMAIL_DOMAIN`.

### A6. Second network for T3

T3 changes your IP address mid-session, so it needs a network that differs from your usual one.

- [ ] Connect this computer to the second network, such as a phone hotspot.
- [ ] Open `https://ifconfig.me` and write down the public IP. Add `/32`, for example `203.0.113.7/32`. It becomes `POC_DENY_ZONE_CIDR`.
- [ ] Reconnect to your normal network and confirm its IP is different.

Hotspot IPs can change. If you reconnect later and the IP has moved, update `POC_DENY_ZONE_CIDR` before T3.

### A7. Vercel account

- [ ] You have a Vercel account that can create a project and an access token.
- [ ] **If this POC is part of paid work, use a Pro team.** Hobby is non-commercial personal use only (F66). Write down which plan and the team slug.
- [ ] In the team's settings, the default Deployment Protection is **not** "All Deployments". Standard Protection is fine, because it leaves the production domain public and Okta Workflows has to reach it.

### A8. Agreement on data flow

- [ ] You agree that the POC test users' email addresses (`poc-itp-userNN@…`) are sent to the Vercel-hosted mock app and stored in Upstash Redis. Why: Okta's logout request identifies the user by email, so the mock has to receive it, and Vercel functions share no memory, so session state and the call log live in Redis keyed by email. These are synthetic users, never real people, and the store is removed at teardown.
- [ ] No customer names, tenant IDs, or deal details go into this repo, the Okta org, or the mock app. That follows your global customer-data rule.

### A9. Browser setup (my recommendation, not in the plan)

- [ ] Create a separate browser profile (or use private windows) for test-user sign-ins. You will be signed in as the connection admin in one place and as `poc-itp-user01` or `poc-soc-admin` in another. Mixing them in one session is how the connection account gets logged out by accident.

### A10. Time

- [ ] About five hours in three blocks: setup (P1 and P2, about 1 hour), the Workflows build (P6 and P7, about 2.5 hours), and tests (P8 and P9, about 1.5 hours). This checklist is the first part of the setup block.

---

## Part B: Hand over to me

Tell me "Part A done" and include:

- [ ] Workflows plan and how many flows are ON
- [ ] Whether the Email authenticator is required
- [ ] Vercel plan (Pro or Hobby) and the team slug
- [ ] Anything that didn't match above

Don't paste the org URL, user IDs, or tokens into chat. They go in `.env` in Part C.

I then run P0-T1 (toolchain), P0-T2 (env schema, preview-org guard, Okta client), and P0-T3 (generate the harness key pair and all local random secrets). Each is a separate commit. I'll tell you when P0-T3 is done.

---

## Part C: Fill `.env` and run the preflight (P1-T1)

Start this after I report P0-T3 done. Edit `.env` directly in the repo root. I never read values back.

- [ ] Set these:

| Variable | Value | From |
| --- | --- | --- |
| `OKTA_ORG_URL` | `https://<sub>.oktapreview.com` | A1 |
| `POC_EXPECTED_ORG_URL` | identical to `OKTA_ORG_URL` | A1 |
| `OKTA_WF_CONNECTION_USER_ID` | the `00u…` ID | A2 |
| `POC_USER_EMAIL_DOMAIN` | `example.com`, unless A5 says Email is required | A5 |
| `POC_DENY_ZONE_CIDR` | the second network's IP with `/32` | A6 |

- [ ] Tell me. I run `npm run env:check` and `npm run preflight`. The preflight prints `PASS guard org=00o… url=…`.
- [ ] Copy that `00o…` org ID into `POC_EXPECTED_ORG_ID` in `.env`, and tell me. I rerun the preflight to confirm the same ID.

**Done when:** `env:check` shows `set` for all six variables above, `preflight` prints `PASS guard` with that org ID, and you have at least 5 free flow slots.

---

## Part D: Add your Okta API token to `.env` (P1-T2)

Terraform and the setup, session protection, and teardown scripts authenticate with this token. It carries the full privileges of the Super Administrator who created it ([ac-02](build-sheets/ac-02-api-token.md)).

1. [ ] Use an existing Super Administrator token for this org, or create one: **Security > API > Tokens > Create token**, name `POC-Terraform`. Okta shows the value only once.
2. [ ] Paste it after `OKTA_API_TOKEN=` in `.env`. Edit the file directly; don't paste the token into chat.
3. [ ] Optional: restrict the token to this computer's public IP when creating it. If you do, the scripts fail from any other network, including the T3 hotspot.
4. [ ] Tell me. I run `npm run preflight`.

**Done when:** the preflight prints four PASS lines: `guard`, `org`, `ITP entity risk policy`, and `session protection policy`. If the entity risk or session protection line fails, ITP isn't fully enabled in the org (A3). After that I run P1-T3 myself to record the org and policy IDs.

**Token notes:** it expires after 30 days without use, and Okta removes it if the creating account is deactivated. Revoke it at teardown (ac-09 step 5).

---

## Part E: Vercel token (P1-T4)

You can do this any time after P0-T3, in parallel with C and D.

1. [ ] Pick the Vercel team for the mock app (from A7).
2. [ ] In the Vercel dashboard, go to Account Settings > Tokens and create a token named `POC-FBM-Mock`, scoped to that team, with a 30-day expiry. The plan marks this menu path as unverified (U28). If it differs, look under the account or team settings for access tokens.
3. [ ] Paste the token into `VERCEL_TOKEN` in `.env`.
4. [ ] Tell me the plan (Pro or Hobby) and team slug if you haven't already. I run `npx vercel whoami` and record `vercel.plan`.

**Done when:** `whoami` prints a username and exits 0.

---

## After this checklist

When Parts C to E are done, I continue on my own through P2 (mock app on Vercel) and P3 (Terraform). The next time I need you is **P2-T6**, a one-time interactive command to attach Upstash Redis, because it needs terms acceptance. The Workflows build starts at P6-T1.

## Things not to do

- Don't paste the Okta API token, the Vercel token, private keys, client secrets, or `POC_USER_PASSWORD` into chat. Edit `.env` directly, or use `npm run secret:copy -- <name>` to put a value on the clipboard.
- Don't commit `.env`, `keys/`, `state/`, or `.vercel/`.
- Don't point any of this at a customer or production org.
- Don't edit `POC_EXPECTED_ORG_URL` or `POC_EXPECTED_ORG_ID` to get past a guard abort. Tell me instead.
- Don't use the connection account to sign in as a test user, and don't clear its sessions.
