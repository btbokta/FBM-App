import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportPKCS8, generateKeyPair, decodeProtectedHeader, decodeJwt, jwtVerify } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DPOP_MESSAGE, OktaClient } from "./okta.js";
import { redact } from "./redact.js";

const ORG = "https://acme-poc.oktapreview.com";

let dir: string;
let keyFile: string;
let publicKey: Awaited<ReturnType<typeof generateKeyPair>>["publicKey"];

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  publicKey = pair.publicKey;
  dir = await mkdtemp(path.join(os.tmpdir(), "okta-test-"));
  keyFile = path.join(dir, "key.pem");
  await writeFile(keyFile, await exportPKCS8(pair.privateKey), { mode: 0o600 });
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

interface Call {
  url: string;
  init: RequestInit;
}

function scripted(responses: Array<() => Response>): { fetchFn: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra request");
    return next();
  }) as typeof fetch;
  return { fetchFn, calls };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

function oauthClient(fetchFn: typeof fetch, now: () => number = () => 1_700_000_000_000) {
  return new OktaClient({
    orgUrl: ORG,
    auth: { type: "oauth", clientId: "0oaCLIENT", keyFile, keyId: "poc-harness-kid", scopes: ["okta.logs.read", "okta.users.read"] },
    fetchFn,
    now,
    sleep: async () => {},
  });
}

