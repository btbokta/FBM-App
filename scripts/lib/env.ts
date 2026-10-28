import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const bool = z.enum(["true", "false"]);
const count = z.coerce.number().int().positive();

const shape = {
  OKTA_ORG_URL: z.string().optional(),
  POC_EXPECTED_ORG_URL: z.string().optional(),
  POC_EXPECTED_ORG_ID: z.string().optional(),
  OKTA_API_TOKEN: z.string().optional(),
  OKTA_WF_CONNECTION_USER_ID: z.string().optional(),
  OKTA_HARNESS_CLIENT_ID: z.string().optional(),
  OKTA_HARNESS_KEY_FILE: z.string().optional(),
  OKTA_HARNESS_KEY_ID: z.string().optional(),
  POC_USER_EMAIL_DOMAIN: z.string().optional(),
  POC_USER_PASSWORD: z.string().optional(),
  POC_BURST_USER_COUNT: count.optional(),
  POC_DENY_ZONE_CIDR: z.string().optional(),
  WF_RESPOND_FLOW_ID: z.string().optional(),
  WF_RESPOND_BY_EMAIL_FLOW_ID: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_PROJECT_NAME: z.string().optional(),
  MOCK_BASE_URL: z.string().optional(),
  MOCK_TEST_API_KEY: z.string().optional(),
  MOCK_VENDOR_API_KEY: z.string().optional(),
  MOCK_GTR_STATIC_BEARER: z.string().optional(),
  GTR_AUTH_MODE: z.enum(["oauth", "static"]).optional(),
  POC_T6_MAX_SECONDS: count.optional(),
  POC_T6_MEDIAN_SECONDS: count.optional(),
  POC_OBSERVE_TIMEOUT_SECONDS: count.optional(),
  POC_ENABLE_CLIENT_CREDENTIALS: bool.optional(),
  POC_SOC_INCLUDE_RESPOND: bool.optional(),
  POC_FALLBACK_MODE: bool.optional(),
};

const schema = z.object(shape);

export type PocEnv = z.infer<typeof schema>;
export const ENV_KEYS = Object.keys(shape) as (keyof PocEnv)[];

/** Lists variable names only, never values. */
export class EnvError extends Error {
  constructor(
    public readonly missing: string[],
    public readonly invalid: string[] = [],
  ) {
    const parts: string[] = [];
    if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
    if (invalid.length) parts.push(`invalid: ${invalid.join(", ")}`);
    super(`Environment problem (${parts.join("; ")}). Run "npm run env:check" to see what is set.`);
    this.name = "EnvError";
  }
}

/** Empty values count as unset, so a blank `KEY=` line in .env falls through to defaults. */
export function parseEnv(
  source: Record<string, string | undefined>,
  required: readonly string[] = [],
): PocEnv {
  const cleaned: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = source[key]?.trim();
    if (value) cleaned[key] = value;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const invalid = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    throw new EnvError([], invalid);
  }
  const missing = required.filter((name) => !(name in cleaned));
  if (missing.length) throw new EnvError(missing);
  return result.data;
}

/** Loads .env from the repo root; variables already in the process environment win. */
export function loadEnv(required: readonly string[] = []): PocEnv {
  loadDotenv({ path: path.join(REPO_ROOT, ".env"), quiet: true });
  return parseEnv(process.env, required);
}
