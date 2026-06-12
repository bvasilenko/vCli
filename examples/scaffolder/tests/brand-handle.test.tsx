import { expect, test } from "./scaffolder-fixtures.js";
import { BROWSER_PREFIXES, parseBrandHandle } from "../src/handle.js";

function encodedJson(payload: unknown): string {
  return btoa(JSON.stringify(payload));
}

test("browser brand handle parser accepts every browser-supported prefix", () => {
  const jsonPayload = { name: "Acme", tokens: { color: { primary: "#000000" } } };

  expect(parseBrandHandle("url:https://example.test/brand.json")).toEqual({
    prefix: "url",
    value: "https://example.test/brand.json",
  });
  expect(parseBrandHandle("fixture:stripe")).toEqual({
    prefix: "fixture",
    value: "stripe",
  });
  expect(parseBrandHandle("github:owner/repo")).toEqual({
    prefix: "github",
    owner: "owner",
    repo: "repo",
  });
  expect(parseBrandHandle("npm:@scope/package")).toEqual({
    prefix: "npm",
    value: "@scope/package",
  });
  expect(parseBrandHandle(`json:${encodedJson(jsonPayload)}`)).toEqual({
    prefix: "json",
    payload: jsonPayload,
  });
});

test("browser brand handle parser rejects unsupported or incomplete handles", () => {
  const cases = [
    ["stripe", `Brand handle must include a prefix: ${BROWSER_PREFIXES.join(", ")}.`],
    ["file:brand.json", `Unknown prefix "file". Valid: ${BROWSER_PREFIXES.join(", ")}.`],
    ["url:", '"url:" requires a URL.'],
    ["fixture:", '"fixture:" requires a fixture name.'],
    ["npm:", '"npm:" requires a package name.'],
    ["github:owner", '"github:" requires owner/repo format.'],
    ["github:/repo", '"github:" requires owner/repo format.'],
    ["github:owner/", '"github:" requires owner/repo format.'],
    ["github:owner/repo/path", '"github:" takes owner/repo only, not a deeper path.'],
    ["json:", '"json:" requires a base64-encoded payload.'],
    ["json:not-base64", '"json:" payload is not valid base64.'],
    [`json:${btoa("not-json")}`, '"json:" payload is not valid JSON after decode.'],
  ] as const;

  for (const [handle, message] of cases) {
    expect(() => parseBrandHandle(handle)).toThrow(message);
  }
});
