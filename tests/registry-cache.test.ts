import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { registry as localRegistry } from "@booga/vregistry";
import {
  readCache,
  writeCache,
  CACHE_TTL_MS,
} from "../src/registry/cache.js";

const URL_A =
  "https://cdn.jsdelivr.net/npm/@booga/vRegistry@latest/dist/registry.json";
const URL_B = "https://other.example.com/registry.json";

describe("registry cache", () => {
  let cacheFile: string;

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-cache-"));
    cacheFile = path.join(dir, "registry.json");
  });

  afterEach(async () => {
    await fs.remove(path.dirname(cacheFile));
  });

  describe("readCache — miss conditions", () => {
    it("returns null when the cache file does not exist", async () => {
      expect(await readCache(URL_A, Date.now(), cacheFile)).toBeNull();
    });

    it("returns null when the stored URL does not match the requested URL", async () => {
      await writeCache(URL_A, localRegistry, cacheFile);
      expect(await readCache(URL_B, Date.now(), cacheFile)).toBeNull();
    });

    it("returns null when the cache has expired past TTL", async () => {
      await writeCache(URL_A, localRegistry, cacheFile);
      expect(
        await readCache(URL_A, Date.now() + CACHE_TTL_MS + 1, cacheFile)
      ).toBeNull();
    });

    it("returns null when the cache file contains malformed JSON", async () => {
      await fs.ensureDir(path.dirname(cacheFile));
      await fs.writeFile(cacheFile, "not-valid-json");
      expect(await readCache(URL_A, Date.now(), cacheFile)).toBeNull();
    });

    it("returns null when the cache envelope holds an invalid registry shape", async () => {
      await fs.ensureDir(path.dirname(cacheFile));
      await fs.writeJson(cacheFile, {
        url: URL_A,
        cachedAt: Date.now(),
        data: { invalid: true },
      });
      expect(await readCache(URL_A, Date.now(), cacheFile)).toBeNull();
    });
  });

  describe("readCache — hit conditions", () => {
    it("returns the registry when URL and TTL both match", async () => {
      await writeCache(URL_A, localRegistry, cacheFile);
      const result = await readCache(URL_A, Date.now(), cacheFile);
      expect(result).not.toBeNull();
      expect(result?.entries.length).toBe(localRegistry.entries.length);
    });

    it("returns cached data at exactly TTL milliseconds — boundary is inclusive", async () => {
      await writeCache(URL_A, localRegistry, cacheFile);
      const envelope = await fs.readJson(cacheFile) as { cachedAt: number };
      expect(
        await readCache(URL_A, envelope.cachedAt + CACHE_TTL_MS, cacheFile)
      ).not.toBeNull();
    });

    it("returns cached data when well within TTL", async () => {
      await writeCache(URL_A, localRegistry, cacheFile);
      const result = await readCache(
        URL_A,
        Date.now() + CACHE_TTL_MS - 1000,
        cacheFile
      );
      expect(result).not.toBeNull();
    });
  });

  describe("writeCache", () => {
    it("creates parent directories when they do not exist", async () => {
      const nested = path.join(
        path.dirname(cacheFile),
        "deep",
        "nested",
        "registry.json"
      );
      await writeCache(URL_A, localRegistry, nested);
      expect(await fs.pathExists(nested)).toBe(true);
    });

    it("overwrites a previous cache entry with updated data", async () => {
      const registryV1 = localRegistry;
      const registryV2 = {
        ...localRegistry,
        version: "999.0.0",
      };

      await writeCache(URL_A, registryV1, cacheFile);
      await writeCache(URL_A, registryV2, cacheFile);

      const result = await readCache(URL_A, Date.now(), cacheFile);
      expect(result?.version).toBe("999.0.0");
    });

    it("stores the provided URL in the envelope so subsequent reads can validate it", async () => {
      await writeCache(URL_B, localRegistry, cacheFile);
      expect(await readCache(URL_A, Date.now(), cacheFile)).toBeNull();
      expect(await readCache(URL_B, Date.now(), cacheFile)).not.toBeNull();
    });
  });
});
