import vtheme from "@booga/vtheme/preset";
import { dslSafelist } from "@booga/vdsl";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [vtheme],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./node_modules/@booga/vblocks/dist/**/*.{js,cjs}",
    "./node_modules/@booga/vui/dist/**/*.{js,cjs}",
  ],
  // vBlocks/vUi build spacing + display + flex class names at runtime via the DSL;
  // Tailwind's content scanner cannot see runtime-built strings. Safelist covers
  // the full surface dsl() can emit.
  safelist: [...dslSafelist],
};
