import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SignJWT, importPKCS8 } from "jose";
import { EnvError, REPO_ROOT, type PocEnv } from "./env.js";
import { redact } from "./redact.js";
import { HARNESS_SCOPES } from "./scopes.js";

export type OktaAuth =
  | { type: "ssws"; token: string }
  | { type: "oauth"; clientId: string; keyFile: string; keyId: string; scopes: readonly string[] };

export interface OktaClientOptions {
  orgUrl: string;
  auth: OktaAuth;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface OktaResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

const MAX_ATTEMPTS = 5;
const MAX_RATE_LIMIT_WAIT_MS = 60_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const ASSERTION_LIFETIME_S = 300;

export const DPOP_MESSAGE =
  "DPoP is required on this service app; set dpop_bound_access_tokens = false (infra/harness.tf)";

/**
 * Okta management API client. `ssws` sends an API token; `oauth` signs a private_key_jwt client
 * assertion and exchanges it for a scoped access token (F15). Only talks to its own org URL.
 */
export class OktaClient {
  readonly orgUrl: string;
  private readonly auth: OktaAuth;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private cached?: { token: string; expiresAtMs: number };
  private privateKey?: Awaited<ReturnType<typeof importPKCS8>>;

  constructor(opts: OktaClientOptions) {
    this.orgUrl = opts.orgUrl.replace(/\/+$/, "");
    this.auth = opts.auth;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = opts.now ?? Date.now;
  }

  private secrets(): string[] {
    if (this.auth.type === "ssws") return [this.auth.token];
    return this.cached ? [this.cached.token] : [];
  }

  private fail(message: string): Error {
    return new Error(redact(message, this.secrets()));
  }

  /** Returns an OAuth access token, cached until 60 s before it expires. */
  async getToken(): Promise<string> {
    if (this.auth.type !== "oauth") throw new Error("getToken() applies to oauth auth only");
    const auth = this.auth;
    const nowMs = this.now();
    if (this.cached && nowMs < this.cached.expiresAtMs - TOKEN_REFRESH_MARGIN_MS) {
      return this.cached.token;
    }

    this.privateKey ??= await importPKCS8(await readFile(auth.keyFile, "utf8"), "RS256");
    const iat = Math.floor(nowMs / 1000);
    const assertion = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: auth.keyId })
      .setIssuer(auth.clientId)
      .setSubject(auth.clientId)
      .setAudience(`${this.orgUrl}/oauth2/v1/token`)
      .setIssuedAt(iat)
      .setExpirationTime(iat + ASSERTION_LIFETIME_S)
      .setJti(randomUUID())
      .sign(this.privateKey);

    const form = new URLSearchParams({
      grant_type: "client_credentials",
      scope: auth.scopes.join(" "),
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
    });
    let res: Response;
    try {
      res = await this.fetchFn(`${this.orgUrl}/oauth2/v1/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: form.toString(),
      });
    } catch (err) {
      throw this.fail(`Token request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    const body = (await parseBody(res)) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } | null;

    if (!res.ok || !body?.access_token) {
      if (body?.error === "use_dpop_nonce" || body?.error === "invalid_dpop_proof") {
        throw new Error(DPOP_MESSAGE);
      }
      const detail = [body?.error, body?.error_description].filter(Boolean).join(": ");
      throw this.fail(`Token request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    this.cached = { token: body.access_token, expiresAtMs: nowMs + (body.expires_in ?? 3600) * 1000 };
    return this.cached.token;
  }

  private async authorization(): Promise<string> {
    return this.auth.type === "ssws" ? `SSWS ${this.auth.token}` : `Bearer ${await this.getToken()}`;
  }

  private buildUrl(pathOrUrl: string, query?: RequestOptions["query"]): string {
    let url: string;
    if (/^https?:\/\//i.test(pathOrUrl)) {
      // Pagination links come back as absolute URLs; never send credentials anywhere else.
      if (!pathOrUrl.startsWith(`${this.orgUrl}/`)) {
        throw new Error(`Refusing to send Okta credentials to a different origin: ${new URL(pathOrUrl).origin}`);
      }
      url = pathOrUrl;
    } else if (pathOrUrl.startsWith("/")) {
      url = `${this.orgUrl}${pathOrUrl}`;
    } else {
      throw new Error(`Okta request path must start with "/": ${pathOrUrl}`);
    }
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v));
      const qs = params.toString();
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }
    return url;
  }

  private rateLimitWaitMs(headers: Headers): number {
    const reset = Number(headers.get("x-rate-limit-reset"));
    if (!Number.isFinite(reset) || reset <= 0) return 1000;
    return Math.min(MAX_RATE_LIMIT_WAIT_MS, Math.max(0, reset * 1000 - this.now()) + 1000);
  }

  /** Sends a request; on 429 waits for X-Rate-Limit-Reset and retries, up to 5 attempts (F26). */
  async request(method: string, pathOrUrl: string, opts: RequestOptions = {}): Promise<OktaResponse> {
    const url = this.buildUrl(pathOrUrl, opts.query);
    const label = `${method} ${new URL(url).pathname}`;
    for (let attempt = 1; ; attempt++) {
      const headers: Record<string, string> = {
        authorization: await this.authorization(),
        accept: "application/json",
      };
      if (opts.body !== undefined) headers["content-type"] = "application/json";

      let res: Response;
      try {
        res = await this.fetchFn(url, {
          method,
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        });
      } catch (err) {
        throw this.fail(`Okta request failed: ${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (res.status === 429 && attempt < MAX_ATTEMPTS) {
        const waitMs = this.rateLimitWaitMs(res.headers);
        await res.text();
        await this.sleep(waitMs);
        continue;
      }
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
      return { status: res.status, headers: responseHeaders, body: await parseBody(res) };
    }
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function need(env: PocEnv, name: keyof PocEnv): string {
  const value = env[name];
  if (typeof value !== "string" || !value) throw new EnvError([name]);
  return value;
}

/** Client for Terraform-adjacent setup, session protection, and teardown scripts (Super Administrator API token). */
export function provisionerClient(env: PocEnv, fetchFn?: typeof fetch): OktaClient {
  return new OktaClient({
    orgUrl: need(env, "OKTA_ORG_URL"),
    auth: { type: "ssws", token: need(env, "OKTA_API_TOKEN") },
    fetchFn,
  });
}

/** Client for tests: the scoped POC-Harness service app. */
export function harnessClient(env: PocEnv, fetchFn?: typeof fetch): OktaClient {
  return new OktaClient({
    orgUrl: need(env, "OKTA_ORG_URL"),
    auth: {
      type: "oauth",
      clientId: need(env, "OKTA_HARNESS_CLIENT_ID"),
      keyFile: path.resolve(REPO_ROOT, need(env, "OKTA_HARNESS_KEY_FILE")),
      keyId: need(env, "OKTA_HARNESS_KEY_ID"),
      scopes: HARNESS_SCOPES,
    },
    fetchFn,
  });
}
