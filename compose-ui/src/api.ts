import type { CompositionSpec } from "@booga/vbrand/composition";
import type { VbrandType } from "@booga/vbrand";

export async function fetchBrand(): Promise<VbrandType> {
  const res = await fetch("/brand");
  if (!res.ok) throw new Error(`Failed to load brand (${res.status})`);
  return res.json() as Promise<VbrandType>;
}

export async function fetchComposition(): Promise<CompositionSpec> {
  const res = await fetch("/composition");
  if (!res.ok) throw new Error(`Failed to load composition (${res.status})`);
  return res.json() as Promise<CompositionSpec>;
}

export async function saveComposition(spec: CompositionSpec): Promise<void> {
  const res = await fetch("/composition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`Failed to save composition (${res.status})`);
}
