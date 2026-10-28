/** Okta API scopes granted to the POC-Harness service app (plan section 6, F17). */
export const HARNESS_SCOPES = [
  "okta.userRisk.read",
  "okta.userRisk.manage",
  "okta.logs.read",
  "okta.users.read",
  "okta.users.manage",
  "okta.groups.read",
  "okta.apps.read",
  "okta.policies.read",
] as const;
