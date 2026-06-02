import { BrowserBrandSourceAdapter } from "@booga/vbrand/adapters/browser";
import type { VbrandType } from "@booga/vbrand";
import { parseBrandHandle } from "./handle.js";
import type { BrandHandle } from "./handle.js";

const adapter = new BrowserBrandSourceAdapter();

export type { BrandHandle };
export { parseBrandHandle };

export async function loadBrandFromHandle(
  handle: BrandHandle
): Promise<VbrandType> {
  switch (handle.prefix) {
    case "url":
      return adapter.loadFromUrl(handle.value);
    case "fixture":
      return adapter.loadFromFixture(handle.value);
    case "github":
      return adapter.loadFromGitHub(handle.owner, handle.repo);
    case "npm":
      return adapter.loadFromNpm(handle.value);
    case "json":
      return adapter.loadFromCustomJson(handle.payload);
  }
}
