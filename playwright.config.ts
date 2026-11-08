import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3217",
    ...devices["Desktop Chrome"],
    headless: true,
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: "off",
    trace: "off",
  },
});
