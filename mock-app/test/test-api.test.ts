import { beforeEach, describe, expect, it } from "vitest";
import { BASE, emailBody, gtrRequest, makeHarness, mint, type Harness } from "./helpers.js";

const KEY = "test-key-123";
const A = "poc-itp-user01@example.com";
const B = "poc-itp-user02@example.com";
let h: Harness;

function api(method: string, path: string, body?: unknown, headers: Record<string, string> = { "x-test-key": KEY }) {
  return h.app.request(
    new Request(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  h = await makeHarness();
});

describe("authentication", () => {
  it("every /test route is 401 without the key, and with a wrong key", async () => {
    const routes: [string, string][] = [
      ["GET", "/test/calls"],
      ["DELETE", "/test/calls"],
      ["GET", `/test/sessions?email=${A}`],
      ["POST", "/test/seed"],
      ["POST", "/test/faults"],
      ["POST", "/test/refresh"],
      ["GET", `/test/tokens?email=${A}`],
      ["POST", "/test/reset"],
    ];
    for (const [method, path] of routes) {
      expect((await api(method, path, undefined, {})).status, `${method} ${path} no key`).toBe(401);
      expect((await api(method, path, undefined, { "x-test-key": "wrong" })).status, `${method} ${path} wrong key`).toBe(401);
    }
  });

  it("is closed when no key is configured", async () => {
    const s = await makeHarness({ TEST_API_KEY: "" });
    const res = await s.app.request(new Request(`${BASE}/test/calls`, { headers: { "x-test-key": "anything" } }));
    expect(res.status).toBe(401);
  });

  it("an unauthenticated reset does not delete anything", async () => {
    await h.store.registerUser(A);
    await api("POST", "/test/reset", undefined, {});
    expect(await h.store.isKnownUser(A)).toBe(true);
  });
});

describe("seed and sessions", () => {
  it("seed registers users and creates one session per app", async () => {
    const res = await api("POST", "/test/seed", { emails: [A, B], apps: ["oidc", "saml", "vendor"] });
    expect(res.status).toBe(204);
    expect(await h.store.isKnownUser(A)).toBe(true);
    const sessions = await api("GET", `/test/sessions?email=${encodeURIComponent(A.toUpperCase())}`);
    expect(await sessions.json()).toEqual({ oidc: 1, saml: 1, vendor: 1, disabled: 0 });
  });

  it("seeding twice stacks sessions", async () => {
    await api("POST", "/test/seed", { emails: [A], apps: ["oidc"] });
    await api("POST", "/test/seed", { emails: [A], apps: ["oidc"] });
    expect(await (await api("GET", `/test/sessions?email=${A}`)).json()).toMatchObject({ oidc: 2 });
  });

  it("rejects a bad seed body and a missing email", async () => {
    expect((await api("POST", "/test/seed", { emails: [], apps: ["oidc"] })).status).toBe(400);
    expect((await api("POST", "/test/seed", { emails: [A], apps: ["nope"] })).status).toBe(400);
    expect((await api("POST", "/test/seed", { emails: ["not-an-email"], apps: ["oidc"] })).status).toBe(400);
    expect((await api("GET", "/test/sessions")).status).toBe(400);
  });
});

describe("faults affect the next revocation call", () => {
  it("a 422 fault set through the API turns the next call into a 422", async () => {
    await api("POST", "/test/seed", { emails: [A], apps: ["saml"] });
    expect((await api("POST", "/test/faults", { app: "saml", mode: "422" })).status).toBe(204);

    const token = await mint(h.key);
    expect((await h.app.request(gtrRequest("saml", token, emailBody(A)))).status).toBe(422);

    await api("POST", "/test/faults", { app: "saml", mode: "none" });
    expect((await h.app.request(gtrRequest("saml", token, emailBody(A)))).status).toBe(204);
  });

  it("a fault limited to one email leaves the other user alone", async () => {
    await api("POST", "/test/seed", { emails: [A, B], apps: ["saml"] });
    await api("POST", "/test/faults", { app: "saml", mode: "429-first", emails: [A] });
    const token = await mint(h.key);
    expect((await h.app.request(gtrRequest("saml", token, emailBody(B)))).status).toBe(204);
    expect((await h.app.request(gtrRequest("saml", token, emailBody(A)))).status).toBe(429);
    expect((await h.app.request(gtrRequest("saml", token, emailBody(A)))).status).toBe(204);
  });

  it("rejects an unknown app or mode", async () => {
    expect((await api("POST", "/test/faults", { app: "nope", mode: "422" })).status).toBe(400);
    expect((await api("POST", "/test/faults", { app: "saml", mode: "boom" })).status).toBe(400);
  });
});

describe("calls", () => {
  it("filters by email and since, accepting epoch milliseconds or an ISO date", async () => {
    await api("POST", "/test/seed", { emails: [A, B], apps: ["oidc"] });
    const token = await mint(h.key);
    h.clock.ms += 1_000;
    await h.app.request(gtrRequest("oidc", token, emailBody(A)));
    h.clock.ms += 1_000;
    await h.app.request(gtrRequest("oidc", token, emailBody(B)));

    const all = (await (await api("GET", "/test/calls")).json()) as { calls: { email: string }[] };
    expect(all.calls.map((c) => c.email)).toEqual([A, B]);

    const onlyA = (await (await api("GET", `/test/calls?email=${A}`)).json()) as { calls: unknown[] };
    expect(onlyA.calls).toHaveLength(1);

    const since = h.clock.ms; // the second call happened exactly now
    const recent = (await (await api("GET", `/test/calls?since=${since}`)).json()) as { calls: unknown[] };
    expect(recent.calls).toHaveLength(1);
    const iso = new Date(since).toISOString();
    const recentIso = (await (await api("GET", `/test/calls?since=${encodeURIComponent(iso)}`)).json()) as { calls: unknown[] };
    expect(recentIso.calls).toHaveLength(1);
    expect((await api("GET", "/test/calls?since=garbage")).status).toBe(400);
  });

  it("DELETE clears the call log but keeps users and sessions", async () => {
    await api("POST", "/test/seed", { emails: [A], apps: ["oidc"] });
    await h.app.request(gtrRequest("oidc", await mint(h.key), emailBody("nobody@example.com")));
    expect(((await (await api("GET", "/test/calls")).json()) as { calls: unknown[] }).calls).toHaveLength(1);
    expect((await api("DELETE", "/test/calls")).status).toBe(204);
    expect(((await (await api("GET", "/test/calls")).json()) as { calls: unknown[] }).calls).toHaveLength(0);
    expect(await h.store.isKnownUser(A)).toBe(true);
  });
});

describe("tokens, refresh, reset", () => {
  it("tokens reports presence only, never a value", async () => {
    await h.store.putEscrowRefreshToken("custom", A, "rt-super-secret");
    const res = await api("GET", `/test/tokens?email=${A}`);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ custom: true, org: false });
    expect(text).not.toContain("rt-super-secret");
  });

  it("refresh validates its body, then answers 501 until P2-T4 implements it", async () => {
    expect((await api("POST", "/test/refresh", { email: "bad", as: "custom" })).status).toBe(400);
    expect((await api("POST", "/test/refresh", { email: A, as: "other" })).status).toBe(400);
    expect((await api("POST", "/test/refresh", { email: A, as: "custom" })).status).toBe(501);
  });

  it("reset empties the store", async () => {
    await api("POST", "/test/seed", { emails: [A], apps: ["oidc", "saml"] });
    await api("POST", "/test/faults", { app: "saml", mode: "422" });
    await h.store.putEscrowRefreshToken("org", A, "rt");
    expect((await api("POST", "/test/reset")).status).toBe(204);
    expect(await h.store.isKnownUser(A)).toBe(false);
    expect(await h.store.countSessions(A)).toEqual({ oidc: 0, saml: 0, vendor: 0, disabled: 0 });
    expect(await h.store.listCalls()).toEqual([]);
    expect(await h.store.getEscrowRefreshToken("org", A)).toBeNull();
    expect(await h.store.takeFaultResponse("saml", A)).toBeNull();
  });
});
