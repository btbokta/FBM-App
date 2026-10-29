import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BASE,
  ISSUER,
  NOW_S,
  OIDC_CLIENT,
  ORG,
  makeHarness,
  makeKey,
  type Harness,
  type KeyMaterial,
} from "./helpers.js";

const EMAIL = "poc-itp-user01@example.com";
const KEY = "test-key-123";

interface FakeIdp {
  fetchFn: typeof fetch;
  calls: { url: string; method: string; headers: Headers; body: string }[];
  /** Token endpoint response; set per test. */
  tokenResponse: () => Promise<Response> | Response;
  idTokenClaims: Record<string, unknown>;
  idTokenKey: KeyMaterial;
}

function makeIdp(key: KeyMaterial): FakeIdp {
  const idp: FakeIdp = {
    calls: [],
    idTokenKey: key,
    idTokenClaims: {},
    tokenResponse: () => new Response("{}", { status: 500 }),
    fetchFn: (async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      idp.calls.push({
        url,
        method: init.method ?? "GET",
        headers: new Headers(init.headers),
        body: typeof init.body === "string" ? init.body : "",
      });
      const issuer = url.startsWith(ISSUER) ? ISSUER : ORG;
      const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } });
      if (url.endsWith("/.well-known/openid-configuration")) {
        return json({
          authorization_endpoint: `${issuer}/v1/authorize`,
          token_endpoint: `${issuer}/v1/token`,
          jwks_uri: `${issuer}/v1/keys`,
        });
      }
      if (url.endsWith("/v1/keys")) return json({ keys: [key.jwk] });
      if (url.endsWith("/v1/token")) return idp.tokenResponse();
      return new Response("not found", { status: 404 });
    }) as typeof fetch,
  };
  return idp;
}

async function idToken(idp: FakeIdp, over: { iss?: string; aud?: string; nonce?: string; email?: string | null; key?: KeyMaterial } = {}) {
  const claims: Record<string, unknown> = { sub: "00uSUB01", nonce: over.nonce ?? "NONCE", ...idp.idTokenClaims };
  if (over.email !== null) claims.email = over.email ?? EMAIL;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: String((over.key ?? idp.idTokenKey).jwk.kid) })
    .setIssuer(over.iss ?? ISSUER)
    .setAudience(over.aud ?? OIDC_CLIENT)
    .setIssuedAt(NOW_S)
    .setExpirationTime(NOW_S + 3600)
    .sign((over.key ?? idp.idTokenKey).privateKey);
}

let h: Harness;
let idp: FakeIdp;

beforeEach(async () => {
  const key = await makeKey("idp-kid");
  idp = makeIdp(key);
  h = await makeHarness({}, undefined, idp.fetchFn);
});

/** Starts a login and returns the state and the parsed authorize URL. */
async function login(as?: string) {
  const res = await h.app.request(`${BASE}/oidc/login${as ? `?as=${as}` : ""}`);
  const location = res.headers.get("location");
  return { res, url: location ? new URL(location) : null };
}

async function callback(query: Record<string, string>) {
  return h.app.request(`${BASE}/oidc/callback?${new URLSearchParams(query)}`);
}

/** Runs login, then returns the nonce Okta would echo back plus a state to use at the callback. */
async function startFlow(as: "custom" | "org" = "custom") {
  const { url } = await login(as);
  const state = url!.searchParams.get("state")!;
  const nonce = url!.searchParams.get("nonce")!;
  return { state, nonce, url: url! };
}

