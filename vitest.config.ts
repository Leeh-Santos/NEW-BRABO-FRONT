import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        // Needs `anvil` (Foundry) on PATH and network access to fork Base mainnet.
        extends: true,
        test: {
          name: "fork",
          environment: "node",
          include: ["test/fork/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 90_000,
        },
      },
    ],
  },
});
