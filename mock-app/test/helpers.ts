import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK, type JWTPayload } from "jose";
import { createApp, type AppDeps } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { MemoryStore } from "../src/store.js";

export const ORG = "https://acme-poc.oktapreview.com";
export const ISSUER = `${ORG}/oauth2/aus1POC`;
export const AUDIENCE = "api://poc-fbm-logout";
export const BASE = "https://poc-fbm-mock-abc123.vercel.app";
export const DISPATCHER = "0oaDISPATCHER";
export const OIDC_CLIENT = "0oaOIDCAPP";
export const SAML_APP = "0oaSAMLAPP";
export const NOW_MS = 1_800_000_000_000;
export const NOW_S = NOW_MS / 1000;

export const BASE_ENV: Record<string, string> = {
  ORG_URL: ORG,
  PUBLIC_BASE_URL: BASE,
  OIDC_CLIENT_ID: OIDC_CLIENT,
  OIDC_CLIENT_SECRET: "oidc-secret-value",
  CUSTOM_AS_ISSUER: ISSUER,
  CUSTOM_AS_AUDIENCE: AUDIENCE,
  DISPATCHER_CLIENT_ID: DISPATCHER,
  SAML_APP_ID: SAML_APP,
  GTR_AUTH_MODE: "oauth",
  VENDOR_API_KEY: "vendor-key-123",
  TEST_API_KEY: "test-key-123",
  GTR_STATIC_BEARER: "static-bearer-abc",
};

export interface KeyMaterial {
  privateKey: CryptoKey;
  jwk: JWK;
  jwks: ReturnType<typeof createLocalJWKSet>;
}

export async function makeKey(kid = "test-kid"): Promise<KeyMaterial> {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  return { privateKey, jwk, jwks: createLocalJWKSet({ keys: [jwk] }) };
}

export interface MintOptions {
  iss?: string;
  aud?: string;
  scp?: string[];
  cid?: string;
  sub?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  jti?: string | null;
  typ?: string;
  extra?: JWTPayload;
}

/** Signs a JWT the way an authorization server would, with the fixed clock NOW_S as "now". */
export async function mint(key: KeyMaterial, opts: MintOptions = {}): Promise<string> {
  const iat = opts.iat ?? NOW_S;
  const jwt = new SignJWT({ scp: opts.scp ?? ["poc.fbm.logout"], cid: opts.cid ?? DISPATCHER, ...opts.extra })
    .setProtectedHeader({ alg: "RS256", kid: String(key.jwk.kid), ...(opts.typ ? { typ: opts.typ } : {}) })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(opts.exp ?? iat + 300);
  if (opts.sub) jwt.setSubject(opts.sub);
  if (opts.nbf !== undefined) jwt.setNotBefore(opts.nbf);
  if (opts.jti !== null) jwt.setJti(opts.jti ?? "jti-1");
  return jwt.sign(key.privateKey);
}

export interface Harness {
  app: ReturnType<typeof createApp>;
  store: MemoryStore;
  key: KeyMaterial;
  deps: AppDeps;
  clock: { ms: number };
}

export async function makeHarness(env: Record<string, string> = {}, key?: KeyMaterial): Promise<Harness> {
  const material = key ?? (await makeKey());
  const clock = { ms: NOW_MS };
  const store = new MemoryStore(() => clock.ms);
  const deps: AppDeps = {
    config: loadConfig({ ...BASE_ENV, ...env }),
    store,
    now: () => clock.ms,
    fetchFn: fetch,
    jwksFor: () => material.jwks,
  };
  return { app: createApp(deps), store, key: material, deps, clock };
}

export function gtrRequest(
  app: string,
  token: string | null,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Request {
  const headers: Record<string, string> = { "content-type": "application/json", ...extraHeaders };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return new Request(`${BASE}/apps/${app}/global-token-revocation`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const emailBody = (email: string) => ({ sub_id: { format: "email", email } });
