import { ENV_KEYS, loadEnv } from "./lib/env.js";

// Prints which variables are set. Never prints a value.
try {
  const env = loadEnv();
  const width = Math.max(...ENV_KEYS.map((k) => k.length));
  for (const key of ENV_KEYS) {
    console.log(`${key.padEnd(width)}  ${env[key] === undefined ? "missing" : "set"}`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : "env check failed");
  process.exit(1);
}
