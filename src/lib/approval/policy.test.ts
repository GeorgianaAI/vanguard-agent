import { describe, expect, it } from "vitest";
import {
  getApprovalPolicyLabel,
  isAllowedApprovalTool,
  validateApprovalToolArgs,
} from "./policy";

describe("approval policy allowlist", () => {
  it("accepts known tools", () => {
    expect(isAllowedApprovalTool("domain_whois")).toBe(true);
    expect(isAllowedApprovalTool("tavily_search")).toBe(true);
    expect(isAllowedApprovalTool("exec_shell")).toBe(false);
  });
});

describe("validateApprovalToolArgs", () => {
  it("validates domain_whois args", () => {
    expect(validateApprovalToolArgs("domain_whois", { domain: "openai.com" })).toBe(
      true,
    );
    expect(validateApprovalToolArgs("domain_whois", { domain: "openai.com." })).toBe(
      true,
    );
    expect(validateApprovalToolArgs("domain_whois", { domain: "bad domain" })).toBe(
      false,
    );
  });

  it("validates tavily_search args", () => {
    expect(validateApprovalToolArgs("tavily_search", { query: "security exposure" })).toBe(
      true,
    );
    expect(validateApprovalToolArgs("tavily_search", { query: "x" })).toBe(false);
  });
});

describe("getApprovalPolicyLabel", () => {
  it("returns label by tool category", () => {
    expect(getApprovalPolicyLabel("domain_whois")).toBe("READ-ONLY PUBLIC DATA");
    expect(getApprovalPolicyLabel("tavily_search")).toBe("NETWORK QUERY");
    expect(getApprovalPolicyLabel("exec")).toBe("EXECUTION / HIGH RISK");
  });
});
