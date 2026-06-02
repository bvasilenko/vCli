// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fail } from "../utils/exit.js";

export type BrandHandle =
  | { readonly prefix: "url"; readonly value: string }
  | { readonly prefix: "fixture"; readonly value: string }
  | { readonly prefix: "github"; readonly owner: string; readonly repo: string }
  | { readonly prefix: "npm"; readonly value: string }
  | { readonly prefix: "json"; readonly payload: unknown }
  | { readonly prefix: "file"; readonly value: string };

const VALID_PREFIXES = [
  "url",
  "fixture",
  "github",
  "npm",
  "json",
  "file",
] as const;

type Prefix = (typeof VALID_PREFIXES)[number];

function assertKnownPrefix(raw: string): asserts raw is Prefix {
  if (!VALID_PREFIXES.includes(raw as Prefix)) {
    fail(
      `Unknown brand handle prefix "${raw}". Valid prefixes: ${VALID_PREFIXES.join(", ")}.`
    );
  }
}

function parseGitHub(rest: string): { owner: string; repo: string } {
  const slash = rest.indexOf("/");
  if (slash <= 0 || slash === rest.length - 1) {
    fail(
      `Brand handle "github:" requires owner/repo format. Example: github:acme/brand. Got: "${rest}"`
    );
  }
  const owner = rest.slice(0, slash);
  const repo = rest.slice(slash + 1);
  if (repo.includes("/")) {
    fail(
      `Brand handle "github:" takes owner/repo only, not a deeper path. Got: "${rest}"`
    );
  }
  return { owner, repo };
}

function parseJson(rest: string): unknown {
  if (!rest) {
    fail('Brand handle "json:" requires a base64-encoded JSON payload.');
  }
  let decoded: string;
  try {
    decoded = Buffer.from(rest, "base64").toString("utf-8");
  } catch {
    fail('Brand handle "json:" payload is not valid base64.');
  }
  try {
    return JSON.parse(decoded!);
  } catch {
    fail(
      'Brand handle "json:" payload decoded but is not valid JSON.'
    );
  }
}

export function parseBrandHandle(raw: string): BrandHandle {
  if (!raw) {
    fail(
      `Brand handle must not be empty. Valid prefixes: ${VALID_PREFIXES.join(", ")}.`
    );
  }

  const colonAt = raw.indexOf(":");
  if (colonAt === -1) {
    fail(
      `Brand handle must include a prefix followed by ":". Valid prefixes: ${VALID_PREFIXES.join(", ")}. Got: "${raw}"`
    );
  }

  const prefix = raw.slice(0, colonAt);
  const rest = raw.slice(colonAt + 1);

  assertKnownPrefix(prefix);

  switch (prefix) {
    case "url":
      if (!rest) fail('Brand handle "url:" requires a URL. Example: url:https://example.com/brand.json');
      return { prefix: "url", value: rest };

    case "fixture":
      if (!rest) fail('Brand handle "fixture:" requires a fixture name. Example: fixture:stripe');
      return { prefix: "fixture", value: rest };

    case "github": {
      const { owner, repo } = parseGitHub(rest);
      return { prefix: "github", owner, repo };
    }

    case "npm":
      if (!rest) fail('Brand handle "npm:" requires a package name. Example: npm:@acme/brand');
      return { prefix: "npm", value: rest };

    case "json":
      return { prefix: "json", payload: parseJson(rest) };

    case "file":
      if (!rest) fail('Brand handle "file:" requires a file path. Example: file:/path/to/brand.json');
      return { prefix: "file", value: rest };
  }
}
