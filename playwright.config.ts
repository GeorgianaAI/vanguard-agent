import { defineConfig, devices } from "@playwright/test";

/** Non-secret placeholder so @vercel/oidc getVercelOidcTokenSync() does not throw during Node SSR in `next build` / `next start`. */
const E2E_SERVER_ENV =
  "AUTH_E2E_BYPASS=true VERCEL_OIDC_TOKEN=e2e_ci_nonsecret_placeholder";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  // CI runs Chromium only (faster, matches typical Linux agents). Local: all three.
  projects: process.env.CI
    ? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
      ],

  webServer: process.env.CI
    ? {
        command: `${E2E_SERVER_ENV} npm run build && ${E2E_SERVER_ENV} npm run start`,
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 300_000,
      }
    : {
        command: `${E2E_SERVER_ENV} npm run dev`,
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
