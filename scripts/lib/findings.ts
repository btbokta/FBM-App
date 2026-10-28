import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./env.js";

export const FINDINGS_PATH = path.join(REPO_ROOT, "reports", "findings.json");

export interface Finding {
  value: string;
  at: string;
}
export type Findings = Record<string, Finding>;

export function readFindings(file: string = FINDINGS_PATH): Findings {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Findings) : {};
}

/** Writes one finding, keeping keys sorted. */
export function setFinding(key: string, value: string, file: string = FINDINGS_PATH, now: Date = new Date()): void {
  const findings = readFindings(file);
  findings[key] = { value, at: now.toISOString() };
  const sorted = Object.fromEntries(Object.entries(findings).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}

export function getFinding(key: string, file: string = FINDINGS_PATH): Finding | undefined {
  return readFindings(file)[key];
}
