import { beforeEach, describe, expect, it } from "vitest";
import {
  BASE,
  DISPATCHER,
  ISSUER,
  NOW_S,
  OIDC_CLIENT,
  ORG,
  SAML_APP,
  emailBody,
  gtrRequest,
  makeHarness,
  makeKey,
  mint,
  type Harness,
} from "./helpers.js";

const EMAIL = "poc-itp-user01@example.com";
let h: Harness;
let token: string;

beforeEach(async () => {
  h = await makeHarness();
  token = await mint(h.key);
  await h.store.registerUser(EMAIL, "00uSUB01", "custom");
  await h.store.createSession("oidc", EMAIL);
  await h.store.createSession("oidc", EMAIL);
  await h.store.createSession("saml", EMAIL);
  await h.store.putAppTokens("custom", EMAIL, "rt-app");
  await h.store.putEscrowRefreshToken("custom", EMAIL, "rt-escrow");
});

async function lastCall() {
  const calls = await h.store.listCalls();
  return calls[calls.length - 1];
}

describe("success", () => {
  it("204 revokes only the called app's sessions and app-held tokens", async () => {
    const res = await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(await h.store.countSessions(EMAIL)).toEqual({ oidc: 0, saml: 1, vendor: 0, disabled: 0 });
    // The app's own copy of the refresh token is gone; the escrow copy stays so T5 can test Okta.
    expect(await h.store.getEscrowRefreshToken("custom", EMAIL)).toBe("rt-escrow");
    expect(await lastCall()).toMatchObject({
      app: "oidc", kind: "gtr", email: EMAIL, subIdFormat: "email", auth: "ok", status: 204, sessionsRevoked: 2,
    });
  });

  it("matches the email case-insensitively", async () => {
    const res = await h.app.request(gtrRequest("saml", token, emailBody("POC-ITP-User01@Example.com")));
    expect(res.status).toBe(204);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ saml: 0 });
  });

  it("is idempotent: a second call still returns 204 with nothing left to revoke", async () => {
    await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)));
    const res = await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)));
    expect(res.status).toBe(204);
    expect((await h.store.listCalls()).map((c) => c.sessionsRevoked)).toEqual([2, 0]);
  });

  it("accepts the disabled-canary app so a test can prove it is never called", async () => {
    expect((await h.app.request(gtrRequest("disabled", token, emailBody(EMAIL)))).status).toBe(204);
  });
});

describe("400 malformed request", () => {
  it("no body", async () => {
    const res = await h.app.request(gtrRequest("oidc", token, ""));
    expect(res.status).toBe(400);
  });

  it("bad JSON", async () => {
    expect((await h.app.request(gtrRequest("oidc", token, "{not json"))).status).toBe(400);
  });

  it("unknown subject format", async () => {
    const res = await h.app.request(gtrRequest("oidc", token, { sub_id: { format: "phone", phone: "555" } }));
    expect(res.status).toBe(400);
    expect(await lastCall()).toMatchObject({ status: 400, subIdFormat: "phone", auth: "ok" });
  });

  it("missing or non-object sub_id, and an email with no @", async () => {
    for (const body of [{}, { sub_id: "x" }, { sub_id: ["email"] }, { sub_id: { format: "email", email: "nope" } }]) {
      expect((await h.app.request(gtrRequest("oidc", token, body))).status).toBe(400);
    }
  });
});

