import { useCallback, useEffect, useState } from "react";
import { BrowserBrandSourceAdapter } from "@booga/vbrand/adapters/browser";
import type { VbrandType } from "@booga/vbrand";
import { parseBrandHandle } from "./handle.js";

export type BrandState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly brand: VbrandType }
  | { readonly status: "error"; readonly message: string };

export interface BrandLoaderResult {
  readonly brandState: BrandState;
  readonly reload: () => void;
}

async function resolveBrand(handle: string): Promise<VbrandType> {
  const parsed = parseBrandHandle(handle);
  const adapter = new BrowserBrandSourceAdapter();
  switch (parsed.prefix) {
    case "url":
      return adapter.loadFromUrl(parsed.value);
    case "fixture":
      return adapter.loadFromFixture(parsed.value);
    case "github":
      return adapter.loadFromGitHub(parsed.owner, parsed.repo);
    case "npm":
      return adapter.loadFromNpm(parsed.value);
    case "json":
      return adapter.loadFromCustomJson(parsed.payload);
  }
}

function brandError(err: unknown): BrandState {
  return {
    status: "error",
    message: err instanceof Error ? err.message : String(err),
  };
}

export function useBrandLoader(handle: string): BrandLoaderResult {
  const [brandState, setBrandState] = useState<BrandState>({ status: "loading" });

  useEffect(() => {
    let canceled = false;
    setBrandState({ status: "loading" });
    resolveBrand(handle)
      .then((brand) => { if (!canceled) setBrandState({ status: "ready", brand }); })
      .catch((err) => { if (!canceled) setBrandState(brandError(err)); });
    return () => { canceled = true; };
  }, [handle]);

  const reload = useCallback(() => {
    setBrandState({ status: "loading" });
    resolveBrand(handle)
      .then((brand) => setBrandState({ status: "ready", brand }))
      .catch((err) => setBrandState(brandError(err)));
  }, [handle]);

  return { brandState, reload };
}
