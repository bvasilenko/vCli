import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  HeroSplit, HeroSplitDefaultContent,
  FeaturesGrid, FeaturesGridDefaultContent,
  CtaCentered, CtaCenteredDefaultContent,
  FooterSplit, FooterSplitDefaultContent,
} from "@booga/vblocks";

let seed = 1;
function swapPlaceholders(v) {
  if (typeof v === "string") {
    const m = v.match(/placehold\.co\/(\d+)x(\d+)/);
    return m ? `https://picsum.photos/seed/vc${seed++}/${m[1]}/${m[2]}` : v;
  }
  if (Array.isArray(v)) return v.map(swapPlaceholders);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = swapPlaceholders(v[k]);
    return o;
  }
  return v;
}

function App() {
  return (
    <div className="bg-background text-foreground">
      <HeroSplit content={swapPlaceholders(HeroSplitDefaultContent)} />
      <FeaturesGrid content={swapPlaceholders(FeaturesGridDefaultContent)} />
      <CtaCentered content={swapPlaceholders(CtaCenteredDefaultContent)} />
      <FooterSplit content={swapPlaceholders(FooterSplitDefaultContent)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
