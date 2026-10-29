import { randomUUID } from "node:crypto";
import type { Hono } from "hono";
import type { AppDeps } from "./create-app.js";
import { validateGtrBearer } from "./auth.js";
import type { AppKey, CallRecord } from "./store.js";

/** Apps that expose a Global Token Revocation endpoint. `vendor` has its own API-key endpoint. */
export const GTR_APPS = ["oidc", "saml", "disabled"] as const;
export type GtrApp = (typeof GTR_APPS)[number];

export type ParsedSubject =
  | { kind: "ok"; email: string; format: "email" | "iss_sub" }
  | { kind: "bad"; format: string | null }
  | { kind: "notFound"; format: string };

/**
 * Parses the Universal Logout subject (F11). Returns `bad` for a malformed request (400) and
 * `notFound` for a well-formed subject that can't belong to this app (404).
 */
export async function parseSubId(
  body: unknown,
  ctx: { orgUrl?: string; customAsIssuer?: string; emailBySub(sub: string): Promise<string | null> },
): Promise<ParsedSubject> {
  const subId = isRecord(body) ? body.sub_id : undefined;
  if (!isRecord(subId) || typeof subId.format !== "string") return { kind: "bad", format: null };
  const format = subId.format;

  if (format === "email") {
    const email = subId.email;
    if (typeof email !== "string" || !email.includes("@")) return { kind: "bad", format };
    return { kind: "ok", email: email.trim().toLowerCase(), format };
  }

  if (format === "iss_sub") {
    const { iss, sub } = subId;
    if (typeof iss !== "string" || typeof sub !== "string" || !iss || !sub) return { kind: "bad", format };
    const known = [ctx.orgUrl, ctx.customAsIssuer].filter(Boolean).map((u) => (u as string).replace(/\/+$/, ""));
    if (!known.includes(iss.replace(/\/+$/, ""))) return { kind: "notFound", format };
    const email = await ctx.emailBySub(sub);
    return email ? { kind: "ok", email, format } : { kind: "notFound", format };
  }

  return { kind: "bad", format };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGtrApp(value: string): value is GtrApp {
  return (GTR_APPS as readonly string[]).includes(value);
}

export function expectedSubFor(app: GtrApp, cfg: AppDeps["config"]): string | undefined {
  return app === "oidc" ? cfg.OIDC_CLIENT_ID : app === "saml" ? cfg.SAML_APP_ID : undefined;
}

/** Records every request to a revocation route, including rejected ones. */
export async function recordCall(
  deps: AppDeps,
  call: Omit<CallRecord, "id" | "receivedAt" | "receivedAtMs" | "durationMs">,
  startedMs: number,
): Promise<void> {
  const receivedAtMs = deps.now();
  await deps.store.appendCall({
    ...call,
    id: randomUUID(),
    receivedAt: new Date(receivedAtMs).toISOString(),
    receivedAtMs,
    durationMs: Math.max(0, deps.now() - startedMs),
  });
}

export function registerGtrRoutes(app: Hono, deps: AppDeps): void {
  app.post("/apps/:app/global-token-revocation", async (c) => {
    const startedMs = deps.now();
    const name = c.req.param("app");
    // 1. Unknown app: nothing to record against.
    if (!isGtrApp(name)) return c.json({ error: "unknown_app" }, 404);
    const appKey: AppKey = name;
    const base = { app: appKey, kind: "gtr" as const, email: null, subIdFormat: null, sessionsRevoked: 0 };
    const respond = async (
      status: number,
      extra: Partial<CallRecord> = {},
      headers: Record<string, string> = {},
    ) => {
      await recordCall(deps, { ...base, auth: "n/a", status, ...extra }, startedMs);
      return new Response(null, { status, headers });
    };

    // 2. Authentication.
    const audience = `${deps.config.PUBLIC_BASE_URL ?? new URL(c.req.url).origin}/apps/${name}/global-token-revocation`;
    const auth = await validateGtrBearer(c.req.header("authorization"), deps.config, deps, {
      app: name,
      audience,
      expectedSub: expectedSubFor(name, deps.config),
    });
    if (auth.outcome !== "ok") return respond(auth.status, { auth: auth.outcome, ...(auth.rejected ? { rejected: auth.rejected } : {}) });

    // 3. Body.
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return respond(400, { auth: "ok" });
    }
    const subject = await parseSubId(body, {
      orgUrl: deps.config.ORG_URL,
      customAsIssuer: deps.config.CUSTOM_AS_ISSUER,
      emailBySub: (sub) => deps.store.emailBySub(sub),
    });
    if (subject.kind === "bad") return respond(400, { auth: "ok", subIdFormat: subject.format });
    if (subject.kind === "notFound") return respond(404, { auth: "ok", subIdFormat: subject.format });

    const { email, format } = subject;
    const common = { auth: "ok" as const, email, subIdFormat: format };

    // 4. Injected fault.
    const fault = await deps.store.takeFaultResponse(appKey, email);
    if (fault !== null) return respond(fault, common, fault === 429 ? { "retry-after": "1" } : {});

    // 5. Unknown user.
    if (!(await deps.store.isKnownUser(email))) return respond(404, common);

    // 6. Revoke the app's sessions and the tokens it holds itself.
    const sessionsRevoked = await deps.store.revokeSessions(appKey, email);
    await deps.store.deleteAppTokens(email);
    return respond(204, { ...common, sessionsRevoked });
  });
}
