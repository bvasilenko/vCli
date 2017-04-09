import { defineConfig } from "@booga/vssg";

export default defineConfig({
  srcDir: "content",
  outDir: "out",
  routes: "**/*.mdx",
  publicDir: "public",
  baseUrl: "/",
});
