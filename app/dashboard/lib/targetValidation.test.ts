import { describe, expect, it } from "vitest";
import { normalizeTargetInput, validateTargetInput } from "./targetValidation";

describe("target validation", () => {
  it("rejects empty target", () => {
    const result = validateTargetInput("");
    expect(result.normalized).toBe("");
    expect(result.error).toBeTruthy();
  });

  it("normalizes scheme/path/trailing punctuation", () => {
    expect(normalizeTargetInput(" https://stripe.com./abc ")).toBe(
      "stripe.com",
    );
  });

  it("rejects malformed target", () => {
    const result = validateTargetInput("strie, com.");
    expect(result.error).toBeTruthy();
  });

  it("accepts valid domain", () => {
    const result = validateTargetInput("openai.com");
    expect(result.error).toBeNull();
    expect(result.normalized).toBe("openai.com");
  });
});
