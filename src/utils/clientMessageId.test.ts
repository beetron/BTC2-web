import { afterEach, describe, expect, it, vi } from "vitest";
import { newClientMessageId } from "./clientMessageId";

// The pattern btc2-api accepts for clientMessageId
const API_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

describe("newClientMessageId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches the API's allowed format", () => {
    expect(newClientMessageId()).toMatch(API_PATTERN);
  });

  it("is different every time", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newClientMessageId()));
    expect(ids.size).toBe(100);
  });

  it("falls back to random hex without randomUUID (plain http)", () => {
    const realCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
    });

    const id = newClientMessageId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).toMatch(API_PATTERN);
  });
});
