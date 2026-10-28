# ac-03 Vercel (P1-T4, P2-T5, P2-T6)

Sources: [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [Deployment Protection](https://vercel.com/docs/deployment-protection), [vercel integration](https://vercel.com/docs/cli/integration), [Vercel Redis](https://vercel.com/docs/redis).

## §1 Account, plan, and token (P1-T4)

1. Choose the Vercel team for the mock app. **If this POC is part of paid work, use a Pro team.** Hobby is limited to "non-commercial personal use only".
2. In the team's settings, check that the default Deployment Protection isn't **All Deployments**. Standard Protection is fine: it leaves the production domain public, and Okta Workflows must reach it.
3. Create an access token in the Vercel dashboard (Account Settings > Tokens): name `POC-FBM-Mock`, scope this team, expiry 30 days. The exact menu path isn't verified (U28).
4. Paste the token into `VERCEL_TOKEN` in `.env`.
5. Tell the executor the plan (Pro or Hobby) and the team slug.

## §2 Install Upstash Redis on the project (P2-T6)

The executor has already created and linked the project. In a terminal at the repo root:

1. `cd mock-app`
2. `set -a; . ../.env; set +a` loads `VERCEL_TOKEN` without printing it.
3. `npx vercel integration add upstash/upstash-kv --name poc-fbm-mock-kv -e production --no-env-pull`
4. Answer the prompts: accept the Upstash terms, choose the **Free** plan, and connect it to the linked project.
5. `cd ..`

Tell the executor you're done; it lists the env var names to confirm.

## §3 Production domain (only if P2-T5 blocks)

1. In the Vercel dashboard, open the project named `VERCEL_PROJECT_NAME` and go to Settings > Domains.
2. Copy the `*.vercel.app` production domain.
3. Set `MOCK_BASE_URL=https://<that domain>` in `.env` and tell the executor.
