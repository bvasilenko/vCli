import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

export const LOCAL_TEST_SPECS = [
  "examples/scaffolder/tests/runtime.spec.ts",
  "tests/compose-hash-roundtrip.spec.ts",
];

export const DEFAULT_HOSTED_URL = "https://bvasilenko.github.io/vCli/";
export const COVERED_SURFACES = ["local preview", "hosted scaffolder"];
export const HOSTED_FIXTURES = ["stripe", "vercel", "linear", "notion", "github"];
export const HOSTED_APP_TYPES = ["landing", "marketing", "docs", "dashboard"];
export const HOSTED_BRAND_NAMES = {
  stripe: "Stripe",
  vercel: "Vercel",
  linear: "Linear",
  notion: "Notion",
  github: "GitHub",
};
export const HOSTED_CHECKS = [
  "brandSource",
  "composition",
  "preview",
  "downloadEnabled",
  "brandPreview",
];

export function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const exitCode = code ?? "without code";
      reject(new Error(`${command} ${args.join(" ")} exited ${exitCode}`));
    });
  });
}

export function hostedProbeCases(
  fixtures = HOSTED_FIXTURES,
  appTypes = HOSTED_APP_TYPES
) {
  return fixtures.flatMap((fixture) =>
    appTypes.map((appType) => ({
      fixture,
      appType,
      brandName: HOSTED_BRAND_NAMES[fixture] ?? fixture,
    }))
  );
}

export function hostedScaffolderUrl(baseUrl, probe = hostedProbeCases()[0]) {
  const url = new URL(baseUrl);
  url.searchParams.set("brand", `fixture:${probe.fixture}`);
  url.searchParams.set("app", probe.appType);
  return url.toString();
}

export function hostedProbeLabel(probe) {
  return `${probe.fixture}/${probe.appType}`;
}

export function failedCheckNames(checks) {
  return Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
}

export function requiredHostedCheckFailures(checks) {
  return HOSTED_CHECKS.filter((name) => checks[name] !== true);
}

export function assertHostedChecks(checks, probe) {
  const failed = requiredHostedCheckFailures(checks);
  if (failed.length > 0) {
    const scope = probe ? ` for ${hostedProbeLabel(probe)}` : "";
    throw new Error(`hosted checks failed${scope}: ${failed.join(", ")}`);
  }
}

export function cleanVerdict(localSpecs, hostedProbeCount, coveredSurfaces) {
  const probeCount = localSpecs.length + hostedProbeCount;
  const surfaceCount = Array.isArray(coveredSurfaces)
    ? coveredSurfaces.length
    : coveredSurfaces;
  return `CLEAN: ${probeCount} probes, 0 bugs, ${surfaceCount}/${surfaceCount} surfaces covered\n`;
}

export function bugVerdict(error) {
  return `BUGS: ${error instanceof Error ? error.message : String(error)}\n`;
}

export function isEntrypoint(moduleUrl, argvPath) {
  return fileURLToPath(moduleUrl) === argvPath;
}

export async function isLocatorVisible(locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

export async function readHostedProbe(page, baseUrl, probe) {
  const response = await page.goto(hostedScaffolderUrl(baseUrl, probe), {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  if (!response || response.status() !== 200) {
    const status = response?.status() ?? "no response";
    throw new Error(`hosted URL returned ${status} for ${hostedProbeLabel(probe)}`);
  }

  const downloadButton = page.locator("button:has-text('Download scaffold')");
  await downloadButton.waitFor({ state: "visible", timeout: 15_000 });

  const previewFrame = page.frameLocator('iframe[title="vCli preview"]').first();
  const frameBrandPreview = previewFrame
    .getByText(probe.brandName, { exact: true })
    .first();
  const pageBrandPreview = page
    .getByText(probe.brandName, { exact: true })
    .first();

  const checks = {
    brandSource: await page
      .getByText("Brand source", { exact: true })
      .isVisible(),
    composition: await page.getByText("Composition", { exact: true }).isVisible(),
    preview: await page.getByText("Preview", { exact: true }).isVisible(),
    downloadEnabled: await downloadButton.isEnabled(),
    brandPreview:
      (await isLocatorVisible(frameBrandPreview)) || (await isLocatorVisible(pageBrandPreview)),
  };

  assertHostedChecks(checks, probe);
}

export async function readHostedSurface(baseUrl, probes = hostedProbeCases()) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const probe of probes) {
      await readHostedProbe(page, baseUrl, probe);
    }
  } finally {
    await browser.close();
  }
}

export async function main() {
  const hostedUrl = process.env.VCLI_HOSTED_SCAFFOLDER_URL ?? DEFAULT_HOSTED_URL;
  const hostedProbes = hostedProbeCases();

  await runCommand("npx", [
    "playwright",
    "test",
    ...LOCAL_TEST_SPECS,
    "--reporter=line",
  ]);
  await readHostedSurface(hostedUrl, hostedProbes);

  process.stdout.write(
    cleanVerdict(LOCAL_TEST_SPECS, hostedProbes.length, COVERED_SURFACES)
  );
}

if (isEntrypoint(import.meta.url, process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(bugVerdict(error));
    process.exit(1);
  });
}