describe("OktaClient oauth", () => {
  it("signs a client assertion with the expected header and claims", async () => {
    const { fetchFn, calls } = scripted([json({ access_token: "tok-1", expires_in: 3600 })]);
    await oauthClient(fetchFn).getToken();

    expect(calls[0].url).toBe(`${ORG}/oauth2/v1/token`);
    const form = new URLSearchParams(String(calls[0].init.body));
    expect(form.get("grant_type")).toBe("client_credentials");
    expect(form.get("scope")).toBe("okta.logs.read okta.users.read");
    expect(form.get("client_assertion_type")).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer");

    const assertion = form.get("client_assertion")!;
    expect(decodeProtectedHeader(assertion)).toMatchObject({ alg: "RS256", kid: "poc-harness-kid" });
    const { payload } = await jwtVerify(assertion, publicKey, { currentDate: new Date(1_700_000_000_000) });
    expect(payload.iss).toBe("0oaCLIENT");
    expect(payload.sub).toBe("0oaCLIENT");
    expect(payload.aud).toBe(`${ORG}/oauth2/v1/token`);
    expect(payload.exp! - payload.iat!).toBe(300);
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("caches the token until 60 s before expiry", async () => {
    let t = 1_700_000_000_000;
    const { fetchFn, calls } = scripted([
      json({ access_token: "tok-1", expires_in: 600 }),
      json({ access_token: "tok-2", expires_in: 600 }),
    ]);
    const client = oauthClient(fetchFn, () => t);

    expect(await client.getToken()).toBe("tok-1");
    t += 400_000;
    expect(await client.getToken()).toBe("tok-1");
    expect(calls).toHaveLength(1);
    t += 150_000; // 550 s in, inside the 60 s margin
    expect(await client.getToken()).toBe("tok-2");
    expect(calls).toHaveLength(2);
  });

  it("explains DPoP failures", async () => {
    const { fetchFn } = scripted([json({ error: "use_dpop_nonce" }, 400)]);
    await expect(oauthClient(fetchFn).getToken()).rejects.toThrow(DPOP_MESSAGE);
  });

  it("sends the access token as a Bearer header", async () => {
    const { fetchFn, calls } = scripted([json({ access_token: "tok-1", expires_in: 3600 }), json({ ok: true })]);
    await oauthClient(fetchFn).request("GET", "/api/v1/logs", { query: { limit: 1 } });
    expect(calls[1].url).toBe(`${ORG}/api/v1/logs?limit=1`);
    expect((calls[1].init.headers as Record<string, string>).authorization).toBe("Bearer tok-1");
  });

  it("keeps the access token out of thrown errors", async () => {
    const { fetchFn } = scripted([
      json({ access_token: "tok-secret-value-123", expires_in: 3600 }),
      () => {
        throw new Error("socket hang up for Bearer tok-secret-value-123");
      },
    ]);
    const err = await oauthClient(fetchFn)
      .request("GET", "/api/v1/users")
      .catch((e: Error) => e);
    expect(String(err)).not.toContain("tok-secret-value-123");
    expect(String(err)).toContain("[redacted]");
  });
});

describe("OktaClient ssws", () => {
  const token = "00abcdEFGH1234567890-api-token-value";
  const client = (fetchFn: typeof fetch, sleep: (ms: number) => Promise<void> = async () => {}) =>
    new OktaClient({ orgUrl: `${ORG}/`, auth: { type: "ssws", token }, fetchFn, sleep, now: () => 1_700_000_000_000 });

  it("sends Authorization: SSWS and never calls the token endpoint", async () => {
    const { fetchFn, calls } = scripted([json({ subdomain: "acme-poc" })]);
    const res = await client(fetchFn).request("GET", "/api/v1/org");
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${ORG}/api/v1/org`);
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(`SSWS ${token}`);
  });

  it("keeps the API token out of thrown errors", async () => {
    const { fetchFn } = scripted([
      () => {
        throw new Error(`connect failed, header was SSWS ${token}`);
      },
    ]);
    const err = await client(fetchFn).request("GET", "/api/v1/org").catch((e: Error) => e);
    expect(String(err)).not.toContain(token);
  });

  it("waits for X-Rate-Limit-Reset on a 429, then retries", async () => {
    const slept: number[] = [];
    const nowSec = 1_700_000_000;
    const { fetchFn, calls } = scripted([
      json({}, 429, { "x-rate-limit-reset": String(nowSec + 7) }),
      json({ ok: true }),
    ]);
    const res = await client(fetchFn, async (ms: number) => void slept.push(ms)).request("GET", "/api/v1/users");
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(slept).toEqual([8000]); // 7 s until reset plus 1 s margin
  });

  it("gives up after 5 attempts and returns the 429", async () => {
    const { fetchFn, calls } = scripted(Array.from({ length: 5 }, () => json({}, 429, { "x-rate-limit-reset": "1" })));
    const res = await client(fetchFn).request("GET", "/api/v1/users");
    expect(res.status).toBe(429);
    expect(calls).toHaveLength(5);
  });

  it("caps the rate-limit wait at 60 s", async () => {
    const slept: number[] = [];
    const { fetchFn } = scripted([json({}, 429, { "x-rate-limit-reset": String(1_700_000_000 + 600) }), json({})]);
    await client(fetchFn, async (ms: number) => void slept.push(ms)).request("GET", "/api/v1/users");
    expect(slept).toEqual([60_000]);
  });

  it("follows absolute links on the same org but refuses other origins", async () => {
    const { fetchFn, calls } = scripted([json([])]);
    await client(fetchFn).request("GET", `${ORG}/api/v1/logs?after=abc`);
    expect(calls[0].url).toBe(`${ORG}/api/v1/logs?after=abc`);

    const other = scripted([]);
    await expect(client(other.fetchFn).request("GET", "https://evil.example/api/v1/logs")).rejects.toThrow(
      /different origin/,
    );
    expect(other.calls).toHaveLength(0);
  });
});

describe("redact", () => {
  it("masks JWTs, SSWS and Bearer values, and secret-named env values", () => {
    const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl";
    const text = `jwt ${jwt} ssws SSWS 00aaaaaaaaaaaaaaaaaaaaaaaa bearer Bearer abcdefghijklmnopqrstuvwxyz mine hunter2-secret`;
    const out = redact(text, [], { MOCK_TEST_API_KEY: "hunter2-secret", POC_EXPECTED_ORG_ID: "00oABC" });
    expect(out).not.toContain(jwt);
    expect(out).not.toContain("00aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(out).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(out).not.toContain("hunter2-secret");
  });

  it("leaves values from non-secret variables alone", () => {
    expect(redact("org 00oABCDEF", [], { POC_EXPECTED_ORG_ID: "00oABCDEF" })).toBe("org 00oABCDEF");
  });
});
