import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "dotenv";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setEnvValue } from "./dotenv-write.js";
import { generatePassword, isValidPassword, keyId, projectName, randomSecret } from "./secrets.js";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotenv-test-"));
  file = path.join(dir, ".env");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("setEnvValue", () => {
  it("replaces an existing line in place", () => {
    writeFileSync(file, "A=1\nB=\nC=3\n");
    setEnvValue("B", "two", file);
    expect(readFileSync(file, "utf8")).toBe("A=1\nB=two\nC=3\n");
  });

  it("appends a missing key and keeps a single trailing newline", () => {
    writeFileSync(file, "A=1\n");
    setEnvValue("NEW_KEY", "x", file);
    expect(readFileSync(file, "utf8")).toBe("A=1\nNEW_KEY=x\n");
  });

  it("creates the file when it is missing", () => {
    setEnvValue("A", "1", file);
    expect(readFileSync(file, "utf8")).toBe("A=1\n");
  });

  it("keeps comments and blank lines", () => {
    const original = "# header\n\n# about A\nA=\n\n# about B\nB=old\n";
    writeFileSync(file, original);
    setEnvValue("A", "new", file);
    expect(readFileSync(file, "utf8")).toBe(original.replace("A=\n", "A=new\n"));
  });

  it("does not match a key that merely shares a prefix", () => {
    writeFileSync(file, "OKTA_ORG_URL_EXTRA=keep\n");
    setEnvValue("OKTA_ORG_URL", "https://x", file);
    expect(readFileSync(file, "utf8")).toBe("OKTA_ORG_URL_EXTRA=keep\nOKTA_ORG_URL=https://x\n");
  });

  it("writes with mode 0600", () => {
    writeFileSync(file, "A=1\n", { mode: 0o644 });
    setEnvValue("A", "2", file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("quotes values dotenv would misread, and they round-trip", () => {
    for (const value of ["pa#ss word", "a$b`c\\d", "plain-value_1=="]) {
      setEnvValue("SECRET_VALUE", value, file);
      expect(parse(readFileSync(file, "utf8")).SECRET_VALUE).toBe(value);
    }
  });

  it("rejects bad keys and values with quotes or newlines", () => {
    expect(() => setEnvValue("lower", "x", file)).toThrow(/Invalid env key/);
    expect(() => setEnvValue("A", "it's", file)).toThrow();
    expect(() => setEnvValue("A", "two\nlines", file)).toThrow();
  });
});

describe("generated secrets", () => {
  it("passwords are 24 chars with upper, lower, digit, and a special", () => {
    for (let i = 0; i < 200; i++) expect(isValidPassword(generatePassword())).toBe(true);
  });

  it("isValidPassword rejects each missing class and the wrong length", () => {
    expect(isValidPassword("abcdefghijklmnopqrstuvw1")).toBe(false); // no upper, no special
    expect(isValidPassword("ABCDEFGHIJKLMNOPQRSTUV1!")).toBe(false); // no lower
    expect(isValidPassword("abcdefghijklmnopqrstuv!A")).toBe(false); // no digit
    expect(isValidPassword("abcdefghijklmnopqrstuv1A")).toBe(false); // no special
    expect(isValidPassword("aA1!")).toBe(false);
  });

  it("passwords survive a round trip through .env", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword();
      setEnvValue("POC_USER_PASSWORD", password, file);
      expect(parse(readFileSync(file, "utf8")).POC_USER_PASSWORD).toBe(password);
    }
  });

  it("random secrets are 43-char base64url and differ", () => {
    const a = randomSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomSecret()).not.toBe(a);
  });

  it("builds the project name and key ID formats", () => {
    expect(projectName()).toMatch(/^poc-fbm-mock-[0-9a-f]{6}$/);
    expect(keyId("harness", new Date("2026-10-28T12:00:00Z"))).toBe("poc-harness-20261028");
  });
});
