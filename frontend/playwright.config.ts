import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for smoke tests against the running dev server.
 * Assumes the frontend is up at PLAYWRIGHT_BASE_URL (default 3000) and
 * the backend is reachable. CI should boot both before invoking `pnpm e2e`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
