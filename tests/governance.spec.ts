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
  });
});
