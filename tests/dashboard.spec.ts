import { expect, test } from "@playwright/test";

test.describe("Vanguard dashboard", () => {
  test("renders target, mission input, and deploy control", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByTestId("target-input")).toBeVisible();
    await expect(page.getByTestId("mission-input")).toBeVisible();
    await expect(page.getByTestId("deploy-button")).toBeVisible();
  });

  test("shows empty feed state before first mission", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText("Waiting for mission coordinates", { exact: false }),
    ).toBeVisible();
  });

  test("submitting mission triggers chat POST (mocked 500)", async ({ page }) => {
    let sawChatPost = false;
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") sawChatPost = true;
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Mission Aborted",
      });
    });

    await page.goto("/dashboard");
    await page.getByTestId("target-input").fill("openai.com");
    await page.getByTestId("mission-input").fill("test mission");
    await expect(page.getByTestId("deploy-button")).toBeEnabled();
    await page.getByTestId("deploy-button").click();

    await expect.poll(() => sawChatPost, { timeout: 15_000 }).toBe(true);
  });

  test("deploy shows executing state while chat POST is delayed", async ({
    page,
  }) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await gate;
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "x",
      });
    });

    await page.goto("/dashboard");
    await page.getByTestId("target-input").fill("openai.com");
    await page.getByTestId("mission-input").fill("delayed mission");
    await expect(page.getByTestId("deploy-button")).toBeEnabled();

    const chatPost = page.waitForRequest(
      (req) =>
        req.url().includes("/api/chat") && req.method() === "POST",
    );
    await page.getByTestId("deploy-button").click();
    await chatPost;

    await expect(page.getByTestId("deploy-button")).toBeDisabled();
    await expect(page.getByTestId("deploy-button")).toHaveText(/EXECUTING/i);

    release?.();
    await expect(page.getByTestId("deploy-button")).toBeEnabled({
      timeout: 15_000,
    });
  });

  test("shows operator notice when chat returns 429", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 429,
          contentType: "text/plain",
          body: "Too many missions. Cool down.",
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dashboard");
    await page.getByTestId("target-input").fill("openai.com");
    await page.getByTestId("mission-input").fill("rate limit probe");
    await expect(page.getByTestId("deploy-button")).toBeEnabled();
    await page.getByTestId("deploy-button").click();

    await expect(page.getByTestId("operator-notice")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("operator-notice")).toContainText(/rate/i);
  });
});

test.describe("Governance API (direct)", () => {
  test("rejects approval without approved boolean", async ({ request }) => {
    const res = await request.post("/api/chat", {
      headers: { "Content-Type": "application/json" },
      data: {
        isApproval: true,
        thread_id: "vanguard-e2e-governance-1",
        messages: [],
      },
    });
    expect(res.status(), await res.text()).toBe(400);
  });
});

test.describe("HITL live flow", () => {
  test.skip(
    !process.env.E2E_LIVE,
    "Set E2E_LIVE=1 with ANTHROPIC_API_KEY, TAVILY, Upstash in .env.local",
  );

  test("one approval card and authorize path", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/dashboard");
    await page.getByTestId("target-input").fill("openai.com");
    await page
      .getByTestId("mission-input")
      .fill(
        "Authorized defensive OSINT only. Target: openai.com. Run exactly one reconnaissance pass using domain_whois and tavily_search, then stop with a short summary.",
      );
    await page.getByTestId("deploy-button").click();

    await expect(page.getByTestId("authorize-mission")).toBeVisible({
      timeout: 120_000,
    });

    const cards = page.getByTestId("authorize-mission");
    await expect(cards).toHaveCount(1);

    await page.getByTestId("authorize-mission").click();

    await expect(page.getByText("Mission authorized", { exact: false })).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId("deploy-button")).toBeEnabled({
      timeout: 180_000,
    });
  });

  test("abort path: abort action produces mission aborted state", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/dashboard");
    await page.getByTestId("target-input").fill("openai.com");
    await page
      .getByTestId("mission-input")
      .fill(
        "Authorized defensive OSINT only. Target: openai.com. Run one recon pass using domain_whois, then stop.",
      );
    await page.getByTestId("deploy-button").click();

    await expect(page.getByTestId("abort-action")).toBeVisible({
      timeout: 120_000,
    });

    await page.getByTestId("abort-action").click();

    await expect(page.getByText("Mission aborted", { exact: false })).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId("deploy-button")).toBeEnabled({
      timeout: 60_000,
    });
  });
});
