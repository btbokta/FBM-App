import { chmodSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { ENV_PATH, setEnvValue } from "./lib/dotenv-write.js";
import { REPO_ROOT } from "./lib/env.js";
import { generatePassword, keyId, projectName, randomSecret } from "./lib/secrets.js";

const KEYS_DIR = path.join(REPO_ROOT, "keys");
const TEMPLATE = path.join(REPO_ROOT, "docs", "env.template");

if (!existsSync(ENV_PATH)) {
  copyFileSync(TEMPLATE, ENV_PATH);
  chmodSync(ENV_PATH, 0o600);
  console.log("created .env from docs/env.template");
}

const current = parse(readFileSync(ENV_PATH, "utf8"));
const isEmpty = (key: string) => !current[key]?.trim();
const set: string[] = [];

function fill(key: string, make: () => string): void {
  if (!isEmpty(key)) return;
  const value = make();
  setEnvValue(key, value);
  current[key] = value;
  set.push(key);
}

// Harness key pair. The Okta provisioner is an API token, so only POC-Harness has a key.
const name = "harness";
const privatePath = path.join(KEYS_DIR, `${name}-private.pem`);
const publicPath = path.join(KEYS_DIR, `${name}.public.jwk.json`);
mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });

if (!existsSync(privatePath)) {
  const kid = current.OKTA_HARNESS_KEY_ID?.trim() || keyId(name);
  const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true });
  writeFileSync(privatePath, await exportPKCS8(privateKey), { mode: 0o600 });
  const jwk = { ...(await exportJWK(publicKey)), kid, use: "sig", alg: "RS256" };
  writeFileSync(publicPath, JSON.stringify(jwk, null, 2) + "\n");
  console.log(`generated keys/${name}-private.pem and keys/${name}.public.jwk.json`);
}
chmodSync(privatePath, 0o600);
const kid = (JSON.parse(readFileSync(publicPath, "utf8")) as { kid: string }).kid;
fill("OKTA_HARNESS_KEY_FILE", () => `keys/${name}-private.pem`);
fill("OKTA_HARNESS_KEY_ID", () => kid);

fill("POC_USER_PASSWORD", generatePassword);
fill("MOCK_TEST_API_KEY", randomSecret);
fill("MOCK_VENDOR_API_KEY", randomSecret);
fill("MOCK_GTR_STATIC_BEARER", randomSecret);
fill("VERCEL_PROJECT_NAME", projectName);

const defaults: Record<string, string> = {
  POC_BURST_USER_COUNT: "25",
  GTR_AUTH_MODE: "oauth",
  POC_T6_MAX_SECONDS: "60",
  POC_T6_MEDIAN_SECONDS: "30",
  POC_OBSERVE_TIMEOUT_SECONDS: "300",
  POC_ENABLE_CLIENT_CREDENTIALS: "true",
  POC_SOC_INCLUDE_RESPOND: "true",
  POC_FALLBACK_MODE: "false",
  POC_USER_EMAIL_DOMAIN: "example.com",
};
for (const [key, value] of Object.entries(defaults)) fill(key, () => value);

// Names only: values never leave .env.
console.log(set.length ? `set: ${set.join(", ")}` : "nothing to set; every generated value already exists");