describe("GET /oidc/login", () => {
  it("redirects to the custom authorization server with PKCE S256 and stores the state", async () => {
    const { res, url } = await login("custom");
    expect(res.status).toBe(302);
    expect(url!.origin + url!.pathname).toBe(`${ISSUER}/v1/authorize`);
    const q = url!.searchParams;
    expect(q.get("client_id")).toBe(OIDC_CLIENT);
    expect(q.get("response_type")).toBe("code");
    expect(q.get("scope")).toBe("openid profile email offline_access");
    expect(q.get("redirect_uri")).toBe(`${BASE}/oidc/callback`);
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(q.get("state")).toBeTruthy();
    expect(q.get("nonce")).toBeTruthy();

    const stored = await h.store.takePkce(q.get("state")!);
    expect(stored).toMatchObject({ as: "custom", nonce: q.get("nonce") });
    // The challenge sent to Okta is the SHA-256 of the stored verifier.
    expect(createHash("sha256").update(stored!.verifier).digest("base64url")).toBe(q.get("code_challenge"));
  });

  it("uses the org authorization server for as=org, and defaults to custom", async () => {
    expect((await login("org")).url!.origin + (await login("org")).url!.pathname).toBe(`${ORG}/v1/authorize`);
    expect((await login()).url!.pathname).toBe("/oauth2/aus1POC/v1/authorize");
  });

  it("makes a fresh state and verifier on every login", async () => {
    const a = (await login()).url!.searchParams;
    const b = (await login()).url!.searchParams;
    expect(a.get("state")).not.toBe(b.get("state"));
    expect(a.get("code_challenge")).not.toBe(b.get("code_challenge"));
  });

  it("503 when OIDC isn't configured, 400 for an unknown as", async () => {
    const bare = await makeHarness({ OIDC_CLIENT_ID: "", OIDC_CLIENT_SECRET: "" }, undefined, idp.fetchFn);
    expect((await bare.app.request(`${BASE}/oidc/login`)).status).toBe(503);
    expect((await h.app.request(`${BASE}/oidc/login?as=other`)).status).toBe(400);
  });

  it("502 when the issuer's metadata can't be read", async () => {
    const broken = await makeHarness({}, undefined, (async () => new Response("no", { status: 500 })) as typeof fetch);
    expect((await broken.app.request(`${BASE}/oidc/login`)).status).toBe(502);
  });

  it("refuses discovery metadata that points off the issuer's host (the client secret goes to token_endpoint)", async () => {
    const evil = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("openid-configuration")) {
        return new Response(
          JSON.stringify({
            authorization_endpoint: `${ISSUER}/v1/authorize`,
            token_endpoint: "https://evil.example/token",
            jwks_uri: `${ISSUER}/v1/keys`,
          }),
        );
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
    const s = await makeHarness({}, undefined, evil);
    expect((await s.app.request(`${BASE}/oidc/login`)).status).toBe(502);
  });

  it("caches discovery for 5 minutes", async () => {
    await login();
    await login();
    expect(idp.calls.filter((c) => c.url.endsWith("openid-configuration"))).toHaveLength(1);
    h.clock.ms += 5 * 60 * 1000 + 1;
    await login();
    expect(idp.calls.filter((c) => c.url.endsWith("openid-configuration"))).toHaveLength(2);
  });
});

