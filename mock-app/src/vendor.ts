import type { Hono } from "hono";
import type { AppDeps } from "./create-app.js";
import { validateApiKey } from "./auth.js";
import { recordCall } from "./gtr.js";
import type { CallRecord } from "./store.js";

/** Vendor-style revoke endpoint: an API key instead of an OAuth token, and a bare `{email}` body. */
export function registerVendorRoutes(app: Hono, deps: AppDeps): void {
  app.post("/vendor/v1/sessions/revoke", async (c) => {
    const startedMs = deps.now();
    const base = { app: "vendor" as const, kind: "vendor" as const, email: null, subIdFormat: null, sessionsRevoked: 0 };
    const respond = async (status: number, extra: Partial<CallRecord> = {}) => {
      await recordCall(deps, { ...base, auth: "n/a", status, ...extra }, startedMs);
      return new Response(null, { status });
    };

    const auth = validateApiKey(c.req.header("x-api-key"), deps.config.VENDOR_API_KEY);
    if (auth.outcome !== "ok") return respond(auth.status, { auth: auth.outcome });

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return respond(400, { auth: "ok" });
    }
    const raw = typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined;
    if (typeof raw !== "string" || !raw.includes("@")) return respond(400, { auth: "ok" });
    const email = raw.trim().toLowerCase();
    const common = { auth: "ok" as const, email };

    const fault = await deps.store.takeFaultResponse("vendor", email);
    if (fault !== null) return respond(fault, common);

    if (!(await deps.store.isKnownUser(email))) return respond(404, common);

    const sessionsRevoked = await deps.store.revokeSessions("vendor", email);
    return respond(204, { ...common, sessionsRevoked });
  });
}
