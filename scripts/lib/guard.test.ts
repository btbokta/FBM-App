import { describe, expect, it } from "vitest";
import { GuardError, assertPreviewOrg } from "./guard.js";

const ORG = "https://acme-poc.oktapreview.com";

function metadataFetch(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
}

const good = { id: "00oABC123", _links: { organization: { href: `${ORG}/` } } };

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof GuardError) return err.code;
    throw err;
  }
  return "no error";
}

describe("assertPreviewOrg", () => {
  it("returns the org ID when everything matches", async () => {
    const result = await assertPreviewOrg(
      { OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: ORG, POC_EXPECTED_ORG_ID: "00oABC123" },
      metadataFetch(good),
    );
    expect(result).toEqual({ orgId: "00oABC123", orgUrl: ORG });
  });

  it("accepts a trailing slash on either URL and an unset expected ID", async () => {
    const result = await assertPreviewOrg(
      { OKTA_ORG_URL: `${ORG}/`, POC_EXPECTED_ORG_URL: ORG },
      metadataFetch(good),
    );
    expect(result.orgUrl).toBe(ORG);
  });

  it("aborts when the two URLs differ", async () => {
    const code = await codeOf(
      assertPreviewOrg(
        { OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: "https://other.oktapreview.com" },
        metadataFetch(good),
      ),
    );
    expect(code).toBe("ORG_URL_MISMATCH");
  });

  it("aborts when a URL is missing", async () => {
    expect(await codeOf(assertPreviewOrg({ OKTA_ORG_URL: ORG }, metadataFetch(good)))).toBe("ORG_URL_MISMATCH");
  });

  it("aborts for an okta.com org without making a request", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    const url = "https://acme.okta.com";
    const code = await codeOf(assertPreviewOrg({ OKTA_ORG_URL: url, POC_EXPECTED_ORG_URL: url }, spy));
    expect(code).toBe("NOT_PREVIEW");
    expect(called).toBe(false);
  });

  it("aborts for a non-https or lookalike host", async () => {
    for (const url of ["http://acme.oktapreview.com", "https://oktapreview.com.evil.example", "https://acme-admin.oktapreview.com.evil.io"]) {
      expect(await codeOf(assertPreviewOrg({ OKTA_ORG_URL: url, POC_EXPECTED_ORG_URL: url }, metadataFetch(good)))).toBe(
        "NOT_PREVIEW",
      );
    }
  });

  it("aborts when the org metadata points at a different org", async () => {
    const other = { id: "00oABC123", _links: { organization: { href: "https://other.oktapreview.com" } } };
    const code = await codeOf(
      assertPreviewOrg({ OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: ORG }, metadataFetch(other)),
    );
    expect(code).toBe("ORG_HREF_MISMATCH");
  });

  it("aborts when the org ID differs from the expected ID", async () => {
    const code = await codeOf(
      assertPreviewOrg(
        { OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: ORG, POC_EXPECTED_ORG_ID: "00oWRONG" },
        metadataFetch(good),
      ),
    );
    expect(code).toBe("ORG_ID_MISMATCH");
  });

  it("aborts when the org can't be reached", async () => {
    const failing = (async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    }) as typeof fetch;
    expect(await codeOf(assertPreviewOrg({ OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: ORG }, failing))).toBe(
      "ORG_UNREACHABLE",
    );
  });

  it("aborts on a non-200 metadata response", async () => {
    expect(
      await codeOf(assertPreviewOrg({ OKTA_ORG_URL: ORG, POC_EXPECTED_ORG_URL: ORG }, metadataFetch({}, 404))),
    ).toBe("ORG_UNREACHABLE");
  });
});