describe("GET /oidc/callback", () => {
  it("signs the user in: cookie set, user registered, tokens stored, refresh token reported", async () => {
    const { state, nonce } = await startFlow("custom");
    idp.tokenResponse = async () =>
      new Response(
        JSON.stringify({ id_token: await idToken(idp, { nonce }), refresh_token: "rt-secret-123", access_token: "at-visible-456" }),
      );

    const res = await callback({ code: "CODE", state });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");

    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^poc_sid=[0-9a-f-]{36}/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);

    expect(await h.store.isKnownUser(EMAIL)).toBe(true);
    expect(await h.store.emailBySub("00uSUB01")).toBe(EMAIL);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ oidc: 1 });
    expect(await h.store.getEscrowRefreshToken("custom", EMAIL)).toBe("rt-secret-123");

    const sid = cookie.match(/poc_sid=([^;]+)/)![1];
    const me = await h.app.request(`${BASE}/me`, { headers: { cookie: `poc_sid=${sid}` } });
    expect(await me.json()).toEqual({ email: EMAIL, app: "oidc" });

    // The home page shows the profile and access token, but never the refresh token.
    const home = await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text();
    expect(home).toContain(`Welcome, ${EMAIL}`);
    expect(home).toContain("custom authorization server");
    expect(home).toContain("at-visible-456");
    expect(home).toContain("Refresh token: issued");
    expect(home).not.toContain("rt-secret-123");
  });

  it("sends the code, verifier, redirect URI, and Basic client credentials to the token endpoint", async () => {
    const { state, nonce, url } = await startFlow("custom");
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce }) }));
    await callback({ code: "CODE-1", state });

    const call = idp.calls.find((c) => c.url === `${ISSUER}/v1/token`)!;
    const form = new URLSearchParams(call.body);
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code")).toBe("CODE-1");
    expect(form.get("redirect_uri")).toBe(`${BASE}/oidc/callback`);
    expect(createHash("sha256").update(form.get("code_verifier")!).digest("base64url")).toBe(
      url.searchParams.get("code_challenge"),
    );
    expect(call.headers.get("authorization")).toBe(
      `Basic ${Buffer.from(`${OIDC_CLIENT}:oidc-secret-value`).toString("base64")}`,
    );
  });

  it("records 'Refresh token: no' when none was issued", async () => {
    const { state, nonce } = await startFlow("org");
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce, iss: ORG }) }));
    const res = await callback({ code: "C", state });
    expect(res.status).toBe(302);
    const sid = res.headers.get("set-cookie")!.match(/poc_sid=([^;]+)/)![1];
    const home = await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text();
    expect(home).toContain("org authorization server");
    expect(home).toContain("Refresh token: not issued");
    expect(await h.store.getEscrowRefreshToken("org", EMAIL)).toBeNull();
  });

  it("400 for an unknown state, and a state can only be used once", async () => {
    expect((await callback({ code: "C", state: "never-issued" })).status).toBe(400);

    const { state, nonce } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce }) }));
    expect((await callback({ code: "C", state })).status).toBe(302);
    expect((await callback({ code: "C", state })).status).toBe(400);
  });

  it("400 when code or state is missing", async () => {
    expect((await callback({ state: "x" })).status).toBe(400);
    expect((await callback({ code: "x" })).status).toBe(400);
  });

  it("400 on a nonce mismatch, and nothing is registered", async () => {
    const { state } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce: "WRONG" }) }));
    const res = await callback({ code: "C", state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "nonce_mismatch" });
    expect(await h.store.isKnownUser(EMAIL)).toBe(false);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("400 for an ID token with the wrong issuer, wrong audience, or a signature from another key", async () => {
    const other = await makeKey("idp-kid");
    for (const make of [
      (nonce: string) => idToken(idp, { nonce, iss: "https://evil.example" }),
      (nonce: string) => idToken(idp, { nonce, aud: "0oaSOMEONEELSE" }),
      (nonce: string) => idToken(idp, { nonce, key: other }),
    ]) {
      const { state, nonce } = await startFlow();
      idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await make(nonce) }));
      const res = await callback({ code: "C", state });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "id_token_invalid" });
    }
    expect(await h.store.isKnownUser(EMAIL)).toBe(false);
  });

  it("400 when the token endpoint refuses the code", async () => {
    const { state } = await startFlow();
    idp.tokenResponse = () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    const res = await callback({ code: "BAD", state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "token_exchange_failed" });
  });

  it("400 when the ID token has no email", async () => {
    const { state, nonce } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce, email: null }) }));
    expect(await (await callback({ code: "C", state })).json()).toEqual({ error: "no_email_claim" });
  });

  it("shows an Okta error response without reflecting HTML", async () => {
    const res = await callback({ error: "access_denied", error_description: "<script>alert(1)</script>" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("access_denied");
    expect(html).not.toContain("<script>");
  });

  it("refetches signing keys once when a key rotated", async () => {
    // First call to load keys happens with the old key set; a token signed by a new kid forces a refetch.
    const { state: s1, nonce: n1 } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce: n1 }) }));
    expect((await callback({ code: "C", state: s1 })).status).toBe(302);

    const rotated = await makeKey("idp-kid-2");
    const before = idp.calls.filter((c) => c.url.endsWith("/v1/keys")).length;
    idp.idTokenKey = rotated;
    const original = idp.fetchFn;
    const serving = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith("/v1/keys")) {
        idp.calls.push({ url: String(input), method: "GET", headers: new Headers(), body: "" });
        return new Response(JSON.stringify({ keys: [rotated.jwk] }));
      }
      return original(input, init);
    }) as typeof fetch;
    h.deps.fetchFn = serving;

    const { state: s2, nonce: n2 } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce: n2 }) }));
    expect((await callback({ code: "C", state: s2 })).status).toBe(302);
    expect(idp.calls.filter((c) => c.url.endsWith("/v1/keys")).length).toBe(before + 1);
  });
});

