import { z } from "zod";

const trimSlash = (s: string) => s.replace(/\/+$/, "");

const schema = z.object({
  ORG_URL: z.string().transform(trimSlash).optional(),
  PUBLIC_BASE_URL: z.string().transform(trimSlash).optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  CUSTOM_AS_ISSUER: z.string().transform(trimSlash).optional(),
  CUSTOM_AS_AUDIENCE: z.string().optional(),
  LOGOUT_SCOPE: z.string().default("poc.fbm.logout"),
  DISPATCHER_CLIENT_ID: z.string().optional(),
  SAML_APP_ID: z.string().optional(),
  GTR_AUTH_MODE: z.enum(["oauth", "static"]).default("oauth"),
  GTR_STATIC_BEARER: z.string().optional(),
  VENDOR_API_KEY: z.string().optional(),
  TEST_API_KEY: z.string().optional(),
  ACCEPT_OKTA_SIGNED_JWT: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Config = z.output<typeof schema>;

const KEYS = Object.keys(schema.shape);

/** Reads the mock app's settings. Empty values count as unset, so a blank Vercel variable falls back to its default. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const cleaned: Record<string, string> = {};
  for (const key of KEYS) {
    const value = env[key]?.trim();
    if (value) cleaned[key] = value;
  }
  return schema.parse(cleaned);
}

export function isOidcConfigured(cfg: Config): boolean {
  return Boolean(cfg.ORG_URL && cfg.PUBLIC_BASE_URL && cfg.OIDC_CLIENT_ID && cfg.OIDC_CLIENT_SECRET);
}

export function isAsConfigured(cfg: Config): boolean {
  return Boolean(cfg.CUSTOM_AS_ISSUER && cfg.CUSTOM_AS_AUDIENCE);
}
