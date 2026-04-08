import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./downloadBlob";

describe("downloadBlob", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalDocument = (globalThis as { document?: unknown }).document;

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();

    if (typeof originalDocument === "undefined") {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = originalDocument;
    }
  });

  it("creates object URL, clicks anchor, removes anchor, and revokes URL", () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const objectUrl = "blob:test-url";

    const createObjectURLMock = vi.fn(() => objectUrl);
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL =
      createObjectURLMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL =
      revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;

    const clickMock = vi.fn();
    const removeMock = vi.fn();
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click: clickMock,
      remove: removeMock,
    };

    const appendChildMock = vi.fn();
    (globalThis as { document?: unknown }).document = {
      createElement: vi.fn((tag: string) => {
        if (tag !== "a") throw new Error(`Unexpected tag: ${tag}`);
        return anchor;
      }),
      body: { appendChild: appendChildMock },
    };

    downloadBlob({ blob, filename: "evidence.json" });

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(appendChildMock).toHaveBeenCalledWith(anchor);
    expect(anchor.href).toBe(objectUrl);
    expect(anchor.download).toBe("evidence.json");
    expect(anchor.rel).toBe("noopener");
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith(objectUrl);
  });

  it("still revokes object URL even if click throws", () => {
    const blob = new Blob(["boom"], { type: "text/plain" });
    const objectUrl = "blob:test-throw";

    const createObjectURLMock = vi.fn(() => objectUrl);
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL =
      createObjectURLMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL =
      revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;

    const anchor = {
      href: "",
      download: "",
      rel: "",
      click: vi.fn(() => {
        throw new Error("click-failed");
      }),
      remove: vi.fn(),
    };

    (globalThis as { document?: unknown }).document = {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn() },
    };

    expect(() => downloadBlob({ blob, filename: "broken.json" })).toThrow(
      "click-failed",
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith(objectUrl);
  });
});
