import { randomUUID } from "node:crypto";

export type AppKey = "oidc" | "saml" | "vendor" | "disabled";
export const APP_KEYS: readonly AppKey[] = ["oidc", "saml", "vendor", "disabled"];

/** Which authorization server issued a token: the custom one (POC-FBM-AS) or the org one. */
export type AuthServer = "custom" | "org";

export type FaultMode = "none" | "422" | "429-first" | "500-once";

export interface CallRecord {
  id: string;
  receivedAt: string; // ISO with milliseconds
  receivedAtMs: number;
  app: AppKey;
  kind: "gtr" | "vendor";
  email: string | null;
  subIdFormat: string | null;
  auth: "ok" | "missing" | "invalid" | "forbidden" | "n/a";
  status: number;
  sessionsRevoked: number;
  durationMs: number;
  /** Set on a 403: the token's scope and client claims next to what the mock expected. */
  rejected?: Record<string, unknown>;
}

export interface PkceData {
  verifier: string;
  nonce: string;
  as: AuthServer;
}

/** What the home page shows after sign-in. Optional: sessions made by /test/seed carry none of it. */
export interface SessionDetails {
  /** Claims from the verified ID token. */
  profile?: Record<string, unknown>;
  /** The access token Okta issued at sign-in, shown to the signed-in user. */
  accessToken?: string;
  hasRefreshToken?: boolean;
  authServer?: AuthServer;
}

export interface SessionInfo extends SessionDetails {
  app: AppKey;
  email: string;
}

export type StoreHealth = "ok" | "missing" | "error";

/** Storage the mock app needs. Emails are lowercased by every implementation. */
export interface Store {
  registerUser(email: string, sub?: string, authServer?: AuthServer): Promise<void>;
  isKnownUser(email: string): Promise<boolean>;
  emailBySub(sub: string): Promise<string | null>;

  createSession(app: AppKey, email: string, details?: SessionDetails): Promise<string>;
  getSession(sid: string): Promise<SessionInfo | null>;
  countSessions(email: string): Promise<Record<AppKey, number>>;
  revokeSessions(app: AppKey, email: string): Promise<number>;

  appendCall(call: CallRecord): Promise<void>;
  listCalls(filter?: { email?: string; sinceMs?: number }): Promise<CallRecord[]>;
  clearCalls(): Promise<void>;

  /**
   * "422" always answers 422. "429-first" and "500-once" answer once per email after the fault is set.
   * `emails` limits the fault to those users. "none" clears it.
   */
  setFault(app: AppKey, mode: FaultMode, emails?: string[]): Promise<void>;
  takeFaultResponse(app: AppKey, email: string | null): Promise<number | null>;

  /** Refresh token the app itself holds; a revocation call deletes it. */
  putAppTokens(authServer: AuthServer, email: string, refreshToken: string): Promise<void>;
  deleteAppTokens(email: string): Promise<void>;
  /** Copy kept only so test T5 can ask Okta whether the token still works. Revocation calls leave it alone. */
  putEscrowRefreshToken(authServer: AuthServer, email: string, refreshToken: string): Promise<void>;
  getEscrowRefreshToken(authServer: AuthServer, email: string): Promise<string | null>;

  putPkce(state: string, data: PkceData, ttlSec: number): Promise<void>;
  takePkce(state: string): Promise<PkceData | null>;

  resetAll(): Promise<void>;
  ping(): Promise<StoreHealth>;
}

export class StoreMissingError extends Error {
  constructor() {
    super("No Redis store is configured (UPSTASH_REDIS_REST_URL / KV_REST_API_URL is unset)");
    this.name = "StoreMissingError";
  }
}

/** Used until Redis is attached: ping reports "missing" and everything else throws, which routes map to 503. */
export function createNullStore(): Store {
  return new Proxy({} as Store, {
    get(_target, prop) {
      if (typeof prop === "symbol" || prop === "then") return undefined;
      if (prop === "ping") return async (): Promise<StoreHealth> => "missing";
      return async () => {
        throw new StoreMissingError();
      };
    },
  });
}

export const lower = (email: string) => email.trim().toLowerCase();

export function emptyCounts(): Record<AppKey, number> {
  return { oidc: 0, saml: 0, vendor: 0, disabled: 0 };
}

interface Fault {
  mode: FaultMode;
  emails?: string[];
}

