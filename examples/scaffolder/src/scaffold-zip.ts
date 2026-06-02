import JSZip from "jszip";
import type { VbrandType } from "@booga/vbrand";
import type { CompositionSpec } from "@booga/vbrand/composition";

const SCAFFOLD_FILES: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  "vite.config.js": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });`,
  "postcss.config.js": `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };`,
  "tailwind.config.js": `import vtheme from "@booga/vtheme/preset";
import { dslSafelist } from "@booga/vdsl";
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  presets: [vtheme],
  safelist: dslSafelist,
};`,
  "src/styles.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;",
  "src/main.jsx": `import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { getTemplate, isTemplateId } from "@booga/vbrand/templates";
import rawBrand from "../brand.json";
import rawComposition from "../composition.json";
import scaffoldConfig from "../scaffold.json";
const appType = isTemplateId(scaffoldConfig.appType) ? scaffoldConfig.appType : "landing";
createRoot(document.getElementById("root")).render(
  React.createElement(React.StrictMode, null, getTemplate(appType).compose(rawBrand, rawComposition))
);`,
  "vcli.config.json": JSON.stringify(
    {
      registry:
        "https://cdn.jsdelivr.net/npm/@booga/vRegistry@latest/dist/registry.json",
      componentsDir: "src/components",
      packageManager: "bun",
    },
    null,
    2
  ),
};

function buildPackageJson(appType: string): string {
  return JSON.stringify(
    {
      name: "my-booga-scaffold",
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: {
        "@booga/vbrand": "^0.4.0-alpha.2",
        "@booga/vblocks": "^0.4.0",
        "@booga/vdsl": "^0.3.0",
        "@booga/vtheme": "^0.3.0",
        "@booga/vui": "^0.4.0",
        react: "^18.3.0",
        "react-dom": "^18.3.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.0",
        autoprefixer: "^10.4.0",
        postcss: "^8.4.0",
        tailwindcss: "^3.4.0",
        vite: "^5.4.0",
      },
      _scaffoldAppType: appType,
    },
    null,
    2
  );
}

export async function downloadScaffoldZip(
  brand: VbrandType,
  composition: CompositionSpec,
  appType: string
): Promise<void> {
  const zip = new JSZip();

  zip.file("package.json", buildPackageJson(appType));

  for (const [filePath, content] of Object.entries(SCAFFOLD_FILES)) {
    zip.file(filePath, content);
  }

  zip.file("brand.json", JSON.stringify(brand, null, 2));
  zip.file("composition.json", JSON.stringify(composition, null, 2));
  zip.file("scaffold.json", JSON.stringify({ appType }, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scaffold-${appType}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
