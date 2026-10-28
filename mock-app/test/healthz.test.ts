import { describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { MemoryStore, createNullStore, type Store } from "../src/store.js";

function deps(env: Record<string, string>, store: Store): AppDeps {
  return {
    config: loadConfig(env),
    store,
    now: () => 1_000,
    fetchFn: fetch,
    jwksFor: () => {
      throw new Error("not used");
    },
  };
}

describe("GET /healthz", () => {
  it("reports an unconfigured app with no Redis", async () => {
    const res = await createApp(deps({}, createNullStore())).request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      service: "poc-fbm-mock",
      store: "missing",
      gtrAuthMode: "oauth",
      configured: { oidc: false, as: false },
      version: "0.1.0",
    });
  });

  it("reports configured OIDC and authorization server, and a working store", async () => {
    const env = {
      ORG_URL: "https://acme-poc.oktapreview.com/",
      PUBLIC_BASE_URL: "https://poc-fbm-mock-abc123.vercel.app",
      OIDC_CLIENT_ID: "0oaCLIENT",
      OIDC_CLIENT_SECRET: "oidc-secret-value",
      CUSTOM_AS_ISSUER: "https://acme-poc.oktapreview.com/oauth2/aus1",
      CUSTOM_AS_AUDIENCE: "api://poc-fbm-logout",
      GTR_AUTH_MODE: "static",
    };
    const res = await createApp(deps(env, new MemoryStore())).request("/healthz");
    const body = await res.json();
    expect(body).toMatchObject({ store: "ok", gtrAuthMode: "static", configured: { oidc: true, as: true } });
  });

  it("never includes a secret", async () => {
    const env = {
      OIDC_CLIENT_SECRET: "oidc-secret-value",
      TEST_API_KEY: "test-key-value",
      VENDOR_API_KEY: "vendor-key-value",
      GTR_STATIC_BEARER: "bearer-value",
    };
    const text = await (await createApp(deps(env, new MemoryStore())).request("/healthz")).text();
    for (const secret of Object.values(env)) expect(text).not.toContain(secret);
  });

  it("answers 200 with store=error when the store throws on ping", async () => {
    const broken = new MemoryStore();
    broken.ping = async () => {
      throw new Error("redis down");
    };
    const res = await createApp(deps({}, broken)).request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ store: "error" });
  });
});

describe("unknown store errors", () => {
  it("maps a missing store to 503 on routes that need it", async () => {
    const app = createApp(deps({}, createNullStore()));
    app.get("/needs-store", async (c) => {
      await createNullStore().isKnownUser("a@poc.invalid");
      return c.text("unreachable");
    });
    const res = await app.request("/needs-store");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "store_missing" });
  });
});

describe("loadConfig", () => {
  it("treats empty values as unset and applies defaults", () => {
    const cfg = loadConfig({ ORG_URL: "", LOGOUT_SCOPE: "  ", GTR_AUTH_MODE: "" });
    expect(cfg.ORG_URL).toBeUndefined();
    expect(cfg.LOGOUT_SCOPE).toBe("poc.fbm.logout");
    expect(cfg.GTR_AUTH_MODE).toBe("oauth");
    expect(cfg.ACCEPT_OKTA_SIGNED_JWT).toBe(false);
  });

  it("trims trailing slashes from URLs and parses the signed-JWT flag", () => {
    const cfg = loadConfig({ ORG_URL: "https://x.oktapreview.com//", ACCEPT_OKTA_SIGNED_JWT: "true" });
    expect(cfg.ORG_URL).toBe("https://x.oktapreview.com");
    expect(cfg.ACCEPT_OKTA_SIGNED_JWT).toBe(true);
  });

  it("rejects an invalid GTR_AUTH_MODE", () => {
    expect(() => loadConfig({ GTR_AUTH_MODE: "basic" })).toThrow();
  });
});
