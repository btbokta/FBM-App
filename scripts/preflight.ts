import { loadEnv } from "./lib/env.js";
import { assertPreviewOrg, runGuarded } from "./lib/guard.js";
import { setFinding } from "./lib/findings.js";
import { provisionerClient } from "./lib/okta.js";

const record = process.argv.includes("--record");

interface PolicyCheck {
  type: string;
  label: string;
  finding: string;
}
const POLICY_CHECKS: PolicyCheck[] = [
  { type: "ENTITY_RISK", label: "ITP entity risk policy", finding: "itp.entityRiskPolicyId" },
  { type: "POST_AUTH_SESSION", label: "session protection policy", finding: "itp.postAuthSessionPolicyId" },
];

function saveFindings(values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) setFinding(key, value);
  console.log(`recorded ${Object.keys(values).join(", ")}`);
}

await runGuarded(async () => {
  const env = loadEnv(["OKTA_ORG_URL", "POC_EXPECTED_ORG_URL"]);
  const { orgId, orgUrl } = await assertPreviewOrg(env);
  console.log(`PASS guard org=${orgId} url=${orgUrl}`);

  if (!env.OKTA_API_TOKEN) {
    console.log("SKIP Okta API checks: OKTA_API_TOKEN is not set");
    if (record) throw new Error("--record needs OKTA_API_TOKEN");
    return;
  }

  const client = provisionerClient(env);
  const found: Record<string, string> = { "org.id": orgId };
  let failed = false;

  const org = await client.request("GET", "/api/v1/org");
  const subdomain = (org.body as { subdomain?: unknown } | null)?.subdomain;
  if (org.status === 200 && typeof subdomain === "string") {
    console.log(`PASS org subdomain=${subdomain}`);
  } else {
    // 401 means the API token is wrong, expired, or restricted to another network (F15a).
    console.log(`FAIL org: HTTP ${org.status}`);
    process.exitCode = 1;
    return;
  }

  for (const check of POLICY_CHECKS) {
    const res = await client.request("GET", "/api/v1/policies", { query: { type: check.type } });
    const policies = Array.isArray(res.body) ? (res.body as { id?: string }[]) : [];
    if (res.status === 200 && policies.length === 1 && policies[0]?.id) {
      console.log(`PASS ${check.label} ${policies[0].id}`);
      found[check.finding] = policies[0].id;
    } else {
      console.log(`FAIL ${check.label}: HTTP ${res.status}, ${policies.length} policies (expected 1; is ITP enabled?)`);
      failed = true;
    }
  }

  if (failed) {
    process.exitCode = 1;
    if (record) console.log("not recording: a check failed");
    return;
  }
  if (record) saveFindings(found);
});
