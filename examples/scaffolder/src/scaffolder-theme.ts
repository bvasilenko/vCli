import type { CSSProperties } from "react";

const surface = {
  app: "oklch(98% .005 240)",
  panel: "oklch(100% 0 0)",
  ink: "oklch(12% .01 240)",
  muted: "oklch(55% .015 240)",
  border: "oklch(90% .008 240)",
  controlInk: "oklch(20% .02 240)",
  accent: "oklch(55% .2 250)",
  accentInk: "oklch(99% .005 250)",
  danger: "oklch(55% .22 27)",
  dangerSurface: "oklch(99% .005 27)",
} as const;

const space = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
} as const;

const text = {
  xs: "0.75rem",
  sm: "0.875rem",
} as const;

const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
} as const;

const shadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)",
} as const;

const timing = {
  quick: "0.12s",
  steady: "0.15s",
} as const;

export const scaffolderTheme = {
  surface,
  space,
  text,
  radius,
  shadow,
  timing,
} as const;

export const panelStyle: CSSProperties = {
  flex: 1,
  borderRight: `1px solid ${surface.border}`,
  backgroundColor: surface.panel,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const previewFrameStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: `1px solid ${surface.border}`,
  borderRadius: radius.lg,
  display: "block",
  backgroundColor: surface.panel,
  boxShadow: shadow.md,
};

export const controlStyle: CSSProperties = {
  padding: `${space.sm} ${space.md}`,
  fontSize: text.sm,
  lineHeight: 1.55,
  color: surface.controlInk,
  backgroundColor: surface.panel,
  border: `1px solid ${surface.border}`,
  borderRadius: radius.sm,
  boxShadow: shadow.sm,
  fontVariantNumeric: "tabular-nums",
  transition: `border-color ${timing.quick}, box-shadow ${timing.quick}`,
};

export const handleInputStyle: CSSProperties = {
  ...controlStyle,
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

export const loadButtonStyle: CSSProperties = {
  ...controlStyle,
  fontWeight: 600,
  color: surface.accentInk,
  backgroundColor: surface.accent,
  border: "none",
  cursor: "pointer",
  transition: `filter ${timing.quick}, box-shadow ${timing.quick}, transform ${timing.quick}`,
};

export const stateNoteStyle: CSSProperties = {
  padding: space.md,
  border: `1px solid ${surface.border}`,
  borderRadius: radius.md,
  backgroundColor: surface.panel,
  boxShadow: shadow.sm,
  color: surface.muted,
  fontSize: text.sm,
  lineHeight: 1.55,
};

export const interactionCss = [
  `.sfc-btn-load:hover{filter:brightness(0.93);box-shadow:${shadow.md} !important;}`,
  `.sfc-btn-load:focus-visible{outline:2px solid ${surface.accent};outline-offset:2px;}`,
  `.sfc-btn-load:active{filter:brightness(0.88);transform:translateY(1px);}`,
  `.sfc-btn-download:hover:not(:disabled){filter:brightness(0.88);box-shadow:${shadow.md};}`,
  `.sfc-btn-download:focus-visible{outline:2px solid ${surface.accent};outline-offset:2px;}`,
  `.sfc-btn-download:active:not(:disabled){filter:brightness(0.80);transform:translateY(1px);}`,
  `.sfc-btn-download:disabled{cursor:not-allowed;}`,
  `.sfc-btn-load,.sfc-btn-download{font-variant-numeric:tabular-nums;}`,
  `.sfc-select:hover,.sfc-input:hover{border-color:${surface.accent} !important;box-shadow:${shadow.sm},0 0 0 1px ${surface.accent};}`,
  `.sfc-select:focus-visible,.sfc-input:focus-visible{outline:2px solid ${surface.accent};outline-offset:2px;border-color:${surface.accent} !important;box-shadow:0 0 0 1px ${surface.accent};}`,
].join("");
