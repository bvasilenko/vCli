import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_PATHS = [
  "package.json",
  "examples/scaffolder/package.json",
  "src/template/files-scaffold/package.json",
] as const;
const VSUITE_DEPENDENCY_PREFIX = "@booga/";

interface PackageJson {
  readonly dependencies?: Record<string, string>;
}

interface DependencyMatrixRow {
  readonly dependency: string;
  readonly versionsByPackage: Record<string, string>;
}

async function readPackageJson(relativePath: string): Promise<PackageJson> {
  const raw = await readFile(path.join(ROOT, relativePath), "utf-8");
  return JSON.parse(raw) as PackageJson;
}

async function readPackageMatrix(packagePaths: readonly string[]) {
  const entries = await Promise.all(
    packagePaths.map(async (packagePath) => {
      const packageJson = await readPackageJson(packagePath);
      return [packagePath, packageJson.dependencies ?? {}] as const;
    })
  );

  return Object.fromEntries(entries) as Record<string, Record<string, string>>;
}

function sharedDependencies(packageMatrix: Record<string, Record<string, string>>) {
  const dependencyLists = Object.values(packageMatrix).map((dependencies) =>
    Object.keys(dependencies).filter((dependency) =>
      dependency.startsWith(VSUITE_DEPENDENCY_PREFIX)
    )
  );
  const [firstList = [], ...remainingLists] = dependencyLists;

  return firstList
    .filter((dependency) =>
      remainingLists.every((dependencies) => dependencies.includes(dependency))
    )
    .sort();
}

function dependencyMatrixRows(
  packageMatrix: Record<string, Record<string, string>>,
  dependencies: readonly string[]
): DependencyMatrixRow[] {
  return dependencies.map((dependency) => ({
    dependency,
    versionsByPackage: Object.fromEntries(
      Object.entries(packageMatrix).map(([packagePath, packageDependencies]) => [
        packagePath,
        packageDependencies[dependency],
      ])
    ),
  }));
}

describe("release dependency consistency", () => {
  test("every shared v-suite dependency is version-aligned across shipped surfaces", async () => {
    const packageMatrix = await readPackageMatrix(PACKAGE_PATHS);
    const sharedVSuiteDependencies = sharedDependencies(packageMatrix);
    const rows = dependencyMatrixRows(packageMatrix, sharedVSuiteDependencies);

    expect(sharedVSuiteDependencies).toEqual([
      "@booga/vblocks",
      "@booga/vbrand",
      "@booga/vdsl",
      "@booga/vtheme",
      "@booga/vui",
    ]);

    for (const row of rows) {
      expect(
        new Set(Object.values(row.versionsByPackage)).size,
        `${row.dependency} differs across ${JSON.stringify(row.versionsByPackage)}`
      ).toBe(1);
    }
  });

  test("vBrand remains installed wherever brand primitives are shipped to users", async () => {
    const packageMatrix = await readPackageMatrix(PACKAGE_PATHS);
    const versionsByPackage = dependencyMatrixRows(packageMatrix, ["@booga/vbrand"])[0]
      .versionsByPackage;

    expect(versionsByPackage).toEqual({
      "package.json": expect.stringMatching(/^\^0\.4\.0-alpha\./),
      "examples/scaffolder/package.json": expect.stringMatching(/^\^0\.4\.0-alpha\./),
      "src/template/files-scaffold/package.json": expect.stringMatching(
        /^\^0\.4\.0-alpha\./
      ),
    });
  });
});
