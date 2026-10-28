import { beforeEach, describe, expect, it } from "vitest";
import { BASE, makeHarness, type Harness } from "./helpers.js";

const EMAIL = "poc-itp-user01@example.com";
const KEY = "vendor-key-123";
let h: Harness;

function vendorRequest(body: unknown, headers: Record<string, string> = { "x-api-key": KEY }): Request {
  return new Request(`${BASE}/vendor/v1/sessions/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(async () => {
  h = await makeHarness();
  await h.store.registerUser(EMAIL);
  await h.store.createSession("vendor", EMAIL);
  await h.store.createSession("oidc", EMAIL);
});

const lastCall = async () => (await h.store.listCalls()).at(-1)!;

describe("POST /vendor/v1/sessions/revoke", () => {
  it("204 revokes only the vendor sessions and records a vendor call", async () => {
    const res = await h.app.request(vendorRequest({ email: EMAIL }));
    expect(res.status).toBe(204);
    expect(await h.store.countSessions(EMAIL)).toEqual({ oidc: 1, saml: 0, vendor: 0, disabled: 0 });
    expect(await lastCall()).toMatchObject({
      app: "vendor", kind: "vendor", email: EMAIL, auth: "ok", status: 204, sessionsRevoked: 1,
    });
  });

  it("matches the email case-insensitively", async () => {
    expect((await h.app.request(vendorRequest({ email: "POC-ITP-USER01@EXAMPLE.COM" }))).status).toBe(204);
  });

  it("401 without a key, with a wrong key, and with a longer key sharing the right prefix", async () => {
    expect((await h.app.request(vendorRequest({ email: EMAIL }, {}))).status).toBe(401);
    expect((await h.app.request(vendorRequest({ email: EMAIL }, { "x-api-key": "wrong" }))).status).toBe(401);
    expect((await h.app.request(vendorRequest({ email: EMAIL }, { "x-api-key": `${KEY}-extra` }))).status).toBe(401);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ vendor: 1 });
    expect(await lastCall()).toMatchObject({ status: 401, auth: "invalid", email: null });
  });

  it("401 for every call when no vendor key is configured", async () => {
    const s = await makeHarness({ VENDOR_API_KEY: "" });
    expect((await s.app.request(vendorRequest({ email: EMAIL }, { "x-api-key": "anything" }))).status).toBe(401);
  });

  it("400 for bad JSON, no email, and an email with no @", async () => {
    for (const body of ["{nope", "", {}, { email: 5 }, { email: "nope" }]) {
      expect((await h.app.request(vendorRequest(body))).status).toBe(400);
    }
  });

  it("404 for an unknown user", async () => {
    expect((await h.app.request(vendorRequest({ email: "nobody@example.com" }))).status).toBe(404);
  });

  it("422 by fault, and nothing is revoked", async () => {
    await h.store.setFault("vendor", "422");
    expect((await h.app.request(vendorRequest({ email: EMAIL }))).status).toBe(422);
    expect(await h.store.countSessions(EMAIL)).toMatchObject({ vendor: 1 });
  });

  it("500-once fails the first call and succeeds on the retry", async () => {
    await h.store.setFault("vendor", "500-once");
    expect((await h.app.request(vendorRequest({ email: EMAIL }))).status).toBe(500);
    expect((await h.app.request(vendorRequest({ email: EMAIL }))).status).toBe(204);
  });
});
