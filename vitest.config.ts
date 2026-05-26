import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "tests/demo-render.spec.ts",
      "tests/demo-cmd.spec.ts",
      "demo/**",
      "node_modules/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli.ts",
        "src/template/files/**",
        "src/template/files-vblocks-marketing/**",
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
