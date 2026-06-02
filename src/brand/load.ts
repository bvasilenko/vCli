// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import type { BrandSourceAdapter } from "@booga/vbrand/adapters";
import type { VbrandType } from "@booga/vbrand";
import type { BrandHandle } from "./handle.js";
import { VcliError } from "../utils/exit.js";

export async function loadBrand(
  handle: BrandHandle,
  adapter: BrandSourceAdapter
): Promise<VbrandType> {
  try {
    switch (handle.prefix) {
      case "url":
        return await adapter.loadFromUrl(handle.value);
      case "fixture":
        return await adapter.loadFromFixture(handle.value);
      case "github":
        return await adapter.loadFromGitHub(handle.owner, handle.repo);
      case "npm":
        return await adapter.loadFromNpm(handle.value);
      case "json":
        return await adapter.loadFromCustomJson(handle.payload);
      case "file":
        return await adapter.loadFromLocalJson(handle.value);
    }
  } catch (err) {
    if (err instanceof VcliError) throw err;
    const message =
      err instanceof Error ? err.message : String(err);
    throw new VcliError(
      `Failed to load brand from "${handle.prefix}:": ${message}`
    );
  }
}