describe("401 authentication", () => {
  it("no Authorization header", async () => {
    const res = await h.app.request(gtrRequest("oidc", null, emailBody(EMAIL)));
    expect(res.status).toBe(401);
    expect(await lastCall()).toMatchObject({ status: 401, auth: "missing", email: null });
  });

  it("not a JWT", async () => {
    const res = await h.app.request(gtrRequest("oidc", "x.y.z", emailBody(EMAIL)));
    expect(res.status).toBe(401);
    expect(await lastCall()).toMatchObject({ auth: "invalid" });
  });

  it("signed by a different key", async () => {
    const other = await makeKey("test-kid");
    expect((await h.app.request(gtrRequest("oidc", await mint(other), emailBody(EMAIL)))).status).toBe(401);
  });

  it("wrong issuer, wrong audience, and expired", async () => {
    const wrongIss = await mint(h.key, { iss: `${ORG}/oauth2/ausOTHER` });
    const wrongAud = await mint(h.key, { aud: "api://something-else" });
    const expired = await mint(h.key, { iat: NOW_S - 7200, exp: NOW_S - 3600 });
    for (const bad of [wrongIss, wrongAud, expired]) {
      expect((await h.app.request(gtrRequest("oidc", bad, emailBody(EMAIL)))).status).toBe(401);
    }
  });

  it("a revocation never happens on a rejected call", async () => {
    await h.app.request(gtrRequest("oidc", null, emailBody(EMAIL)));
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ oidc: 2 });
  });
});

describe("403 authorization", () => {
  it("token without the logout scope", async () => {
    const res = await h.app.request(gtrRequest("oidc", await mint(h.key, { scp: ["openid"] }), emailBody(EMAIL)));
    expect(res.status).toBe(403);
    expect(await lastCall()).toMatchObject({ status: 403, auth: "forbidden" });
  });

  it("token issued to a different client", async () => {
    const res = await h.app.request(gtrRequest("oidc", await mint(h.key, { cid: "0oaSOMEONEELSE" }), emailBody(EMAIL)));
    expect(res.status).toBe(403);
  });

  it("a 403 records the token's scope and client claims next to what was expected, never the token", async () => {
    const token = await mint(h.key, { scp: ["openid"], cid: "0oaSOMEONEELSE" });
    expect((await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)))).status).toBe(403);
    const call = (await lastCall()) as { rejected?: Record<string, unknown> };
    expect(call.rejected).toMatchObject({
      scp: ["openid"],
      cid: "0oaSOMEONEELSE",
      expectedScope: "poc.fbm.logout",
      expectedCid: DISPATCHER,
    });
    expect(JSON.stringify(call)).not.toContain(token);
  });

  it("a 401 or an accepted call records no rejection detail", async () => {
    expect(((await h.app.request(gtrRequest("oidc", "junk", emailBody(EMAIL)))).status)).toBe(401);
    expect(await lastCall()).not.toHaveProperty("rejected");
  });

  it("scp as a plain string instead of an array, as Okta never issues it", async () => {
    const res = await h.app.request(gtrRequest("oidc", await mint(h.key, { scp: undefined, extra: { scp: "poc.fbm.logout" } }), emailBody(EMAIL)));
    expect(res.status).toBe(403); // scp must be an array, as Okta issues it
  });
});

describe("404", () => {
  it("unknown app is rejected before authentication", async () => {
    const res = await h.app.request(gtrRequest("nonsense", null, emailBody(EMAIL)));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown_app" });
    expect(await h.store.listCalls()).toEqual([]);
  });

  it("unknown email", async () => {
    expect((await h.app.request(gtrRequest("oidc", token, emailBody("nobody@example.com")))).status).toBe(404);
  });

  it("unknown iss for iss_sub", async () => {
    const body = { sub_id: { format: "iss_sub", iss: "https://elsewhere.example", sub: "00uSUB01" } };
    expect((await h.app.request(gtrRequest("oidc", token, body))).status).toBe(404);
  });

  it("iss_sub is 404 until the user is registered with that sub, then 204", async () => {
    const body = { sub_id: { format: "iss_sub", iss: ORG, sub: "00uNEWSUB" } };
    expect((await h.app.request(gtrRequest("oidc", token, body))).status).toBe(404);

    await h.store.registerUser("newuser@example.com", "00uNEWSUB", "org");
    await h.store.createSession("oidc", "newuser@example.com");
    const res = await h.app.request(gtrRequest("oidc", token, body));
    expect(res.status).toBe(204);
    expect(await lastCall()).toMatchObject({ email: "newuser@example.com", subIdFormat: "iss_sub", sessionsRevoked: 1 });
  });

  it("iss_sub accepts the custom authorization server issuer too", async () => {
    const body = { sub_id: { format: "iss_sub", iss: ISSUER, sub: "00uSUB01" } };
    expect((await h.app.request(gtrRequest("oidc", token, body))).status).toBe(204);
  });

  it("iss_sub with missing parts is 400", async () => {
    expect((await h.app.request(gtrRequest("oidc", token, { sub_id: { format: "iss_sub", iss: ORG } }))).status).toBe(400);
  });
});

