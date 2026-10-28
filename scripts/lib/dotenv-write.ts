import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./env.js";

export const ENV_PATH = path.join(REPO_ROOT, ".env");

// dotenv treats an unquoted `#` as the start of a comment, so values with `#`, whitespace, or
// shell-special characters are single-quoted. dotenv and `. ./.env` both read single quotes literally.
const NEEDS_QUOTES = /[#\s"$`\\]/;

export function formatValue(value: string): string {
  if (value.includes("'") || /[\r\n]/.test(value)) throw new Error("Value can't contain quotes or newlines");
  return NEEDS_QUOTES.test(value) ? `'${value}'` : value;
}

/**
 * Sets KEY=value in the env file: replaces the first KEY= line, or appends one. Other lines,
 * comments, and order are kept. The file is written atomically with mode 0600.
 */
export function setEnvValue(key: string, value: string, file: string = ENV_PATH): void {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error(`Invalid env key: ${key}`);
  const line = `${key}=${formatValue(value)}`;
  const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  const pattern = new RegExp(`^\\s*(export\\s+)?${key}=`);
  const index = lines.findIndex((l) => pattern.test(l));

  if (index >= 0) {
    lines[index] = line;
  } else {
    // Keep a single trailing newline: drop the empty element left by a final "\n", append, restore.
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(line, "");
  }
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, lines.join("\n"), { mode: 0o600 });
  renameSync(tmp, file);
  chmodSync(file, 0o600);
}
