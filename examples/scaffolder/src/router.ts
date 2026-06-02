import {
  compositionFromHash,
  compositionToHash,
} from "@booga/vbrand/composition";
import type { CompositionSpec } from "@booga/vbrand/composition";

export interface RouteState {
  brand: string;
  app: string;
  composition: CompositionSpec | null;
}

const BRAND_PARAM = "brand";
const APP_PARAM = "app";

export function readRouteState(): RouteState {
  const params = new URLSearchParams(window.location.search);
  return {
    brand: params.get(BRAND_PARAM) ?? "fixture:stripe",
    app: params.get(APP_PARAM) ?? "landing",
    composition: compositionFromHash(window.location.hash),
  };
}

export function writeRouteState(
  brand: string,
  app: string,
  composition: CompositionSpec
): void {
  const params = new URLSearchParams({ [BRAND_PARAM]: brand, [APP_PARAM]: app });
  const hash = compositionToHash(composition);
  window.history.replaceState(null, "", `?${params.toString()}${hash}`);
}
