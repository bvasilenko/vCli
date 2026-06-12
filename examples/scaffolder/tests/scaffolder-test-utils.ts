import { expect, type Download, type FrameLocator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import fs from "fs-extra";
import JSZip from "jszip";
import { serveDir } from "../../../tests/_helpers/static-server.js";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

const DIST_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist"
);

export const CANONICAL_TEMPLATE_FILES = [
  "index.html",
  "vite.config.js",
  "postcss.config.js",
  "tailwind.config.js",
  "src/styles.css",
  "src/main.jsx",
  "package.json",
] as const;

export const APP_TYPES = ["landing", "marketing", "docs", "dashboard"] as const;

export const FIXTURE_PRIMARY_COLORS = {
  stripe: "#635BFF",
  vercel: "#000000",
  linear: "#5E6AD2",
  notion: "#000000",
  github: "#2DA44E",
} as const;

export const FIXTURE_BRAND_NAMES = {
  stripe: "Stripe",
  vercel: "Vercel",
  linear: "Linear",
  notion: "Notion",
  github: "GitHub",
} as const;

export type AppTypeName = (typeof APP_TYPES)[number];
export type FixtureName = keyof typeof FIXTURE_PRIMARY_COLORS;

export interface AssetResolution {
  readonly alt: string | null;
  readonly base: string;
  readonly height: number;
  readonly naturalHeight: number | null;
  readonly naturalWidth: number | null;
  readonly raw: string;
  readonly resolved: string;
  readonly width: number;
}

export interface ScaffolderServer {
  readonly server: Server;
  readonly baseUrl: string;
}

export interface PackageJsonContract {
  readonly version: string;
  readonly dependencies: Record<string, string>;
}

export interface ScaffoldMetadataContract {
  readonly appType: string;
  readonly generatedBy: {
    readonly package: string;
    readonly version: string;
  };
  readonly dependencies: Record<string, string>;
}

export interface UtilityResolution {
  readonly backgroundColor: string;
  readonly backgroundClassName: string;
  readonly padding: string;
  readonly paddingClassName: string;
  readonly styleSheetCount: number;
}

export async function readCanonicalTemplateFile(
  filePath: string
): Promise<string> {
  return fs.readFile(
    path.join(ROOT_DIR, "src/template/files-scaffold", filePath),
    "utf-8"
  );
}

export async function readCanonicalPackageJson(): Promise<PackageJsonContract> {
  return JSON.parse(
    await readCanonicalTemplateFile("package.json")
  ) as PackageJsonContract;
}

export async function readRootPackageVersion(): Promise<string> {
  const packageJson = await fs.readJson(path.join(ROOT_DIR, "package.json")) as {
    version: string;
  };
  return packageJson.version;
}

export async function startScaffolderServer(): Promise<ScaffolderServer> {
  if (!(await fs.pathExists(path.join(DIST_DIR, "index.html")))) {
    throw new Error(
      "examples/scaffolder/dist/index.html not found. Run: cd examples/scaffolder && bun run build"
    );
  }
  const handle = serveDir(DIST_DIR, {
    stripBase: "/vCli",
    spaFallback: true,
  });
  return { server: handle.server, baseUrl: handle.url };
}

export async function downloadScaffoldArchive(page: Page): Promise<JSZip> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("button:has-text('Download scaffold')").click(),
  ]);
  return readDownloadZip(download);
}

export async function readDownloadZip(download: Download): Promise<JSZip> {
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Download path is null");
  const buffer = await fs.readFile(downloadPath);
  return JSZip.loadAsync(buffer);
}

export async function readZipText(zip: JSZip, filePath: string): Promise<string> {
  const file = zip.file(filePath);
  if (!file) throw new Error(`${filePath} not found in downloaded zip`);
  return file.async("string");
}

export async function readZipJson<T>(zip: JSZip, filePath: string): Promise<T> {
  return JSON.parse(await readZipText(zip, filePath)) as T;
}

