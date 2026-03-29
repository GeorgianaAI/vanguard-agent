import { describe, expect, it } from "vitest";
import { shouldRejectApprovalForGraphState } from "./approvalGuards";

describe("shouldRejectApprovalForGraphState", () => {
  it("is false for empty snapshot", () => {
    expect(shouldRejectApprovalForGraphState({})).toBe(false);
  });

  it("is false when pending approval and scout has not run", () => {
    expect(
      shouldRejectApprovalForGraphState({
        isPendingApproval: true,
        scoutHasRun: false,
      }),
    ).toBe(false);
  });

  it("is true when not pending", () => {
    expect(
      shouldRejectApprovalForGraphState({
        isPendingApproval: false,
        scoutHasRun: false,
      }),
    ).toBe(true);
  });

  it("is true when scout already ran", () => {
    expect(
      shouldRejectApprovalForGraphState({
        isPendingApproval: true,
        scoutHasRun: true,
      }),
    ).toBe(true);
  });

  it("is true when pending is undefined but snapshot exists", () => {
    expect(shouldRejectApprovalForGraphState({ foo: 1 })).toBe(true);
  });
});
