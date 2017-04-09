import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/demo-render.spec.ts", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts", "src/template/files/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
