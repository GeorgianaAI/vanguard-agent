import { describe, expect, it } from "vitest";
import { csrfHeaderName, getCsrfCookieName, newCsrfToken } from "./csrf";

describe("csrf utilities", () => {
  it("returns the expected cookie name", () => {
    expect(getCsrfCookieName()).toBe("vanguard_csrf");
  });

  it("returns the expected header name", () => {
    expect(csrfHeaderName()).toBe("x-csrf-token");
  });

  it("generates a non-empty token", () => {
    const token = newCsrfToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("generates url-safe base64 tokens (no +, /, or = chars)", () => {
    const token = newCsrfToken();
    expect(token).not.toMatch(/[+/=]/);
  });

  it("generates unique tokens on successive calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => newCsrfToken()));
    expect(tokens.size).toBe(20);
  });

  it("generates tokens with sufficient length for entropy (≥32 chars)", () => {
    const token = newCsrfToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
  });
});
