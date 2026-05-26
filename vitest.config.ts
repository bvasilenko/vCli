import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "tests/**/*.spec.ts",
      "demo/**",
      "node_modules/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli.ts",
        "src/template/files-blank/**",
        "src/template/files-default/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
