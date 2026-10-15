import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the simulated environment (demo Spond, in-memory
 * database, simulated KI). Runs its own dev server on port 3100.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "mobil", use: { ...devices["Pixel 7"], browserName: "chromium", viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/logg-inn`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { SPOND_MOCK: "true", AI_MOCK: "true", SUPERADMIN_PROFILE_ID: "P-KJETIL", PGLITE_DIR: "", NEXT_DIST_DIR: ".next-e2e" },
  },
});
