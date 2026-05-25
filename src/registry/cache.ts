// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { RegistrySchema, type Registry } from "@booga/vregistry";

const CACHE_DIR = path.join(os.homedir(), ".cache", "booga");
export const DEFAULT_CACHE_FILE = path.join(CACHE_DIR, "registry.json");
export const CACHE_TTL_MS = 3_600_000;

interface CacheEnvelope {
  url: string;
  cachedAt: number;
  data: Registry;
}

export async function readCache(
  url: string,
  nowMs = Date.now(),
  cacheFile = DEFAULT_CACHE_FILE
): Promise<Registry | null> {
  if (!(await fs.pathExists(cacheFile))) return null;

  let envelope: CacheEnvelope;
  try {
    envelope = (await fs.readJson(cacheFile)) as CacheEnvelope;
  } catch {
    return null;
  }

  if (envelope.url !== url) return null;
  if (nowMs - envelope.cachedAt > CACHE_TTL_MS) return null;

  const parsed = RegistrySchema.safeParse(envelope.data);
  return parsed.success ? parsed.data : null;
}

export async function writeCache(
  url: string,
  registry: Registry,
  cacheFile = DEFAULT_CACHE_FILE
): Promise<void> {
  await fs.ensureDir(path.dirname(cacheFile));
  const envelope: CacheEnvelope = {
    url,
    cachedAt: Date.now(),
    data: registry,
  };
  await fs.writeJson(cacheFile, envelope);
}
