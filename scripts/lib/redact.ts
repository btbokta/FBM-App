const SECRET_NAME = /KEY|TOKEN|SECRET|PASSWORD/;
const MIN_SECRET_LENGTH = 6;

const PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, // JWT
  /SSWS\s+[A-Za-z0-9_-]{20,}/g, // Okta API token header
  /Bearer\s+[A-Za-z0-9._~+/-]{20,}/g,
];

/**
 * Replaces JWTs, SSWS/Bearer credentials, and the value of every environment variable whose name
 * contains KEY, TOKEN, SECRET, or PASSWORD. `extra` adds values the environment doesn't hold
 * (for example an access token the client just received).
 */
export function redact(
  text: string,
  extra: readonly string[] = [],
  env: Record<string, string | undefined> = process.env,
): string {
  const secrets = new Set<string>(extra.filter((v) => v.length >= MIN_SECRET_LENGTH));
  for (const [name, value] of Object.entries(env)) {
    if (value && value.length >= MIN_SECRET_LENGTH && SECRET_NAME.test(name)) secrets.add(value);
  }
  let out = text;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    out = out.split(secret).join("[redacted]");
  }
  for (const pattern of PATTERNS) out = out.replace(pattern, "[redacted]");
  return out;
}
