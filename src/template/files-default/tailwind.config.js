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
  safelist: [...dslSafelist],
};