describe("POST /test/refresh", () => {
  const refresh = (email: string, as: string) =>
    h.app.request(
      new Request(`${BASE}/test/refresh`, {
        method: "POST",
        headers: { "x-test-key": KEY, "content-type": "application/json" },
        body: JSON.stringify({ email, as }),
      }),
    );

  it("returns 200 when Okta accepts the refresh token, and stores the rotated one", async () => {
    await h.store.putEscrowRefreshToken("custom", EMAIL, "rt-old");
    idp.tokenResponse = () => new Response(JSON.stringify({ access_token: "at-secret", refresh_token: "rt-new" }));
    const res = await refresh(EMAIL, "custom");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: 200 });
    expect(text).not.toContain("at-secret");
    expect(text).not.toContain("rt-new");
    expect(await h.store.getEscrowRefreshToken("custom", EMAIL)).toBe("rt-new");

    const form = new URLSearchParams(idp.calls.at(-1)!.body);
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("refresh_token")).toBe("rt-old");
    expect(form.get("scope")).toBe("openid offline_access");
  });

  it("returns the error name when Okta rejects the token", async () => {
    await h.store.putEscrowRefreshToken("org", EMAIL, "rt-revoked");
    idp.tokenResponse = () => new Response(JSON.stringify({ error: "invalid_grant", error_description: "revoked" }), { status: 400 });
    expect(await (await refresh(EMAIL, "org")).json()).toEqual({ status: 400, error: "invalid_grant" });
    expect(idp.calls.at(-1)!.url).toBe(`${ORG}/v1/token`);
  });

  it("returns the status alone when the error body is unreadable", async () => {
    await h.store.putEscrowRefreshToken("custom", EMAIL, "rt");
    idp.tokenResponse = () => new Response("Bad Gateway", { status: 502 });
    expect(await (await refresh(EMAIL, "custom")).json()).toEqual({ status: 502 });
  });

  it("reports no_token without calling Okta", async () => {
    const before = idp.calls.length;
    expect(await (await refresh(EMAIL, "custom")).json()).toEqual({ status: 0, error: "no_token" });
    expect(idp.calls.length).toBe(before);
  });

  it("keeps the escrow token when the app's own tokens are revoked (T5 depends on this)", async () => {
    await h.store.putAppTokens("custom", EMAIL, "rt");
    await h.store.putEscrowRefreshToken("custom", EMAIL, "rt");
    await h.store.deleteAppTokens(EMAIL);
    expect(await h.store.getEscrowRefreshToken("custom", EMAIL)).toBe("rt");
  });
});

describe("GET / (Acme home page)", () => {
  it("shows a sign-in button when there is no session", async () => {
    const res = await h.app.request(`${BASE}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const html = await res.text();
    expect(html).toContain("Acme");
    expect(html).toContain('href="/oidc/login"');
    expect(html).not.toContain("Your session has ended");
  });

  it("says the session ended once a GTR call revoked it, and offers sign-in again", async () => {
    const sid = await h.store.createSession("oidc", EMAIL, { profile: { email: EMAIL }, accessToken: "tok" });
    expect(await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text()).toContain(`Welcome, ${EMAIL}`);
    await h.store.revokeSessions("oidc", EMAIL);
    const html = await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text();
    expect(html).toContain("Your session has ended");
    expect(html).toContain('href="/oidc/login"');
    expect(html).not.toContain("tok");
  });

  it("escapes claim values and the access token", async () => {
    const sid = await h.store.createSession("oidc", EMAIL, { profile: { name: "<script>alert(1)</script>" }, accessToken: "</textarea><b>x" });
    const html = await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text();
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("</textarea><b>");
  });

  it("a session made without sign-in details still renders", async () => {
    const sid = await h.store.createSession("oidc", EMAIL);
    const html = await (await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).text();
    expect(html).toContain(`Welcome, ${EMAIL}`);
    expect(html).toContain("No access token is stored");
  });

  it("a refresh after sign-in works: the home page does not depend on the callback state", async () => {
    const { state, nonce } = await startFlow();
    idp.tokenResponse = async () => new Response(JSON.stringify({ id_token: await idToken(idp, { nonce }), access_token: "a" }));
    const res = await callback({ code: "C", state });
    const sid = res.headers.get("set-cookie")!.match(/poc_sid=([^;]+)/)![1];
    for (let i = 0; i < 2; i++) {
      expect((await h.app.request(`${BASE}/`, { headers: { cookie: `poc_sid=${sid}` } })).status).toBe(200);
    }
  });
});

describe("misc routes", () => {
  it("GET /me is 401 without a session cookie or with an unknown one", async () => {
    expect((await h.app.request(`${BASE}/me`)).status).toBe(401);
    expect((await h.app.request(`${BASE}/me`, { headers: { cookie: "poc_sid=nope" } })).status).toBe(401);
  });

  it("a session revoked by a GTR call stops working at /me", async () => {
    const sid = await h.store.createSession("oidc", EMAIL);
    expect((await h.app.request(`${BASE}/me`, { headers: { cookie: `poc_sid=${sid}` } })).status).toBe(200);
    await h.store.revokeSessions("oidc", EMAIL);
    expect((await h.app.request(`${BASE}/me`, { headers: { cookie: `poc_sid=${sid}` } })).status).toBe(401);
  });

  it("POST /saml/acs is 501", async () => {
    const res = await h.app.request(`${BASE}/saml/acs`, { method: "POST" });
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "saml_sign_in_not_implemented" });
  });
});
