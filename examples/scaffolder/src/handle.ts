export type BrandHandle =
  | { readonly prefix: "url"; readonly value: string }
  | { readonly prefix: "fixture"; readonly value: string }
  | { readonly prefix: "github"; readonly owner: string; readonly repo: string }
  | { readonly prefix: "npm"; readonly value: string }
  | { readonly prefix: "json"; readonly payload: unknown };

export const BROWSER_PREFIXES = [
  "url",
  "fixture",
  "github",
  "npm",
  "json",
] as const;

export type BrowserPrefix = (typeof BROWSER_PREFIXES)[number];

export function parseBrandHandle(raw: string): BrandHandle {
  const colonAt = raw.indexOf(":");
  if (colonAt === -1) {
    throw new Error(
      `Brand handle must include a prefix: ${BROWSER_PREFIXES.join(", ")}.`
    );
  }

  const prefix = raw.slice(0, colonAt) as BrowserPrefix;
  const rest = raw.slice(colonAt + 1);

  if (!BROWSER_PREFIXES.includes(prefix)) {
    throw new Error(
      `Unknown prefix "${prefix}". Valid: ${BROWSER_PREFIXES.join(", ")}.`
    );
  }

  switch (prefix) {
    case "url":
      if (!rest) throw new Error('"url:" requires a URL.');
      return { prefix: "url", value: rest };

    case "fixture":
      if (!rest) throw new Error('"fixture:" requires a fixture name.');
      return { prefix: "fixture", value: rest };

    case "github": {
      const slash = rest.indexOf("/");
      if (slash <= 0 || slash === rest.length - 1) {
        throw new Error('"github:" requires owner/repo format.');
      }
      const owner = rest.slice(0, slash);
      const repo = rest.slice(slash + 1);
      if (repo.includes("/")) {
        throw new Error('"github:" takes owner/repo only, not a deeper path.');
      }
      return { prefix: "github", owner, repo };
    }

    case "npm":
      if (!rest) throw new Error('"npm:" requires a package name.');
      return { prefix: "npm", value: rest };

    case "json": {
      if (!rest) throw new Error('"json:" requires a base64-encoded payload.');
      let decoded: string;
      try {
        decoded = atob(rest);
      } catch {
        throw new Error('"json:" payload is not valid base64.');
      }
      try {
        return { prefix: "json", payload: JSON.parse(decoded) };
      } catch {
        throw new Error('"json:" payload is not valid JSON after decode.');
      }
    }
  }
}