describe("injected faults", () => {
  it("422 comes back as 422 and revokes nothing", async () => {
    await h.store.setFault("saml", "422");
    const res = await h.app.request(gtrRequest("saml", token, emailBody(EMAIL)));
    expect(res.status).toBe(422);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ saml: 1 });
    expect(await lastCall()).toMatchObject({ status: 422, auth: "ok", email: EMAIL });
  });

  it("429-first answers 429 with Retry-After, then 204 on the retry", async () => {
    await h.store.setFault("saml", "429-first");
    const first = await h.app.request(gtrRequest("saml", token, emailBody(EMAIL)));
    expect(first.status).toBe(429);
    expect(first.headers.get("retry-after")).toBe("1");
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ saml: 1 });

    const second = await h.app.request(gtrRequest("saml", token, emailBody(EMAIL)));
    expect(second.status).toBe(204);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ saml: 0 });
    expect((await h.store.listCalls()).map((c) => c.status)).toEqual([429, 204]);
  });

  it("a fault on one app leaves the others alone", async () => {
    await h.store.setFault("saml", "422");
    expect((await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)))).status).toBe(204);
  });
});

describe("static bearer mode", () => {
  it("accepts the configured bearer", async () => {
    const s = await makeHarness({ GTR_AUTH_MODE: "static" });
    await s.store.registerUser(EMAIL);
    const res = await s.app.request(gtrRequest("oidc", "static-bearer-abc", emailBody(EMAIL)));
    expect(res.status).toBe(204);
  });

  it("rejects a wrong bearer, a longer bearer with the right prefix, and a real JWT", async () => {
    const s = await makeHarness({ GTR_AUTH_MODE: "static" });
    await s.store.registerUser(EMAIL);
    for (const bad of ["static-bearer-abd", "static-bearer-abc-and-more", await mint(s.key)]) {
      expect((await s.app.request(gtrRequest("oidc", bad, emailBody(EMAIL)))).status).toBe(401);
    }
  });

  it("rejects everything when no static bearer is configured", async () => {
    const s = await makeHarness({ GTR_AUTH_MODE: "static", GTR_STATIC_BEARER: "" });
    await s.store.registerUser(EMAIL);
    expect((await s.app.request(gtrRequest("oidc", "anything", emailBody(EMAIL)))).status).toBe(401);
  });
});

