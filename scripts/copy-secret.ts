import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ENV_KEYS, REPO_ROOT, loadEnv } from "./lib/env.js";

// Puts a secret on the macOS clipboard and prints only its length, so it never reaches a terminal or log.
//   <ENV_NAME>            the value from .env
//   bearer:<ENV_NAME>     "Bearer <value>"
//   jwk:harness           the harness public JWK (public key only)
const source = process.argv[2];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!source) fail("Usage: npm run secret:copy -- <ENV_NAME> | bearer:<ENV_NAME> | jwk:harness");

function envValue(name: string): string {
  if (!(ENV_KEYS as string[]).includes(name)) fail(`Unknown variable: ${name}`);
  const value = (loadEnv() as Record<string, unknown>)[name];
  if (value === undefined || value === "") fail(`${name} is not set`);
  return String(value);
}

let text: string;
if (source.startsWith("bearer:")) {
  text = `Bearer ${envValue(source.slice("bearer:".length))}`;
} else if (source.startsWith("jwk:")) {
  const name = source.slice("jwk:".length);
  if (name !== "harness") fail(`Unknown key set: ${name} (only "harness" has a key)`);
  try {
    text = readFileSync(path.join(REPO_ROOT, "keys", `${name}.public.jwk.json`), "utf8").trim();
  } catch {
    fail("keys/harness.public.jwk.json not found; run npm run setup:secrets");
  }
} else {
  text = envValue(source);
}

const result = spawnSync("pbcopy", { input: text });
if (result.status !== 0) fail("pbcopy failed");
console.log(`copied ${source} (${text.length} chars)`);
