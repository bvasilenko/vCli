import JSZip from "jszip";
import type { VbrandType } from "@booga/vbrand";
import type { CompositionSpec } from "@booga/vbrand/composition";
import scaffoldPackageJsonRaw from "../../../src/template/files-scaffold/package.json?raw";
import indexHtml from "../../../src/template/files-scaffold/index.html?raw";
import postcssConfig from "../../../src/template/files-scaffold/postcss.config.js?raw";
import stylesCss from "../../../src/template/files-scaffold/src/styles.css?raw";
import mainJsx from "../../../src/template/files-scaffold/src/main.jsx?raw";
import tailwindConfig from "../../../src/template/files-scaffold/tailwind.config.js?raw";
import viteConfig from "../../../src/template/files-scaffold/vite.config.js?raw";
import { VCLI_PACKAGE_NAME, VCLI_VERSION } from "./release.js";

const CANONICAL_SCAFFOLD_FILES: ReadonlyArray<readonly [string, string]> = [
  ["index.html", indexHtml],
  ["vite.config.js", viteConfig],
  ["postcss.config.js", postcssConfig],
  ["tailwind.config.js", tailwindConfig],
  ["src/styles.css", stylesCss],
  ["src/main.jsx", mainJsx],
];

interface ScaffoldPackageJson {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly [key: string]: unknown;
}

function readCanonicalPackageJson(): ScaffoldPackageJson {
  return JSON.parse(scaffoldPackageJsonRaw) as ScaffoldPackageJson;
}

function buildVcliConfigJson(): string {
  return JSON.stringify(
    {
      registry:
        "https://cdn.jsdelivr.net/npm/@booga/vRegistry@latest/dist/registry.json",
      componentsDir: "src/components",
      packageManager: "bun",
    },
    null,
    2
  );
}

function buildScaffoldJson(appType: string): string {
  const packageJson = readCanonicalPackageJson();

  return JSON.stringify(
    {
      appType,
      generatedBy: {
        package: VCLI_PACKAGE_NAME,
        version: VCLI_VERSION,
      },
      dependencies: packageJson.dependencies ?? {},
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

  zip.file("package.json", scaffoldPackageJsonRaw);
  zip.file("vcli.config.json", buildVcliConfigJson());

  for (const [filePath, content] of CANONICAL_SCAFFOLD_FILES) {
    zip.file(filePath, content);
  }

  zip.file("brand.json", JSON.stringify(brand, null, 2));
  zip.file("composition.json", JSON.stringify(composition, null, 2));
  zip.file("scaffold.json", buildScaffoldJson(appType));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scaffold-${appType}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
