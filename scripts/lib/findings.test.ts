import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFinding, readFindings, setFinding } from "./findings.js";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "findings-test-"));
  file = path.join(dir, "reports", "findings.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("findings", () => {
  it("returns nothing before any finding is set", () => {
    expect(readFindings(file)).toEqual({});
    expect(getFinding("x", file)).toBeUndefined();
  });

  it("stores value and timestamp, creating the directory", () => {
    setFinding("t1.gtrStatus", "204", file, new Date("2026-10-28T01:02:03Z"));
    expect(getFinding("t1.gtrStatus", file)).toEqual({ value: "204", at: "2026-10-28T01:02:03.000Z" });
  });

  it("overwrites a key and keeps keys sorted", () => {
    setFinding("zeta", "1", file);
    setFinding("alpha", "1", file);
    setFinding("zeta", "2", file);
    expect(Object.keys(JSON.parse(readFileSync(file, "utf8")))).toEqual(["alpha", "zeta"]);
    expect(getFinding("zeta", file)?.value).toBe("2");
  });
});
