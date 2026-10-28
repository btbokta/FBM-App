import { jwtVerify, type JWTVerifyGetKey } from "jose";

/** `typ` header of the request JWT Okta signs for Universal Logout calls (F12). */
export const OKTA_GTR_TYP = "global-token-revocation+jwt";

export interface OktaSignedJwtOptions {
  orgUrl: string;
  /** The endpoint URL Okta would be calling; Okta sets it as `aud`. */
  audience: string;
  /** OIDC client_id or SAML app instance ID. */
  expectedSub: string;
  jwks: JWTVerifyGetKey;
  currentDate?: Date;
}

/**
 * Verifies Okta's signed Global Token Revocation request.
 * The FBM apps never receive these (Okta doesn't call apps with FBM on), so this is covered by unit
 * tests only (U16). In production the key set is `{ORG_URL}/oauth2/v1/keys`.
 */
export async function verifyOktaGtrJwt(token: string, opts: OktaSignedJwtOptions) {
  const { payload, protectedHeader } = await jwtVerify(token, opts.jwks, {
    typ: OKTA_GTR_TYP,
    issuer: opts.orgUrl,
    audience: opts.audience,
    subject: opts.expectedSub,
    algorithms: ["RS256"],
    maxTokenAge: "10m",
    requiredClaims: ["exp", "nbf", "iat", "jti"],
    clockTolerance: 30,
    currentDate: opts.currentDate,
  });
  return { payload, protectedHeader };
}