export async function openScaffolder(
  page: Page,
  baseUrl: string,
  fixture: FixtureName = "stripe",
  appType: AppTypeName = "landing"
): Promise<void> {
  await page.goto(scaffolderUrl(baseUrl, fixture, appType));
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });
}

export async function openPreviewFrame(
  page: Page,
  baseUrl: string,
  fixture: FixtureName = "stripe",
  appType: AppTypeName = "landing"
): Promise<FrameLocator> {
  await openScaffolder(page, baseUrl, fixture, appType);
  return expectPreviewFrameReady(page);
}

export function scaffolderUrl(
  baseUrl: string,
  fixture: FixtureName,
  appType: AppTypeName
): string {
  return `${baseUrl}/?brand=fixture%3A${fixture}&app=${appType}`;
}

export function previewFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="vCli preview"]').first();
}

export async function expectPreviewFrameReady(page: Page): Promise<FrameLocator> {
  const iframe = page.locator('iframe[title="vCli preview"]');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute("sandbox", "allow-same-origin");
  const frame = previewFrame(page);
  await expect(frame.locator("body > *").first()).toBeVisible({ timeout: 10_000 });
  return frame;
}

export async function readCssVar(
  frame: FrameLocator,
  selector: string,
  name: string
): Promise<string> {
  return frame.locator(selector).first().evaluate((element, cssVar) =>
    getComputedStyle(element).getPropertyValue(cssVar).trim(), name);
}

export async function readPreviewPrimaryColor(
  frame: FrameLocator
): Promise<string> {
  return readCssVar(frame, "html", "--color-primary");
}

export async function readPreviewSrcDoc(page: Page): Promise<string> {
  return (await page.locator('iframe[title="vCli preview"]').getAttribute("srcdoc")) ?? "";
}

export async function readPreviewBrandLogoAsset(
  frame: FrameLocator,
  fixture: FixtureName
): Promise<AssetResolution> {
  const brandName = FIXTURE_BRAND_NAMES[fixture];
  const asset = frame
    .locator(`img[alt="${brandName} logo"], img[alt="${brandName}"]`)
    .first();
  await expect(asset).toBeVisible();
  return asset.evaluate<AssetResolution>((element) => {
    const box = element.getBoundingClientRect();
    const raw =
      element.getAttribute("src") ??
      element.querySelector("use")?.getAttribute("href") ??
      element.getAttribute("href") ??
      "";
    return {
      alt: element.getAttribute("alt"),
      base: document.querySelector("base")?.getAttribute("href") ?? "",
      height: box.height,
      naturalHeight:
        element instanceof HTMLImageElement ? element.naturalHeight : null,
      naturalWidth:
        element instanceof HTMLImageElement ? element.naturalWidth : null,
      raw,
      resolved:
        raw.length === 0 || raw.startsWith("data:")
          ? raw
          : new URL(raw, document.baseURI).href,
      width: box.width,
    };
  });
}

export async function readUtilityResolution(
  frame: FrameLocator
): Promise<UtilityResolution> {
  return frame.locator("body").evaluate<UtilityResolution>((body) => {
    const elements = Array.from(body.querySelectorAll<HTMLElement>("[class]"));
    const paddingElement = elements.find((element) => {
      const className = String(element.getAttribute("class") ?? "");
      const style = getComputedStyle(element);
      return /\b(p|px|py|pt|pr|pb|pl)-/.test(className) && style.padding !== "0px";
    });
    const backgroundElement = elements.find((element) => {
      const className = String(element.getAttribute("class") ?? "");
      const style = getComputedStyle(element);
      return (
        /\bbg-[^\s]+/.test(className) &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor !== "transparent"
      );
    });

    return {
      backgroundColor: backgroundElement
        ? getComputedStyle(backgroundElement).backgroundColor
        : "transparent",
      backgroundClassName: backgroundElement?.getAttribute("class") ?? "",
      padding: paddingElement ? getComputedStyle(paddingElement).padding : "0px",
      paddingClassName: paddingElement?.getAttribute("class") ?? "",
      styleSheetCount: document.styleSheets.length,
    };
  });
}
