import type { PocEnv } from "./env.js";
import { redact } from "./redact.js";

export type GuardCode =
  | "ORG_URL_MISMATCH"
  | "NOT_PREVIEW"
  | "ORG_HREF_MISMATCH"
  | "ORG_ID_MISMATCH"
  | "ORG_UNREACHABLE";

export class GuardError extends Error {
  constructor(
    public readonly code: GuardCode,
    message: string,
  ) {
    super(message);
    this.name = "GuardError";
  }
}

type GuardEnv = Pick<PocEnv, "OKTA_ORG_URL" | "POC_EXPECTED_ORG_URL" | "POC_EXPECTED_ORG_ID">;

const PREVIEW_URL = /^https:\/\/[a-z0-9-]+\.oktapreview\.com$/;
const trimSlash = (s: string) => s.replace(/\/+$/, "");

/** Aborts unless OKTA_ORG_URL is the one preview org this POC was configured for (F23). */
export async function assertPreviewOrg(
  env: GuardEnv,
  fetchFn: typeof fetch = fetch,
): Promise<{ orgId: string; orgUrl: string }> {
  if (!env.OKTA_ORG_URL || !env.POC_EXPECTED_ORG_URL) {
    throw new GuardError("ORG_URL_MISMATCH", "OKTA_ORG_URL and POC_EXPECTED_ORG_URL must both be set");
  }
  const orgUrl = trimSlash(env.OKTA_ORG_URL);
  const expectedUrl = trimSlash(env.POC_EXPECTED_ORG_URL);
  if (orgUrl !== expectedUrl) {
    throw new GuardError(
      "ORG_URL_MISMATCH",
      `OKTA_ORG_URL (${orgUrl}) differs from POC_EXPECTED_ORG_URL (${expectedUrl})`,
    );
  }
  if (!PREVIEW_URL.test(orgUrl)) {
    throw new GuardError("NOT_PREVIEW", `${orgUrl} is not an https://<name>.oktapreview.com org`);
  }

  let metadata: { id?: unknown; _links?: { organization?: { href?: unknown } } };
  try {
    const res = await fetchFn(`${orgUrl}/.well-known/okta-organization`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    metadata = (await res.json()) as typeof metadata;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new GuardError("ORG_UNREACHABLE", `Could not read org metadata from ${orgUrl}: ${reason}`);
  }

  const href = metadata._links?.organization?.href;
  if (typeof href !== "string" || trimSlash(href) !== orgUrl) {
    throw new GuardError(
      "ORG_HREF_MISMATCH",
      `Org metadata points at ${typeof href === "string" ? trimSlash(href) : "nothing"}, not ${orgUrl}`,
    );
  }
  const orgId = typeof metadata.id === "string" ? metadata.id : "";
  if (env.POC_EXPECTED_ORG_ID && env.POC_EXPECTED_ORG_ID !== orgId) {
    throw new GuardError(
      "ORG_ID_MISMATCH",
      `Org ID ${orgId || "(none)"} differs from POC_EXPECTED_ORG_ID ${env.POC_EXPECTED_ORG_ID}`,
    );
  }
  return { orgId, orgUrl };
}

/** Runs a script body: guard failures exit 2, anything else exits 1 with a redacted message. */
export async function runGuarded(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (err) {
    if (err instanceof GuardError) {
      console.error(`ABORT: ${err.code}: ${err.message}`);
      process.exit(2);
    }
    console.error(redact(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
