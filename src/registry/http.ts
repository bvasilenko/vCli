// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { RegistrySchema, type Registry } from "@booga/vregistry";

export async function fetchFromUrl(url: string): Promise<Registry> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Registry fetch failed: ${response.status} ${response.statusText}`
    );
  }
  const json: unknown = await response.json();
  return RegistrySchema.parse(json);
}
