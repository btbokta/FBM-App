import type { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "./app.js";
import { validateApiKey } from "./auth.js";
import type { OidcClient } from "./oidc.js";
import { APP_KEYS, type AppKey } from "./store.js";

const appSchema = z.enum(APP_KEYS as [AppKey, ...AppKey[]]);
const emails = z.array(z.string().includes("@"));
const seedSchema = z.object({ emails: emails.min(1), apps: z.array(appSchema).min(1) });
const faultSchema = z.object({
  app: appSchema,
  mode: z.enum(["none", "422", "429-first", "500-once"]),
  emails: emails.optional(),
});
const refreshSchema = z.object({ email: z.string().includes("@"), as: z.enum(["custom", "org"]) });

/** Harness-only API, behind X-Test-Key. It never returns a token value. */
export function registerTestApi(app: Hono, deps: AppDeps, oidc: OidcClient): void {
  app.use("/test/*", async (c, next) => {
    const auth = validateApiKey(c.req.header("x-test-key"), deps.config.TEST_API_KEY);
    if (auth.outcome !== "ok") return c.json({ error: "unauthorized" }, 401);
    await next();
  });

  app.get("/test/calls", async (c) => {
    const email = c.req.query("email") || undefined;
    const sinceRaw = c.req.query("since");
    let sinceMs: number | undefined;
    if (sinceRaw) {
      // Accept epoch milliseconds or an ISO timestamp.
      sinceMs = /^\d+$/.test(sinceRaw) ? Number(sinceRaw) : Date.parse(sinceRaw);
      if (!Number.isFinite(sinceMs)) return c.json({ error: "bad_since" }, 400);
    }
    return c.json({ calls: await deps.store.listCalls({ email, sinceMs }) });
  });

  app.delete("/test/calls", async (c) => {
    await deps.store.clearCalls();
    return c.body(null, 204);
  });

  app.get("/test/sessions", async (c) => {
    const email = c.req.query("email");
    if (!email) return c.json({ error: "email_required" }, 400);
    return c.json(await deps.store.countSessions(email));
  });

  app.post("/test/seed", async (c) => {
    const parsed = seedSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "bad_request" }, 400);
    for (const email of parsed.data.emails) {
      await deps.store.registerUser(email);
      for (const appKey of parsed.data.apps) await deps.store.createSession(appKey, email);
    }
    return c.body(null, 204);
  });

  app.post("/test/faults", async (c) => {
    const parsed = faultSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "bad_request" }, 400);
    await deps.store.setFault(parsed.data.app, parsed.data.mode, parsed.data.emails);
    return c.body(null, 204);
  });

  app.get("/test/tokens", async (c) => {
    const email = c.req.query("email");
    if (!email) return c.json({ error: "email_required" }, 400);
    const [custom, org] = await Promise.all([
      deps.store.getEscrowRefreshToken("custom", email),
      deps.store.getEscrowRefreshToken("org", email),
    ]);
    return c.json({ custom: custom !== null, org: org !== null });
  });

  app.post("/test/refresh", async (c) => {
    const parsed = refreshSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "bad_request" }, 400);
    return c.json(await oidc.refresh(parsed.data.email, parsed.data.as));
  });

  app.post("/test/reset", async (c) => {
    await deps.store.resetAll();
    return c.body(null, 204);
  });
}
