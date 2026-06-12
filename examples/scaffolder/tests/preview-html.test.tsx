import { expect, test } from "./scaffolder-fixtures.js";
import type { VbrandType } from "@booga/vbrand";
import { loadFixture } from "@booga/vfixtures";
import { withDocumentBase, withPreviewSafeAssets } from "../src/preview-html.js";

const DOCUMENT_WITH_HEAD =
  "<!doctype html><html><head><title>x</title></head><body></body></html>";

interface DocumentBaseCase {
  readonly name: string;
  readonly html: string;
  readonly baseURI?: string;
  readonly expectedHtml: string;
}

const DOCUMENT_BASE_CASES: readonly DocumentBaseCase[] = [
  {
    name: "inserts escaped base into a standard head",
    html: DOCUMENT_WITH_HEAD,
    baseURI: 'https://example.test/vCli/?brand="stripe"&next=<demo>',
    expectedHtml:
      '<!doctype html><html><head><base href="https://example.test/vCli/?brand=&quot;stripe&quot;&amp;next=&lt;demo&gt;"><title>x</title></head><body></body></html>',
  },
  {
    name: "supports head attributes and tag casing",
    html: '<!doctype html><html><HEAD data-preview="1"><title>x</title></HEAD><body></body></html>',
    baseURI: "https://example.test/vCli/",
    expectedHtml:
      '<!doctype html><html><HEAD data-preview="1"><base href="https://example.test/vCli/"><title>x</title></HEAD><body></body></html>',
  },
  {
    name: "leaves documents without a head element unchanged",
    html: "<!doctype html><html><body></body></html>",
    baseURI: "https://example.test/vCli/",
    expectedHtml: "<!doctype html><html><body></body></html>",
  },
  {
    name: "leaves documents with an existing base unchanged",
    html: '<!doctype html><html><head><base href="https://cdn.example/"><title>x</title></head><body></body></html>',
    baseURI: "https://example.test/vCli/",
    expectedHtml:
      '<!doctype html><html><head><base href="https://cdn.example/"><title>x</title></head><body></body></html>',
  },
  {
    name: "leaves missing base URI unchanged",
    html: DOCUMENT_WITH_HEAD,
    expectedHtml: DOCUMENT_WITH_HEAD,
  },
  {
    name: "leaves empty base URI unchanged",
    html: DOCUMENT_WITH_HEAD,
    baseURI: "",
    expectedHtml: DOCUMENT_WITH_HEAD,
  },
];

for (const { name, html, baseURI, expectedHtml } of DOCUMENT_BASE_CASES) {
  test(`preview document base ${name}`, async () => {
    const output = withDocumentBase(html, baseURI);

    expect(output).toBe(expectedHtml);
    expect(output.match(/<base\b/g)?.length ?? 0).toBe(
      expectedHtml.match(/<base\b/g)?.length ?? 0
    );
  });
}

test("preview asset safety normalizes every remote asset-bearing schema field", async () => {
  const brand = withRemoteAssetSources(loadFixture("stripe"));
  const safeBrand = withPreviewSafeAssets(brand);
  const inlineMark = safeBrand.assets.favicon.source;

  expect(inlineMark).toMatch(/^data:image\/svg\+xml,/);
  expect(collectAssetSources(safeBrand)).toEqual([
    inlineMark,
    inlineMark,
    inlineMark,
    inlineMark,
    "data:image/svg+xml,already-inline",
    inlineMark,
    "local-mark.svg",
  ]);
});

test("preview asset safety preserves local, relative, absolute-path, and inline asset sources", async () => {
  const brand = withSafeAssetSources(loadFixture("stripe"));
  const safeBrand = withPreviewSafeAssets(brand);

  expect(collectAssetSources(safeBrand)).toEqual([
    "data:image/svg+xml,mark",
    "/og.png",
    "./icons",
    "icon.svg",
    "data:image/svg+xml,icon",
    "../marks/logo.svg",
    "data:image/svg+xml,logo",
  ]);
});

test("preview asset safety preserves absent optional asset groups", async () => {
  const fixture = loadFixture("stripe");
  const brand = {
    ...fixture,
    assets: {
      ...fixture.assets,
      og: { dimensions: fixture.assets.og.dimensions },
    },
    marks: undefined,
  } satisfies VbrandType;
  const safeBrand = withPreviewSafeAssets(brand);

  expect(safeBrand.assets.og.source).toBeUndefined();
  expect(safeBrand.marks).toBeUndefined();
});

test("preview asset safety escapes generated inline brand mark content", async () => {
  const fixture = loadFixture("stripe");
  const brand = {
    ...fixture,
    name: 'A&B <Tag> "Quote"',
    tokens: {
      ...fixture.tokens,
      color: {
        ...fixture.tokens.color,
        primary: 'oklch(55% .2 250)"><script>alert(1)</script>',
      },
    },
  };

  const safeBrand = withPreviewSafeAssets(brand);
  const svg = decodeURIComponent(
    safeBrand.assets.favicon.source.replace("data:image/svg+xml,", "")
  );

  expect(svg).toContain("A&lt;");
  expect(svg).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(svg).not.toContain("<script>");
});

function withRemoteAssetSources(brand: VbrandType): VbrandType {
  return {
    ...brand,
    assets: {
      ...brand.assets,
      favicon: { ...brand.assets.favicon, source: "https://cdn.test/icon.svg" },
      og: { ...brand.assets.og, source: "http://cdn.test/og.png" },
      icons: {
        ...brand.assets.icons,
        source: "https://cdn.test/icons",
        set: ["https://cdn.test/a.svg", "data:image/svg+xml,already-inline"],
      },
    },
    marks: {
      ...brand.marks,
      variants: [
        {
          name: "primary",
          source: "https://cdn.test/logo.svg",
        },
        {
          name: "local",
          source: "local-mark.svg",
        },
      ],
    },
  };
}

function withSafeAssetSources(brand: VbrandType): VbrandType {
  return {
    ...brand,
    assets: {
      ...brand.assets,
      favicon: { ...brand.assets.favicon, source: "data:image/svg+xml,mark" },
      og: { ...brand.assets.og, source: "/og.png" },
      icons: {
        ...brand.assets.icons,
        source: "./icons",
        set: ["icon.svg", "data:image/svg+xml,icon"],
      },
    },
    marks: {
      ...brand.marks,
      variants: [
        {
          name: "relative",
          source: "../marks/logo.svg",
        },
        {
          name: "inline",
          source: "data:image/svg+xml,logo",
        },
      ],
    },
  };
}

function collectAssetSources(brand: VbrandType): readonly string[] {
  return [
    brand.assets.favicon.source,
    brand.assets.og.source,
    brand.assets.icons.source,
    ...brand.assets.icons.set,
    ...(brand.marks?.variants?.map((variant) => variant.source) ?? []),
  ].filter((source): source is string => source !== undefined);
}