export class MemoryStore implements Store {
  private users = new Map<string, { sub?: string; as?: AuthServer }>();
  private subs = new Map<string, string>();
  private sessions = new Map<string, SessionInfo>();
  private calls: CallRecord[] = [];
  private faults = new Map<AppKey, Fault>();
  private faultSeen = new Map<AppKey, Set<string>>();
  private appTokens = new Map<string, string>();
  private escrow = new Map<string, string>();
  private pkce = new Map<string, { data: PkceData; expiresAtMs: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async registerUser(email: string, sub?: string, authServer?: AuthServer): Promise<void> {
    const key = lower(email);
    this.users.set(key, { sub, as: authServer });
    if (sub) this.subs.set(sub, key);
  }

  async isKnownUser(email: string): Promise<boolean> {
    return this.users.has(lower(email));
  }

  async emailBySub(sub: string): Promise<string | null> {
    return this.subs.get(sub) ?? null;
  }

  async createSession(app: AppKey, email: string, details: SessionDetails = {}): Promise<string> {
    const sid = randomUUID();
    this.sessions.set(sid, { ...details, app, email: lower(email) });
    return sid;
  }

  async getSession(sid: string): Promise<SessionInfo | null> {
    return this.sessions.get(sid) ?? null;
  }

  async countSessions(email: string): Promise<Record<AppKey, number>> {
    const counts = emptyCounts();
    const key = lower(email);
    for (const s of this.sessions.values()) if (s.email === key) counts[s.app]++;
    return counts;
  }

  async revokeSessions(app: AppKey, email: string): Promise<number> {
    const key = lower(email);
    let revoked = 0;
    for (const [sid, s] of this.sessions) {
      if (s.app === app && s.email === key) {
        this.sessions.delete(sid);
        revoked++;
      }
    }
    return revoked;
  }

  async appendCall(call: CallRecord): Promise<void> {
    this.calls.push(call);
  }

  async listCalls(filter: { email?: string; sinceMs?: number } = {}): Promise<CallRecord[]> {
    return filterCalls(this.calls, filter);
  }

  async clearCalls(): Promise<void> {
    this.calls = [];
  }

  async setFault(app: AppKey, mode: FaultMode, emails?: string[]): Promise<void> {
    this.faultSeen.delete(app);
    if (mode === "none") {
      this.faults.delete(app);
      return;
    }
    this.faults.set(app, { mode, emails: emails?.map(lower) });
  }

  async takeFaultResponse(app: AppKey, email: string | null): Promise<number | null> {
    const fault = this.faults.get(app);
    const key = email ? lower(email) : null;
    if (!fault || (fault.emails && (!key || !fault.emails.includes(key)))) return null;
    if (fault.mode === "422") return 422;
    // Once per email; a request with no usable email counts under "".
    const seen = this.faultSeen.get(app) ?? new Set<string>();
    this.faultSeen.set(app, seen);
    const who = key ?? "";
    if (seen.has(who)) return null;
    seen.add(who);
    return onceStatus(fault.mode);
  }

  async putAppTokens(authServer: AuthServer, email: string, refreshToken: string): Promise<void> {
    this.appTokens.set(`${authServer}:${lower(email)}`, refreshToken);
  }

  async deleteAppTokens(email: string): Promise<void> {
    for (const authServer of ["custom", "org"] as const) this.appTokens.delete(`${authServer}:${lower(email)}`);
  }

  async putEscrowRefreshToken(authServer: AuthServer, email: string, refreshToken: string): Promise<void> {
    this.escrow.set(`${authServer}:${lower(email)}`, refreshToken);
  }

  async getEscrowRefreshToken(authServer: AuthServer, email: string): Promise<string | null> {
    return this.escrow.get(`${authServer}:${lower(email)}`) ?? null;
  }

  async putPkce(state: string, data: PkceData, ttlSec: number): Promise<void> {
    this.pkce.set(state, { data, expiresAtMs: this.now() + ttlSec * 1000 });
  }

  async takePkce(state: string): Promise<PkceData | null> {
    const entry = this.pkce.get(state);
    this.pkce.delete(state);
    return entry && entry.expiresAtMs > this.now() ? entry.data : null;
  }

  async resetAll(): Promise<void> {
    this.users.clear();
    this.subs.clear();
    this.sessions.clear();
    this.calls = [];
    this.faults.clear();
    this.faultSeen.clear();
    this.appTokens.clear();
    this.escrow.clear();
    this.pkce.clear();
  }

  async ping(): Promise<StoreHealth> {
    return "ok";
  }
}

export function onceStatus(mode: FaultMode): number | null {
  return mode === "429-first" ? 429 : mode === "500-once" ? 500 : null;
}

export function filterCalls(calls: CallRecord[], filter: { email?: string; sinceMs?: number }): CallRecord[] {
  const email = filter.email ? lower(filter.email) : undefined;
  return calls.filter(
    (c) =>
      (email === undefined || c.email === email) && (filter.sinceMs === undefined || c.receivedAtMs >= filter.sinceMs),
  );
}
