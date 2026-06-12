import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf-8")
) as { version: string };

export default defineConfig({
  plugins: [react()],
  base: "/vCli/",
  define: {
    __VCLI_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: "dist",
  },
});
