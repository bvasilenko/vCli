import vtheme from "@booga/vtheme/preset";
import { dslSafelist } from "@booga/vdsl";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  presets: [vtheme],
  safelist: dslSafelist,
};
