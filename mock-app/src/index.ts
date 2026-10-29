import type { Hono } from "hono";
import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import { createApp, type AppDeps } from "./create-app.js";
import { loadConfig } from "./config.js";
import { RedisStore } from "./store-redis.js";
import { createNullStore } from "./store.js";

function realDeps(env: NodeJS.ProcessEnv = process.env): AppDeps {
  // Upstash for Redis injects UPSTASH_REDIS_REST_* or the legacy KV_REST_API_* names (F63).
  const hasRedis = Boolean(
    (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL) && (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN),
  );
  const keySets = new Map<string, JWTVerifyGetKey>();
  return {
    config: loadConfig(env),
    store: hasRedis ? new RedisStore() : createNullStore(),
    now: Date.now,
    fetchFn: fetch,
    jwksFor(issuer) {
      let keys = keySets.get(issuer);
      if (!keys) {
        keys = createRemoteJWKSet(new URL(`${issuer}/v1/keys`));
        keySets.set(issuer, keys);
      }
      return keys;
    },
  };
}

// Vercel's Hono builder serves the default export (F61), and only picks an entrypoint file that itself imports "hono".
const app: Hono = createApp(realDeps());
export default app;
