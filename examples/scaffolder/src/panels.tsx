import React, { useMemo } from "react";
import { CompositionEditor } from "@booga/vbrand/composition";
import type { CompositionSpec } from "@booga/vbrand/composition";
import { TEMPLATE_IDS } from "@booga/vbrand/templates";
import type { TemplateId } from "@booga/vbrand/templates";
import { BROWSER_PREFIXES } from "./handle.js";
import { buildPreviewHtml } from "./preview-html.js";
import {
  controlStyle,
  handleInputStyle,
  loadButtonStyle,
  panelStyle,
  previewFrameStyle,
  scaffolderTheme,
  stateNoteStyle,
} from "./scaffolder-theme.js";
import type { BrandState } from "./use-brand-loader.js";

const FIXTURE_OPTIONS = ["stripe", "vercel", "linear", "notion", "github"] as const;

const CONTROL_IDS = {
  fixture: "sfc-brand-fixture",
  handle: "sfc-brand-source-handle",
  appType: "sfc-app-type",
} as const;

function PanelHeader({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: `${scaffolderTheme.space.sm} ${scaffolderTheme.space.lg}`,
        borderBottom: `1px solid ${scaffolderTheme.surface.border}`,
        borderTop: `2px solid ${scaffolderTheme.surface.accent}`,
        backgroundColor: scaffolderTheme.surface.panel,
        boxShadow: scaffolderTheme.shadow.sm,
        fontWeight: 700,
        fontSize: scaffolderTheme.text.xs,
        color: scaffolderTheme.surface.muted,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </div>
  );
}

interface FieldLabelProps {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
  readonly marginTop?: boolean;
}

function FieldLabel({ htmlFor, children, marginTop = false }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: scaffolderTheme.text.xs,
        fontWeight: 700,
        letterSpacing: "0.1em",
        lineHeight: 1.6,
        textTransform: "uppercase",
        color: scaffolderTheme.surface.muted,
        marginTop: marginTop ? scaffolderTheme.space.md : undefined,
      }}
    >
      {children}
    </label>
  );
}

export interface BrandPanelProps {
  readonly inputHandle: string;
  readonly brandState: BrandState;
  readonly appType: TemplateId;
  readonly onInputHandleChange: (handle: string) => void;
  readonly onFixtureSelect: (fixture: string) => void;
  readonly onLoad: () => void;
  readonly onAppTypeChange: (type: TemplateId) => void;
}

export function BrandPanel({
  inputHandle,
  brandState,
  appType,
  onInputHandleChange,
  onFixtureSelect,
  onLoad,
  onAppTypeChange,
}: BrandPanelProps) {
  const activeFixture =
    FIXTURE_OPTIONS.find((f) => inputHandle === `fixture:${f}`) ?? "";

  return (
    <div style={{ ...panelStyle, maxWidth: "17.5rem" }}>
      <PanelHeader>Brand source</PanelHeader>
      <div
        style={{
          padding: scaffolderTheme.space.lg,
          display: "flex",
          flexDirection: "column",
          gap: scaffolderTheme.space.md,
          backgroundColor: scaffolderTheme.surface.app,
        }}
      >
        <FieldLabel htmlFor={CONTROL_IDS.fixture}>Brand fixture</FieldLabel>
        <select
          id={CONTROL_IDS.fixture}
          aria-label="Brand fixture"
          className="sfc-select"
          value={activeFixture}
          onChange={(e) => {
            if (e.target.value) onFixtureSelect(e.target.value);
          }}
          style={controlStyle}
        >
          <option value="">Select brand fixture</option>
          {FIXTURE_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <FieldLabel htmlFor={CONTROL_IDS.handle} marginTop>
          {`Brand source handle (${BROWSER_PREFIXES.join(", ")})`}
        </FieldLabel>
        <input
          id={CONTROL_IDS.handle}
          aria-label="Brand source handle"
          className="sfc-input"
          value={inputHandle}
          onChange={(e) => onInputHandleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onLoad();
          }}
          placeholder="fixture:stripe"
          style={handleInputStyle}
        />
        <button
          aria-label="Load brand"
          className="sfc-btn-load"
          onClick={onLoad}
          style={loadButtonStyle}
        >
          Load brand
        </button>

        <FieldLabel htmlFor={CONTROL_IDS.appType} marginTop>
          App type
        </FieldLabel>
        <select
          id={CONTROL_IDS.appType}
          aria-label="App type"
          className="sfc-select"
          value={appType}
          onChange={(e) => onAppTypeChange(e.target.value as TemplateId)}
          style={controlStyle}
        >
          {TEMPLATE_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        {brandState.status === "error" && (
          <div
            style={{
              ...stateNoteStyle,
              borderColor: scaffolderTheme.surface.danger,
              backgroundColor: scaffolderTheme.surface.dangerSurface,
              color: scaffolderTheme.surface.danger,
              fontSize: scaffolderTheme.text.xs,
              fontWeight: 600,
              marginTop: scaffolderTheme.space.sm,
            }}
          >
            {brandState.message}
          </div>
        )}
      </div>
    </div>
  );
}

export interface CompositionPanelProps {
  readonly brandState: BrandState;
  readonly composition: CompositionSpec | null;
  readonly onCompositionChange: (spec: CompositionSpec) => void;
  readonly onCompositionReset: () => void;
}

export function CompositionPanel({
  brandState,
  composition,
  onCompositionChange,
  onCompositionReset,
}: CompositionPanelProps) {
  return (
    <div style={panelStyle}>
      <PanelHeader>Composition</PanelHeader>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: scaffolderTheme.space.lg,
          backgroundColor: scaffolderTheme.surface.app,
        }}
      >
        {brandState.status === "loading" && (
          <div style={stateNoteStyle}>
            Loading...
          </div>
        )}
        {brandState.status === "ready" && composition !== null && (
          <CompositionEditor
            spec={composition}
            onChange={onCompositionChange}
            onReset={onCompositionReset}
          />
        )}
      </div>
    </div>
  );
}

export interface PreviewPanelProps {
  readonly brandState: BrandState;
  readonly appType: TemplateId;
  readonly composition: CompositionSpec | null;
}

export function PreviewPanel({
  brandState,
  appType,
  composition,
}: PreviewPanelProps) {
  const themedHtml = useMemo(() => {
    if (brandState.status !== "ready" || composition === null) return null;
    return buildPreviewHtml({
      brand: brandState.brand,
      appType,
      composition,
      baseURI: document.baseURI,
    });
  }, [appType, brandState, composition]);

  return (
    <div style={{ ...panelStyle, borderRight: "none", flex: 2, overflow: "auto" }}>
      <PanelHeader>Preview</PanelHeader>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: scaffolderTheme.space.lg,
          backgroundColor: scaffolderTheme.surface.app,
          boxSizing: "border-box",
        }}
      >
        {themedHtml === null ? (
          <div style={stateNoteStyle}>
            Load a brand source to render the isolated preview document.
          </div>
        ) : (
          <iframe
            srcDoc={themedHtml}
            title="vCli preview"
            sandbox="allow-same-origin"
            style={previewFrameStyle}
          />
        )}
      </div>
    </div>
  );
}
