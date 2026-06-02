import {
  compositionFromHash,
  compositionToHash,
} from "@booga/vbrand/composition";
import type { CompositionSpec } from "@booga/vbrand/composition";

export function readHashComposition(): CompositionSpec | null {
  return compositionFromHash(window.location.hash);
}

export function writeHashComposition(spec: CompositionSpec): void {
  const hash = compositionToHash(spec);
  window.history.replaceState(null, "", hash);
}
