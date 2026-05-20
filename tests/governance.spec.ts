import { expect, test } from "@playwright/test";

test.describe("Governance ledger", () => {
  test("loads governance shell when auth bypass is on", async ({ page }) => {
    await page.goto("/governance");

    await expect(page.getByTestId("governance-ledger")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /governance ledger/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to command center/i }),
    ).toBeVisible();
    await expect(page.getByTestId("governance-export-pdf")).toBeVisible();
    await expect(page.getByTestId("governance-trust-score")).toBeVisible();
    await expect(page.getByTestId("governance-trust-score-standby")).toBeVisible();
    await expect(page.getByTestId("governance-ledger-standby")).toBeVisible();
    await expect(page.getByTestId("governance-status-brief")).toBeVisible();
  });

  test("export PDF button is visible and enabled in standby state", async ({ page }) => {
    await page.goto("/governance");

    const exportBtn = page.getByTestId("governance-export-pdf");
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
  });

  test("export PDF triggers a download when clicked", async ({ page }) => {
    // Seed a thread ID so the button doesn't bail with "no session" early return
    await page.addInitScript(() => {
      localStorage.setItem("vanguard-thread-id", "ci-test-thread-0001");
    });

    // Return a minimal valid PDF so the client-side blob download fires
    await page.route("**/api/governance/export/pdf**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from("%PDF-1.4 1 0 obj<</Type/Catalog>>endobj"),
      }),
    );

    await page.goto("/governance");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page.getByTestId("governance-export-pdf").click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test("Back to Command Center link navigates to /dashboard", async ({ page }) => {
    await page.goto("/governance");

    await page.getByRole("link", { name: /back to command center/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
