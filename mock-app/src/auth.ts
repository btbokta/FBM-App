import { timingSafeEqual } from "node:crypto";
import { decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Config } from "./config.js";
import { OKTA_GTR_TYP, verifyOktaGtrJwt } from "./okta-signed-jwt.js";

export type AuthOutcome = "ok" | "missing" | "invalid" | "forbidden";

export interface AuthResult {
  outcome: AuthOutcome;
  /** HTTP status to answer with when outcome is not "ok". */
  status: 200 | 401 | 403;
  /** Why a 403 was given: the claims that mattered, never the token. Shown in /test/calls to debug a rejected token. */
  rejected?: { scp: unknown; cid: unknown; aud: unknown; iss: unknown; expectedScope: string; expectedCid: string | null };
}

export interface AuthDeps {
  jwksFor(issuer: string): JWTVerifyGetKey;
  now(): number;
}

export interface GtrContext {
  app: string;
  /** Endpoint URL Okta would sign as the JWT audience. */
  audience: string;
  expectedSub: string | undefined;
}

const ok: AuthResult = { outcome: "ok", status: 200 };
const missing: AuthResult = { outcome: "missing", status: 401 };
const invalid: AuthResult = { outcome: "invalid", status: 401 };
const forbidden: AuthResult = { outcome: "forbidden", status: 403 };

/** Compares two secrets without leaking their length or content through timing. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const padded = Buffer.alloc(Math.max(left.length, right.length));
  const paddedLeft = Buffer.concat([left, padded]).subarray(0, padded.length);
  const paddedRight = Buffer.concat([right, padded]).subarray(0, padded.length);
  return timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length;
}

function bearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/**
 * Validates the bearer on a Global Token Revocation call.
 *  - oauth mode: a client-credentials access token from POC-FBM-AS with the logout scope, issued to the dispatcher.
 *  - static mode: a fixed bearer.
 *  - A JWT with typ global-token-revocation+jwt is checked as Okta's signed request when that is enabled (F12).
 */
export async function validateGtrBearer(
  header: string | undefined,
  cfg: Config,
  deps: AuthDeps,
  ctx: GtrContext,
): Promise<AuthResult> {
  const token = bearerToken(header);
  if (!token) return missing;

  if (cfg.ACCEPT_OKTA_SIGNED_JWT && isOktaSigned(token)) {
    if (!cfg.ORG_URL || !ctx.expectedSub) return invalid;
    try {
      await verifyOktaGtrJwt(token, {
        orgUrl: cfg.ORG_URL,
        audience: ctx.audience,
        expectedSub: ctx.expectedSub,
        jwks: deps.jwksFor(`${cfg.ORG_URL}/oauth2`),
        currentDate: new Date(deps.now()),
      });
      return ok;
    } catch {
      return invalid;
    }
  }

  if (cfg.GTR_AUTH_MODE === "static") {
    if (!cfg.GTR_STATIC_BEARER) return invalid;
    return safeEqual(token, cfg.GTR_STATIC_BEARER) ? ok : invalid;
  }

  if (!cfg.CUSTOM_AS_ISSUER || !cfg.CUSTOM_AS_AUDIENCE) return invalid;
  let payload;
  try {
    ({ payload } = await jwtVerify(token, deps.jwksFor(cfg.CUSTOM_AS_ISSUER), {
      issuer: cfg.CUSTOM_AS_ISSUER,
      audience: cfg.CUSTOM_AS_AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: new Date(deps.now()),
    }));
  } catch {
    return invalid;
  }
  const scopes = Array.isArray(payload.scp) ? payload.scp : [];
  if (!scopes.includes(cfg.LOGOUT_SCOPE) || !cfg.DISPATCHER_CLIENT_ID || payload.cid !== cfg.DISPATCHER_CLIENT_ID) {
    return {
      ...forbidden,
      rejected: {
        scp: payload.scp,
        cid: payload.cid,
        aud: payload.aud,
        iss: payload.iss,
        expectedScope: cfg.LOGOUT_SCOPE,
        expectedCid: cfg.DISPATCHER_CLIENT_ID ?? null,
      },
    };
  }
  return ok;
}

function isOktaSigned(token: string): boolean {
  try {
    return decodeProtectedHeader(token).typ === OKTA_GTR_TYP;
  } catch {
    return false;
  }
}

/** Validates an X-API-Key header against a configured key. */
export function validateApiKey(provided: string | undefined, expected: string | undefined): AuthResult {
  if (!provided) return missing;
  if (!expected) return invalid;
  return safeEqual(provided, expected) ? ok : invalid;
}
