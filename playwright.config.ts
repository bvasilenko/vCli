import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: ["**/*.spec.ts", "**/*.test.tsx"],
  use: {
    headless: true,
  },
});
