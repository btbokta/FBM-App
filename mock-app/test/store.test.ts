import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore, createNullStore, StoreMissingError, type CallRecord, type Store } from "../src/store.js";

function call(overrides: Partial<CallRecord> = {}): CallRecord {
  return {
    id: "c1",
    receivedAt: "2026-10-28T00:00:00.000Z",
    receivedAtMs: 1_000,
    app: "oidc",
    kind: "gtr",
    email: "a@poc.invalid",
    subIdFormat: "email",
    auth: "ok",
    status: 204,
    sessionsRevoked: 1,
    durationMs: 3,
    ...overrides,
  };
}

// One contract suite so a future RedisStore integration run can reuse it.
function storeContract(name: string, make: () => Store) {
  describe(`${name} contract`, () => {
    let store: Store;
    beforeEach(() => {
      store = make();
    });

    it("lowercases emails and registers users by sub", async () => {
      await store.registerUser("User01@POC.invalid", "00uSUB1", "custom");
      expect(await store.isKnownUser("user01@poc.invalid")).toBe(true);
      expect(await store.isKnownUser("USER01@poc.invalid")).toBe(true);
      expect(await store.isKnownUser("other@poc.invalid")).toBe(false);
      expect(await store.emailBySub("00uSUB1")).toBe("user01@poc.invalid");
      expect(await store.emailBySub("nope")).toBeNull();
    });

    it("creates sessions, counts them per app, and revokes only the matching app and user", async () => {
      const sid = await store.createSession("oidc", "A@poc.invalid");
      await store.createSession("oidc", "a@poc.invalid");
      await store.createSession("saml", "a@poc.invalid");
      await store.createSession("oidc", "b@poc.invalid");

      expect(await store.getSession(sid)).toEqual({ app: "oidc", email: "a@poc.invalid" });
      expect(await store.countSessions("a@poc.invalid")).toEqual({ oidc: 2, saml: 1, vendor: 0, disabled: 0 });

      expect(await store.revokeSessions("oidc", "a@poc.invalid")).toBe(2);
      expect(await store.getSession(sid)).toBeNull();
      expect(await store.countSessions("a@poc.invalid")).toEqual({ oidc: 0, saml: 1, vendor: 0, disabled: 0 });
      expect(await store.countSessions("b@poc.invalid")).toMatchObject({ oidc: 1 });
      expect(await store.revokeSessions("oidc", "a@poc.invalid")).toBe(0);
    });

    it("stores calls and filters by email and since", async () => {
      await store.appendCall(call({ id: "1", receivedAtMs: 1_000, email: "a@poc.invalid" }));
      await store.appendCall(call({ id: "2", receivedAtMs: 2_000, email: "b@poc.invalid" }));
      await store.appendCall(call({ id: "3", receivedAtMs: 3_000, email: "a@poc.invalid" }));
      await store.appendCall(call({ id: "4", receivedAtMs: 4_000, email: null, status: 401 }));

      expect((await store.listCalls()).map((c) => c.id)).toEqual(["1", "2", "3", "4"]);
      expect((await store.listCalls({ email: "A@poc.invalid" })).map((c) => c.id)).toEqual(["1", "3"]);
      expect((await store.listCalls({ sinceMs: 3_000 })).map((c) => c.id)).toEqual(["3", "4"]);
      expect((await store.listCalls({ email: "a@poc.invalid", sinceMs: 2_000 })).map((c) => c.id)).toEqual(["3"]);

      await store.clearCalls();
      expect(await store.listCalls()).toEqual([]);
    });

    it("fault 422 answers 422 every time, for any email", async () => {
      await store.setFault("saml", "422");
      for (let i = 0; i < 3; i++) expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBe(422);
      expect(await store.takeFaultResponse("oidc", "a@poc.invalid")).toBeNull();
    });

    it("fault 429-first answers 429 once per email, then null", async () => {
      await store.setFault("saml", "429-first");
      expect(await store.takeFaultResponse("saml", "A@poc.invalid")).toBe(429);
      expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBeNull();
      expect(await store.takeFaultResponse("saml", "b@poc.invalid")).toBe(429);
      expect(await store.takeFaultResponse("saml", "b@poc.invalid")).toBeNull();
    });

    it("fault 500-once answers 500 once per email", async () => {
      await store.setFault("oidc", "500-once");
      expect(await store.takeFaultResponse("oidc", "a@poc.invalid")).toBe(500);
      expect(await store.takeFaultResponse("oidc", "a@poc.invalid")).toBeNull();
    });

    it("limits a fault to the listed emails", async () => {
      await store.setFault("saml", "422", ["a@poc.invalid"]);
      expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBe(422);
      expect(await store.takeFaultResponse("saml", "b@poc.invalid")).toBeNull();
      expect(await store.takeFaultResponse("saml", null)).toBeNull();
    });

    it("none clears a fault, and setting it again re-arms the once-per-email fault", async () => {
      await store.setFault("saml", "429-first");
      expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBe(429);
      await store.setFault("saml", "none");
      expect(await store.takeFaultResponse("saml", "b@poc.invalid")).toBeNull();
      await store.setFault("saml", "429-first");
      expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBe(429);
    });

    it("keeps escrow refresh tokens when app tokens are deleted", async () => {
      await store.putAppTokens("custom", "a@poc.invalid", "rt-app");
      await store.putEscrowRefreshToken("custom", "a@poc.invalid", "rt-escrow-custom");
      await store.putEscrowRefreshToken("org", "A@poc.invalid", "rt-escrow-org");
      await store.deleteAppTokens("a@poc.invalid");
      expect(await store.getEscrowRefreshToken("custom", "a@poc.invalid")).toBe("rt-escrow-custom");
      expect(await store.getEscrowRefreshToken("org", "a@poc.invalid")).toBe("rt-escrow-org");
      expect(await store.getEscrowRefreshToken("custom", "nobody@poc.invalid")).toBeNull();
    });

    it("PKCE state can be taken once", async () => {
      const data = { verifier: "v", nonce: "n", as: "custom" as const };
      await store.putPkce("state-1", data, 600);
      expect(await store.takePkce("state-1")).toEqual(data);
      expect(await store.takePkce("state-1")).toBeNull();
      expect(await store.takePkce("never-set")).toBeNull();
    });

    it("resetAll empties everything", async () => {
      await store.registerUser("a@poc.invalid", "sub");
      await store.createSession("oidc", "a@poc.invalid");
      await store.appendCall(call());
      await store.setFault("saml", "422");
      await store.putEscrowRefreshToken("custom", "a@poc.invalid", "rt");
      await store.putPkce("s", { verifier: "v", nonce: "n", as: "org" }, 600);

      await store.resetAll();

      expect(await store.isKnownUser("a@poc.invalid")).toBe(false);
      expect(await store.emailBySub("sub")).toBeNull();
      expect(await store.countSessions("a@poc.invalid")).toEqual({ oidc: 0, saml: 0, vendor: 0, disabled: 0 });
      expect(await store.listCalls()).toEqual([]);
      expect(await store.takeFaultResponse("saml", "a@poc.invalid")).toBeNull();
      expect(await store.getEscrowRefreshToken("custom", "a@poc.invalid")).toBeNull();
      expect(await store.takePkce("s")).toBeNull();
    });

    it("pings ok", async () => {
      expect(await store.ping()).toBe("ok");
    });
  });
}

storeContract("MemoryStore", () => new MemoryStore());

describe("MemoryStore PKCE expiry", () => {
  it("drops state after its ttl", async () => {
    let t = 1_000_000;
    const store = new MemoryStore(() => t);
    await store.putPkce("s", { verifier: "v", nonce: "n", as: "custom" }, 600);
    t += 601_000;
    expect(await store.takePkce("s")).toBeNull();
  });
});

describe("NullStore", () => {
  it("reports missing on ping and throws StoreMissingError for everything else", async () => {
    const store = createNullStore();
    expect(await store.ping()).toBe("missing");
    await expect(store.isKnownUser("a@poc.invalid")).rejects.toBeInstanceOf(StoreMissingError);
    await expect(store.appendCall(call())).rejects.toBeInstanceOf(StoreMissingError);
    await expect(store.resetAll()).rejects.toBeInstanceOf(StoreMissingError);
  });
});
