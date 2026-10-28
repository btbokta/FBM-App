import { randomBytes, randomInt } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SPECIAL = "!#%+-=";
const PASSWORD_LENGTH = 24;

const pick = (chars: string) => chars[randomInt(chars.length)];

/** 24 characters with at least one upper, lower, digit, and one of `!#%+-=`. */
export function generatePassword(): string {
  const all = UPPER + LOWER + DIGIT + SPECIAL;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SPECIAL)];
  while (chars.length < PASSWORD_LENGTH) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function isValidPassword(password: string): boolean {
  return (
    password.length === PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!#%+\-=]/.test(password)
  );
}

/** 32 random bytes, base64url. */
export function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function projectName(): string {
  return `poc-fbm-mock-${randomBytes(3).toString("hex")}`;
}

export function keyId(name: string, now: Date = new Date()): string {
  return `poc-${name}-${now.toISOString().slice(0, 10).replaceAll("-", "")}`;
}
