import type { ReactNode } from "react";
import type { VbrandType } from "@booga/vbrand";
import type { CompositionSpec } from "@booga/vbrand/composition";
import { getThemedRenderHTML } from "@booga/vbrand/ssr";
import { getTemplate } from "@booga/vbrand/templates";
import type { TemplateId } from "@booga/vbrand/templates";

const BASE_TAG_PATTERN = /<base\b/i;
const HEAD_OPEN_TAG_PATTERN = /<head\b[^>]*>/i;
const REMOTE_URL_PATTERN = /^https?:\/\//i;

export interface PreviewHtmlInput {
  readonly brand: VbrandType;
  readonly appType: TemplateId;
  readonly composition: CompositionSpec;
  readonly baseURI?: string;
}

export function buildPreviewSections({
  brand,
  appType,
  composition,
}: PreviewHtmlInput): readonly ReactNode[] {
  return [getTemplate(appType).compose(brand, composition)];
}

export function buildPreviewHtml(input: PreviewHtmlInput): string {
  const previewBrand = withPreviewSafeAssets(input.brand);
  const sections = buildPreviewSections({ ...input, brand: previewBrand });
  return withDocumentBase(getThemedRenderHTML(previewBrand, sections), input.baseURI);
}

export function withDocumentBase(html: string, baseURI?: string): string {
  if (baseURI === undefined || baseURI.length === 0 || BASE_TAG_PATTERN.test(html)) {
    return html;
  }

  return html.replace(HEAD_OPEN_TAG_PATTERN, (headTag) => {
    return `${headTag}<base href="${escapeAttribute(baseURI)}">`;
  });
}

export function withPreviewSafeAssets(brand: VbrandType): VbrandType {
  const inlineMark = buildInlineBrandMark(brand);

  return {
    ...brand,
    assets: {
      ...brand.assets,
      favicon: {
        ...brand.assets.favicon,
        source: previewSafeAssetSource(brand.assets.favicon.source, inlineMark),
      },
      og: {
        ...brand.assets.og,
        source: previewSafeOptionalAssetSource(brand.assets.og.source, inlineMark),
      },
      icons: {
        ...brand.assets.icons,
        source: previewSafeAssetSource(brand.assets.icons.source, inlineMark),
        set: brand.assets.icons.set.map((source) =>
          previewSafeAssetSource(source, inlineMark)
        ),
      },
    },
    marks:
      brand.marks === undefined
        ? undefined
        : {
            ...brand.marks,
            variants: brand.marks.variants?.map((variant) => ({
              ...variant,
              source: previewSafeAssetSource(variant.source, inlineMark),
            })),
          },
  };
}

function isRemoteUrl(source: string): boolean {
  return REMOTE_URL_PATTERN.test(source);
}

function previewSafeAssetSource(source: string, inlineMark: string): string {
  return isRemoteUrl(source) ? inlineMark : source;
}

function previewSafeOptionalAssetSource(
  source: string | undefined,
  inlineMark: string
): string | undefined {
  return source === undefined ? undefined : previewSafeAssetSource(source, inlineMark);
}

function buildInlineBrandMark(brand: VbrandType): string {
  const primary = brand.tokens.color.primary ?? "oklch(12% .01 240)";
  const label = brand.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">',
    `<rect width="160" height="160" rx="36" fill="${escapeXml(primary)}"/>`,
    '<text x="80" y="92" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="56" font-weight="800" fill="white">',
    escapeXml(label || brand.name[0]?.toUpperCase() || "B"),
    "</text>",
    "</svg>",
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
