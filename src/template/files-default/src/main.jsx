// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
//
// vCli 0.2.0 demo - rich vBlocks marketing scaffold.
//
// This is the source rendered by both `npx @booga/vcli demo` (zero-install
// preview) and `npx @booga/vcli init my-site` (populated scaffold). The two
// paths cannot drift because the file lives once at
// src/template/files-default/src/main.jsx and scripts/build-demo-dist.mjs
// syncs it into demo/src/ before building the bundled preview.
//
// All typography, tone palette, primitive sizing, and section padding flow
// upstream from vTheme 0.3.0 + vUi 0.4.0 + vBlocks 0.4.0. The demo authors
// no leaf-override CSS (see projects/vsuite/conventions.md, "Demo richness
// flows upstream first").
import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  HeroSplit,
  FeaturesGrid,
  CtaCentered,
  FooterSplit,
} from "@booga/vblocks";
import { Box, Inline, Kicker, Eyebrow, Pill } from "@booga/vui";

// 1x1 transparent PNG used wherever the strict block schema requires an
// image.src but the demo has no hero asset (vCli ships a vocabulary preview,
// not a brand asset). The block still renders the image slot per schema.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const NPM_HREF = "https://www.npmjs.com/package/@booga/vcli";
const REPO_HREF = "https://github.com/bvasilenko/vCli";
const DEMO_CMD = "npx @booga/vcli demo";
const INIT_CMD = "npx @booga/vcli init my-site";

// Hero: communicates the vCli thesis. Two paths, both zero-friction:
// (1) preview the marketing composition with no install, (2) scaffold a
// populated Vite + React + vBlocks project ready to edit.
const heroContent = {
  kicker: "vCli 0.2.0",
  eyebrow: "Zero-install demo + populated scaffold CLI",
  heading: "vBlocks marketing scaffold in 5 seconds",
  description:
    "Two paths, same source of truth. `booga demo` renders this page in your browser with zero install. `booga init` writes the exact same composition into a fresh Vite + React + Tailwind project wired to @booga/vtheme + @booga/vblocks. No drift between the preview and the scaffold; one src/ tree feeds both.",
  primaryCta: { label: "Run npx demo", href: NPM_HREF },
  secondaryCta: { label: "View on GitHub", href: REPO_HREF },
  tonePills: [
    { label: DEMO_CMD, tone: "info" },
    { label: INIT_CMD, tone: "ok" },
    { label: "no telemetry", tone: "meta" },
    { label: "vBlocks 0.4.0", tone: "meta" },
  ],
  density: "spacious",
  image: {
    src: TRANSPARENT_PIXEL,
    alt: "vCli does not ship a brand asset; the vBlocks vocabulary IS the preview",
  },
};

// Features: each card is a real command vCli ships. The descriptions are the
// literal contracts of the commands as documented in the package README.
const featuresContent = {
  kicker: "Commands",
  eyebrow: "Five verbs, one CLI",
  heading: "Everything booga ships in 0.2.0",
  tonePills: [
    { label: "single binary", tone: "ok" },
    { label: "node >= 18", tone: "meta" },
    { label: "zero config", tone: "info" },
  ],
  density: "normal",
  features: [
    {
      title: "booga demo",
      description:
        "Spawns a Node HTTP server on a free port, prints the URL, opens the browser. Serves the bundled vBlocks marketing composition. Exits 0 after browser launch; --no-open for CI.",
    },
    {
      title: "booga init",
      description:
        "Scaffolds Vite + React + Tailwind + @booga/vblocks with the same composition the demo serves. Default template is the rich marketing page; --template=blank gives a bare vUi starter.",
    },
    {
      title: "booga add",
      description:
        "Copies a registry re-export stub into src/components/. Pulls catalog from @booga/vregistry; no network required at runtime; per-component imports stay tree-shakable.",
    },
    {
      title: "booga build",
      description:
        "Delegates to @booga/vssg for the static-site generate pipeline. Reads vcli.config.json for the entry; emits a deployable dist/ directory wired to vTheme tokens.",
    },
    {
      title: "booga check",
      description:
        "Delegates to @booga/vlint across project source. Surfaces vTheme-token violations, vBlocks-schema mismatches, and accessibility regressions in one pass.",
    },
  ],
};

// CTA: explicit command code block. Honest about what running the command
// does (spawns a local Node server, opens browser, serves the same page).
const ctaContent = {
  kicker: "Try it now",
  eyebrow: "Zero install, zero config",
  heading: "Run the demo in your terminal",
  description:
    "Copy the command below into your shell. vCli will fetch the package, spawn a local HTTP server on a free port, open your default browser to the URL, and exit 0. The page you see in the browser is the exact composition rendered above, served from this package's bundled demo-dist/.",
  primaryCta: { label: "Open npm package", href: NPM_HREF },
  secondaryCta: { label: "Read the source", href: REPO_HREF },
  tonePills: [
    { label: DEMO_CMD, tone: "info" },
    { label: INIT_CMD, tone: "ok" },
  ],
  density: "spacious",
};

// Footer: links to the canonical npm + GitHub surfaces. No hosted-demo URL
// listed because vCli ships zero-install demo as the consumer-facing path;
// gh-pages is intentionally not configured (worthiness research 2026-05-31).
const footerContent = {
  kicker: "vCli",
  brand: {
    name: "@booga/vcli",
    tagline: "Zero-install vBlocks demo and pre-populated scaffold CLI",
  },
  links: [
    { label: "npm package", href: NPM_HREF },
    { label: "GitHub repo", href: REPO_HREF },
    { label: "vBlocks docs", href: "https://www.npmjs.com/package/@booga/vblocks" },
    { label: "vTheme docs", href: "https://www.npmjs.com/package/@booga/vtheme" },
  ],
  copyright:
    "Rendered from the bundled vBlocks composition. Typography, tone palette, and section padding flow from @booga/vtheme 0.3.0 + @booga/vui 0.4.0 + @booga/vblocks 0.4.0; no leaf-consumer CSS overrides.",
  density: "normal",
};

// Brand-mark strip above the hero. Mirrors the vBrand demo's BrandMarkStrip:
// surfaces the version + the two consumer-facing commands as tone pills so a
// visitor sees the vCli thesis without scrolling.
function BrandMarkStrip() {
  return (
    <Box as="header" className="max-w-6xl mx-auto px-6 pt-16">
      <Inline wrap gap={3} align="center">
        <Kicker>vCli 0.2.0</Kicker>
        <Eyebrow tone="info">Zero-install demo + populated scaffold CLI</Eyebrow>
        <Pill tone="info">{DEMO_CMD}</Pill>
        <Pill tone="ok">{INIT_CMD}</Pill>
        <Pill tone="meta">vBlocks 0.4.0</Pill>
        <Pill tone="meta">vTheme 0.3.0</Pill>
      </Inline>
    </Box>
  );
}

function App() {
  return (
    <div className="bg-background text-foreground">
      <BrandMarkStrip />
      <HeroSplit content={heroContent} />
      <FeaturesGrid content={featuresContent} />
      <CtaCentered content={ctaContent} />
      <FooterSplit content={footerContent} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
