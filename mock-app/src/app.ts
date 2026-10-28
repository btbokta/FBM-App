import { Hono } from "hono";
import type { JWTVerifyGetKey } from "jose";
import { isAsConfigured, isOidcConfigured, type Config } from "./config.js";
import { StoreMissingError, type Store } from "./store.js";

export const SERVICE_NAME = "poc-fbm-mock";
export const VERSION = "0.1.0";

export interface AppDeps {
  config: Config;
  store: Store;
  now(): number;
  fetchFn: typeof fetch;
  /** Key resolver for an authorization server's issuer URL (production: its /v1/keys endpoint). */
  jwksFor(issuer: string): JWTVerifyGetKey;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof StoreMissingError) return c.json({ error: "store_missing" }, 503);
    // Never log request headers: they carry bearer tokens and API keys.
    console.error(`unhandled ${err.name}: ${err.message}`);
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/healthz", async (c) => {
    const store = await deps.store.ping().catch(() => "error" as const);
    return c.json({
      ok: true,
      service: SERVICE_NAME,
      store,
      gtrAuthMode: deps.config.GTR_AUTH_MODE,
      configured: { oidc: isOidcConfigured(deps.config), as: isAsConfigured(deps.config) },
      version: VERSION,
    });
  });

  return app;
}