describe("Okta signed request JWT (stub; Okta never calls FBM apps, U16)", () => {
  const typ = "global-token-revocation+jwt";
  const audFor = (app: string) => `${BASE}/apps/${app}/global-token-revocation`;
  const signed = (over: Parameters<typeof mint>[1] = {}) =>
    mint(h.key, { iss: ORG, aud: audFor("oidc"), sub: OIDC_CLIENT, typ, nbf: NOW_S - 5, scp: undefined, cid: undefined, ...over });

  beforeEach(async () => {
    h = await makeHarness({ ACCEPT_OKTA_SIGNED_JWT: "true" });
    await h.store.registerUser(EMAIL);
    await h.store.createSession("oidc", EMAIL);
  });

  it("accepts a correctly signed request", async () => {
    const res = await h.app.request(gtrRequest("oidc", await signed(), emailBody(EMAIL)));
    expect(res.status).toBe(204);
  });

  it("accepts a SAML request whose sub is the SAML app instance ID", async () => {
    await h.store.createSession("saml", EMAIL);
    const t = await signed({ aud: audFor("saml"), sub: SAML_APP });
    expect((await h.app.request(gtrRequest("saml", t, emailBody(EMAIL)))).status).toBe(204);
  });

  it("a wrong typ is not treated as an Okta request, so it fails normal access-token validation", async () => {
    // Same claims, but typ is not global-token-revocation+jwt. The issuer is the org, not the custom AS.
    const t = await signed({ typ: "JWT" });
    expect((await h.app.request(gtrRequest("oidc", t, emailBody(EMAIL)))).status).toBe(401);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ oidc: 1 });
  });

  it("rejects the wrong audience, subject, issuer, a missing jti, and an expired token", async () => {
    const tokens = [
      await signed({ aud: audFor("saml") }),
      await signed({ sub: "0oaOTHER" }),
      await signed({ iss: "https://evil.example" }),
      await signed({ jti: null }),
      await signed({ iat: NOW_S - 7200, exp: NOW_S - 3600, nbf: NOW_S - 7200 }),
    ];
    for (const t of tokens) expect((await h.app.request(gtrRequest("oidc", t, emailBody(EMAIL)))).status).toBe(401);
  });

  it("is not accepted when ACCEPT_OKTA_SIGNED_JWT is false", async () => {
    const off = await makeHarness({ ACCEPT_OKTA_SIGNED_JWT: "false" }, h.key);
    await off.store.registerUser(EMAIL);
    await off.store.createSession("oidc", EMAIL);
    const res = await off.app.request(gtrRequest("oidc", await signed(), emailBody(EMAIL)));
    expect(res.status).toBe(401); // checked as a normal bearer, and its issuer is the org, not the custom AS
    expect(await off.store.countSessions(EMAIL)).toMatchObject({ oidc: 1 });
  });
});

describe("recording", () => {
  it("records every request, rejected or not, with timing fields", async () => {
    await h.app.request(gtrRequest("oidc", null, emailBody(EMAIL)));
    await h.app.request(gtrRequest("oidc", token, "{bad"));
    await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)));
    const calls = await h.store.listCalls();
    expect(calls.map((c) => c.status)).toEqual([401, 400, 204]);
    for (const c of calls) {
      expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(c.receivedAtMs).toBe(h.clock.ms);
      expect(c.receivedAt).toBe(new Date(h.clock.ms).toISOString());
      expect(c.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("never logs the Authorization header value anywhere in the stored call", async () => {
    await h.app.request(gtrRequest("oidc", token, emailBody(EMAIL)));
    expect(JSON.stringify(await h.store.listCalls())).not.toContain(token);
  });
});

describe("misconfiguration", () => {
  // Each case mints with the harness's own key, so a failure here is about configuration, not the signature.
  it("rejects oauth-mode calls when the authorization server isn't configured", async () => {
    const s = await makeHarness({ CUSTOM_AS_ISSUER: "", CUSTOM_AS_AUDIENCE: "" });
    await s.store.registerUser(EMAIL);
    const valid = await mint(s.key);
    expect((await s.app.request(gtrRequest("oidc", valid, emailBody(EMAIL)))).status).toBe(401);
  });

  it("denies the logout scope when the dispatcher client isn't configured", async () => {
    const s = await makeHarness({ DISPATCHER_CLIENT_ID: "" });
    await s.store.registerUser(EMAIL);
    const valid = await mint(s.key);
    expect((await s.app.request(gtrRequest("oidc", valid, emailBody(EMAIL)))).status).toBe(403);
  });

  it("the same token is accepted once the dispatcher client is configured (control)", async () => {
    const s = await makeHarness();
    await s.store.registerUser(EMAIL);
    expect((await s.app.request(gtrRequest("oidc", await mint(s.key), emailBody(EMAIL)))).status).toBe(204);
  });
});
