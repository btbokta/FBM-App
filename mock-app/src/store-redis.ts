import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import {
  APP_KEYS,
  emptyCounts,
  filterCalls,
  lower,
  onceStatus,
  type AppKey,
  type AuthServer,
  type CallRecord,
  type FaultMode,
  type PkceData,
  type SessionDetails,
  type SessionInfo,
  type Store,
  type StoreHealth,
} from "./store.js";

// Key layout (all under "poc:" so resetAll can find them):
//   poc:user:<email> hash {sub, as}          poc:sub:<sub> -> email
//   poc:sess:<sid> hash {app, email, d}      poc:usess:<app>:<email> set of sids
//     d is the sign-in details as one object {profile, accessToken, hasRefreshToken, authServer}
//   poc:calls list of call records           poc:fault:<app> {mode, emails}   poc:faultseen:<app> set of emails
//   poc:apptok:<as>:<email>, poc:escrow:<as>:<email>  {v: refreshToken}
//   poc:pkce:<state> with EX
//
// Upstash JSON-parses any string reply that looks like JSON (so "123" comes back as a number).
// Everything non-trivial is therefore stored as an object or a UUID/email, never a bare opaque string.

interface FaultJson {
  mode: FaultMode;
  emails?: string[];
}

export class RedisStore implements Store {
  /** `Redis.fromEnv()` reads UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN (F63). */
  constructor(private readonly redis: Redis = Redis.fromEnv()) {}

  async registerUser(email: string, sub?: string, authServer?: AuthServer): Promise<void> {
    const key = lower(email);
    await this.redis.hset(`poc:user:${key}`, { sub: sub ?? "", as: authServer ?? "" });
    if (sub) await this.redis.set(`poc:sub:${sub}`, { email: key });
  }

  async isKnownUser(email: string): Promise<boolean> {
    return (await this.redis.exists(`poc:user:${lower(email)}`)) > 0;
  }

  async emailBySub(sub: string): Promise<string | null> {
    const row = await this.redis.get<{ email: string }>(`poc:sub:${sub}`);
    return row?.email ?? null;
  }

  async createSession(app: AppKey, email: string, details: SessionDetails = {}): Promise<string> {
    const sid = randomUUID();
    const key = lower(email);
    // The details go in as one object so the client never has to guess how to read a bare token string back.
    const hasDetails = Object.values(details).some((v) => v !== undefined);
    await this.redis.hset(`poc:sess:${sid}`, hasDetails ? { app, email: key, d: details } : { app, email: key });
    await this.redis.sadd(`poc:usess:${app}:${key}`, sid);
    return sid;
  }

  async getSession(sid: string): Promise<SessionInfo | null> {
    const row = await this.redis.hgetall<{ app: AppKey; email: string; d?: SessionDetails }>(`poc:sess:${sid}`);
    if (!row) return null;
    return { app: row.app, email: String(row.email), ...(row.d && typeof row.d === "object" ? row.d : {}) };
  }

  async countSessions(email: string): Promise<Record<AppKey, number>> {
    const key = lower(email);
    const counts = emptyCounts();
    const sizes = await Promise.all(APP_KEYS.map((app) => this.redis.scard(`poc:usess:${app}:${key}`)));
    APP_KEYS.forEach((app, i) => {
      counts[app] = sizes[i];
    });
    return counts;
  }

  async revokeSessions(app: AppKey, email: string): Promise<number> {
    const setKey = `poc:usess:${app}:${lower(email)}`;
    const sids = (await this.redis.smembers(setKey)).map(String);
    if (sids.length === 0) return 0;
    await this.redis.del(...sids.map((sid) => `poc:sess:${sid}`), setKey);
    return sids.length;
  }

  async appendCall(call: CallRecord): Promise<void> {
    await this.redis.rpush("poc:calls", call);
  }

  async listCalls(filter: { email?: string; sinceMs?: number } = {}): Promise<CallRecord[]> {
    const rows = await this.redis.lrange<CallRecord | string>("poc:calls", 0, -1);
    const calls = rows.map((row) => (typeof row === "string" ? (JSON.parse(row) as CallRecord) : row));
    return filterCalls(calls, filter);
  }

  async clearCalls(): Promise<void> {
    await this.redis.del("poc:calls");
  }

  async setFault(app: AppKey, mode: FaultMode, emails?: string[]): Promise<void> {
    await this.redis.del(`poc:faultseen:${app}`);
    if (mode === "none") {
      await this.redis.del(`poc:fault:${app}`);
      return;
    }
    const fault: FaultJson = { mode, emails: emails?.map(lower) };
    await this.redis.set(`poc:fault:${app}`, fault);
  }

  async takeFaultResponse(app: AppKey, email: string | null): Promise<number | null> {
    const fault = await this.redis.get<FaultJson>(`poc:fault:${app}`);
    const key = email ? lower(email) : null;
    if (!fault || (fault.emails && (!key || !fault.emails.includes(key)))) return null;
    if (fault.mode === "422") return 422;
    // SADD returns 1 only for the first caller, so concurrent requests can't both take the fault.
    const added = await this.redis.sadd(`poc:faultseen:${app}`, key ?? "(none)");
    return added === 1 ? onceStatus(fault.mode) : null;
  }

  async putAppTokens(authServer: AuthServer, email: string, refreshToken: string): Promise<void> {
    await this.redis.set(`poc:apptok:${authServer}:${lower(email)}`, { v: refreshToken });
  }

  async deleteAppTokens(email: string): Promise<void> {
    const key = lower(email);
    await this.redis.del(`poc:apptok:custom:${key}`, `poc:apptok:org:${key}`);
  }

  async putEscrowRefreshToken(authServer: AuthServer, email: string, refreshToken: string): Promise<void> {
    await this.redis.set(`poc:escrow:${authServer}:${lower(email)}`, { v: refreshToken });
  }

  async getEscrowRefreshToken(authServer: AuthServer, email: string): Promise<string | null> {
    const row = await this.redis.get<{ v: string }>(`poc:escrow:${authServer}:${lower(email)}`);
    return row?.v ?? null;
  }

  async putPkce(state: string, data: PkceData, ttlSec: number): Promise<void> {
    await this.redis.set(`poc:pkce:${state}`, data, { ex: ttlSec });
  }

  async takePkce(state: string): Promise<PkceData | null> {
    return this.redis.getdel<PkceData>(`poc:pkce:${state}`);
  }

  async resetAll(): Promise<void> {
    let cursor: string | number = "0";
    do {
      const [next, keys]: [string | number, string[]] = await this.redis.scan(cursor, { match: "poc:*", count: 500 });
      if (keys.length) await this.redis.del(...keys);
      cursor = next;
    } while (String(cursor) !== "0");
  }

  async ping(): Promise<StoreHealth> {
    try {
      await this.redis.ping();
      return "ok";
    } catch {
      return "error";
    }
  }
}
