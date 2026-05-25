import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  HeroSplit, HeroSplitDefaultContent,
  FeaturesGrid, FeaturesGridDefaultContent,
  CtaCentered, CtaCenteredDefaultContent,
  FooterSplit, FooterSplitDefaultContent,
} from "@booga/vblocks";

// Real photos in place of placehold.co placeholders, so the GTM-grade demo
// reads as a finished marketing page rather than grey boxes.
let seed = 1;
function realImages(v) {
  if (typeof v === "string") {
    const m = v.match(/placehold\.co\/(\d+)x(\d+)/);
    return m ? `https://picsum.photos/seed/vc${seed++}/${m[1]}/${m[2]}` : v;
  }
  if (Array.isArray(v)) return v.map(realImages);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = realImages(v[k]);
    return o;
  }
  return v;
}

function App() {
  return (
    <div className="bg-background text-foreground">
      <HeroSplit content={realImages(HeroSplitDefaultContent)} />
      <FeaturesGrid content={realImages(FeaturesGridDefaultContent)} />
      <CtaCentered content={realImages(CtaCenteredDefaultContent)} />
      <FooterSplit content={realImages(FooterSplitDefaultContent)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
