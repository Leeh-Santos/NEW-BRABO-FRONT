import { defineConfig } from "@playwright/test";

// E2E for the Dice page. Needs `anvil` (Foundry) on PATH; global-setup forks Base mainnet on
// :8548 and the dev server is pointed at it, so every read and write in the browser hits the
// real BraboDice bytecode — locally, with no real funds.
//
// @playwright/test is pinned to 1.48.2: newer releases refuse to install Chromium on Ubuntu 20.04.
const PORT = 5199;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_BASE_RPC_URL: "http://127.0.0.1:8548" },
  },
});
