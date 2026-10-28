import { createHash, randomBytes } from "node:crypto";
import type { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createLocalJWKSet, errors, jwtVerify, type JSONWebKeySet } from "jose";
import type { AppDeps } from "./app.js";
import { isOidcConfigured } from "./config.js";
import type { AuthServer } from "./store.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const PKCE_TTL_SEC = 600;
const SCOPE = "openid profile email offline_access";
export const SESSION_COOKIE = "poc_sid";

interface Discovery {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

export interface RefreshResult {
  status: number;
  error?: string;
}

class OidcError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "OidcError";
  }
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Reads discovery and keys from an issuer and talks to its token endpoint. Both caches last 5 minutes. */
export function createOidcClient(deps: AppDeps) {
  const cfg = deps.config;
  const discoveryCache = new Map<string, { at: number; value: Discovery }>();
  const keyCache = new Map<string, { at: number; keys: JSONWebKeySet }>();

  const issuerFor = (as: AuthServer): string | undefined => (as === "org" ? cfg.ORG_URL : cfg.CUSTOM_AS_ISSUER);

  async function getJson(url: string): Promise<unknown> {
    const res = await deps.fetchFn(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new OidcError("metadata_unavailable");
    return res.json();
  }

  async function discovery(issuer: string): Promise<Discovery> {
    const hit = discoveryCache.get(issuer);
    if (hit && deps.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const doc = (await getJson(`${issuer}/.well-known/openid-configuration`)) as Partial<Discovery>;
    const { authorization_endpoint, token_endpoint, jwks_uri } = doc;
    if (typeof authorization_endpoint !== "string" || typeof token_endpoint !== "string" || typeof jwks_uri !== "string") {
      throw new OidcError("metadata_invalid");
    }
    // The client secret goes to token_endpoint, so it must be on the issuer's own host.
    const origin = new URL(issuer).origin;
    for (const endpoint of [authorization_endpoint, token_endpoint, jwks_uri]) {
      if (new URL(endpoint).origin !== origin) throw new OidcError("metadata_invalid");
    }
    const value = { authorization_endpoint, token_endpoint, jwks_uri };
    discoveryCache.set(issuer, { at: deps.now(), value });
    return value;
  }

  async function keys(jwksUri: string, force = false): Promise<JSONWebKeySet> {
    const hit = keyCache.get(jwksUri);
    if (!force && hit && deps.now() - hit.at < CACHE_TTL_MS) return hit.keys;
    const set = (await getJson(jwksUri)) as JSONWebKeySet;
    keyCache.set(jwksUri, { at: deps.now(), keys: set });
    return set;
  }

  const basicAuth = () =>
    `Basic ${Buffer.from(`${encodeURIComponent(cfg.OIDC_CLIENT_ID ?? "")}:${encodeURIComponent(cfg.OIDC_CLIENT_SECRET ?? "")}`).toString("base64")}`;

  async function verifyIdToken(idToken: string, issuer: string, jwksUri: string) {
    const options = {
      issuer,
      audience: cfg.OIDC_CLIENT_ID,
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: new Date(deps.now()),
    };
    try {
      return (await jwtVerify(idToken, createLocalJWKSet(await keys(jwksUri)), options)).payload;
    } catch (err) {
      // Okta rotates signing keys; refetch once before giving up.
      if (!(err instanceof errors.JWKSNoMatchingKey)) throw err;
      return (await jwtVerify(idToken, createLocalJWKSet(await keys(jwksUri, true)), options)).payload;
    }
  }

  return {
    issuerFor,

    async authorizationUrl(as: AuthServer): Promise<string> {
      const issuer = issuerFor(as);
      if (!issuer) throw new OidcError("not_configured");
      const meta = await discovery(issuer);
      const verifier = b64url(randomBytes(32));
      const state = b64url(randomBytes(16));
      const nonce = b64url(randomBytes(16));
      await deps.store.putPkce(state, { verifier, nonce, as }, PKCE_TTL_SEC);
      const url = new URL(meta.authorization_endpoint);
      url.search = new URLSearchParams({
        client_id: cfg.OIDC_CLIENT_ID!,
        response_type: "code",
        scope: SCOPE,
        redirect_uri: `${cfg.PUBLIC_BASE_URL}/oidc/callback`,
        state,
        nonce,
        code_challenge: b64url(createHash("sha256").update(verifier).digest()),
        code_challenge_method: "S256",
      }).toString();
      return url.toString();
    },

    /** Exchanges the code, verifies the ID token, and returns what the callback needs. Tokens never leave this module except as stored values. */
    async completeSignIn(code: string, state: string) {
      const pkce = await deps.store.takePkce(state);
      if (!pkce) throw new OidcError("invalid_state");
      const issuer = issuerFor(pkce.as);
      if (!issuer) throw new OidcError("not_configured");
      const meta = await discovery(issuer);

      let res: Response;
      try {
        res = await deps.fetchFn(meta.token_endpoint, {
          method: "POST",
          headers: { authorization: basicAuth(), "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${cfg.PUBLIC_BASE_URL}/oidc/callback`,
            code_verifier: pkce.verifier,
          }).toString(),
        });
      } catch {
        throw new OidcError("token_request_failed");
      }
      const body = (await res.json().catch(() => null)) as { id_token?: unknown; refresh_token?: unknown } | null;
      if (!res.ok || typeof body?.id_token !== "string") throw new OidcError("token_exchange_failed");

      let claims;
      try {
        claims = await verifyIdToken(body.id_token, issuer, meta.jwks_uri);
      } catch {
        throw new OidcError("id_token_invalid");
      }
      if (claims.nonce !== pkce.nonce) throw new OidcError("nonce_mismatch");

      const email =
        typeof claims.email === "string" && claims.email.includes("@")
          ? claims.email
          : typeof claims.preferred_username === "string" && claims.preferred_username.includes("@")
            ? claims.preferred_username
            : null;
      if (!email || typeof claims.sub !== "string") throw new OidcError("no_email_claim");

      return {
        email: email.trim().toLowerCase(),
        sub: claims.sub,
        as: pkce.as,
        refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
      };
    },

    /** Asks Okta whether the escrowed refresh token still works. Returns a status, never a token. */
    async refresh(email: string, as: AuthServer): Promise<RefreshResult> {
      const token = await deps.store.getEscrowRefreshToken(as, email);
      if (!token) return { status: 0, error: "no_token" };
      const issuer = issuerFor(as);
      if (!issuer || !isOidcConfigured(cfg)) return { status: 0, error: "not_configured" };

      let res: Response;
      try {
        const meta = await discovery(issuer);
        res = await deps.fetchFn(meta.token_endpoint, {
          method: "POST",
          headers: { authorization: basicAuth(), "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token, scope: "openid offline_access" }).toString(),
        });
      } catch {
        return { status: 0, error: "request_failed" };
      }
      const body = (await res.json().catch(() => null)) as { refresh_token?: unknown; error?: unknown } | null;
      if (res.ok) {
        if (typeof body?.refresh_token === "string") await deps.store.putEscrowRefreshToken(as, email, body.refresh_token);
        return { status: res.status };
      }
      return typeof body?.error === "string" ? { status: res.status, error: body.error } : { status: res.status };
    },
  };
}

export type OidcClient = ReturnType<typeof createOidcClient>;

const page = (body: string) =>
  `<!doctype html><meta charset="utf-8"><title>POC FBM mock app</title><body style="font-family:sans-serif"><p>${body}</p></body>`;

export function registerOidcRoutes(app: Hono, deps: AppDeps, oidc: OidcClient): void {
  app.get("/oidc/login", async (c) => {
    const asParam = c.req.query("as") ?? "custom";
    if (asParam !== "custom" && asParam !== "org") return c.json({ error: "bad_as" }, 400);
    if (!isOidcConfigured(deps.config) || !oidc.issuerFor(asParam)) return c.json({ error: "not_configured" }, 503);
    try {
      return c.redirect(await oidc.authorizationUrl(asParam), 302);
    } catch (err) {
      if (err instanceof OidcError) return c.json({ error: err.code }, err.code === "not_configured" ? 503 : 502);
      throw err;
    }
  });

  app.get("/oidc/callback", async (c) => {
    c.header("cache-control", "no-store");
    if (!isOidcConfigured(deps.config)) return c.json({ error: "not_configured" }, 503);

    const oktaError = c.req.query("error");
    if (oktaError) {
      // Okta redirects back with ?error=access_denied etc. when sign-in is refused; show it, escaped.
      const detail = (c.req.query("error_description") ?? "").slice(0, 300);
      return c.html(page(`Sign-in failed: <b>${esc(oktaError.slice(0, 100))}</b> ${esc(detail)}`), 400);
    }
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) return c.json({ error: "invalid_request" }, 400);

    let result;
    try {
      result = await oidc.completeSignIn(code, state);
    } catch (err) {
      if (err instanceof OidcError) return c.json({ error: err.code }, 400);
      throw err;
    }

    const { email, sub, as, refreshToken } = result;
    await deps.store.registerUser(email, sub, as);
    const sid = await deps.store.createSession("oidc", email);
    if (refreshToken) {
      await deps.store.putAppTokens(as, email, refreshToken);
      await deps.store.putEscrowRefreshToken(as, email, refreshToken);
    }
    setCookie(c, SESSION_COOKIE, sid, { httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
    return c.html(
      page(`Signed in as ${esc(email)} via ${as} authorization server. Refresh token: ${refreshToken ? "yes" : "no"}`),
    );
  });

  app.get("/me", async (c) => {
    const sid = getCookie(c, SESSION_COOKIE);
    const session = sid ? await deps.store.getSession(sid) : null;
    if (!session) return c.json({ error: "no_session" }, 401);
    return c.json({ email: session.email, app: session.app });
  });

  app.post("/saml/acs", (c) => c.json({ error: "saml_sign_in_not_implemented" }, 501));
}
