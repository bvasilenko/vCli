import React from "react";
import { CompositionEditor } from "@booga/vbrand/composition";
import type { CompositionSpec } from "@booga/vbrand/composition";
import { getTemplate, TEMPLATE_IDS } from "@booga/vbrand/templates";
import type { TemplateId } from "@booga/vbrand/templates";
import { BROWSER_PREFIXES } from "./handle.js";
import type { BrandState } from "./use-brand-loader.js";

const FIXTURE_OPTIONS = ["stripe", "vercel", "linear", "notion", "github"] as const;

const panelStyle: React.CSSProperties = {
  flex: 1,
  borderRight: "1px solid oklch(90% .008 240)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "0.5rem 1rem",
        borderBottom: "1px solid oklch(90% .008 240)",
        fontWeight: 600,
        fontSize: "0.75rem",
        color: "oklch(55% .015 240)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </div>
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
    <div style={{ ...panelStyle, maxWidth: 280 }}>
      <PanelHeader>Brand source</PanelHeader>
      <div
        style={{
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <label style={{ fontSize: "0.75rem", color: "oklch(55% .015 240)" }}>
          Fixture
        </label>
        <select
          className="sfc-select"
          value={activeFixture}
          onChange={(e) => {
            if (e.target.value) onFixtureSelect(e.target.value);
          }}
          style={{
            padding: "0.375rem",
            fontSize: "0.875rem",
            border: "1px solid oklch(90% .008 240)",
            borderRadius: "0.25rem",
          }}
        >
          <option value="">-- pick fixture --</option>
          {FIXTURE_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <label
          style={{
            fontSize: "0.75rem",
            color: "oklch(55% .015 240)",
            marginTop: "0.5rem",
          }}
        >
          {`Or enter handle (${BROWSER_PREFIXES.join(", ")})`}
        </label>
        <input
          className="sfc-input"
          value={inputHandle}
          onChange={(e) => onInputHandleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onLoad(); }}
          placeholder="fixture:stripe"
          style={{
            padding: "0.375rem",
            fontSize: "0.875rem",
            border: "1px solid oklch(90% .008 240)",
            borderRadius: "0.25rem",
          }}
        />
        <button
          className="sfc-btn-load"
          onClick={onLoad}
          style={{
            padding: "0.375rem",
            fontSize: "0.875rem",
            backgroundColor: "oklch(95% .008 240)",
            border: "1px solid oklch(90% .008 240)",
            borderRadius: "0.25rem",
            cursor: "pointer",
            transition: "filter 0.12s",
          }}
        >
          Load
        </button>

        <label
          style={{
            fontSize: "0.75rem",
            color: "oklch(55% .015 240)",
            marginTop: "0.5rem",
          }}
        >
          App type
        </label>
        <select
          className="sfc-select"
          value={appType}
          onChange={(e) => onAppTypeChange(e.target.value as TemplateId)}
          style={{
            padding: "0.375rem",
            fontSize: "0.875rem",
            border: "1px solid oklch(90% .008 240)",
            borderRadius: "0.25rem",
          }}
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
              color: "oklch(55% .22 27)",
              fontSize: "0.75rem",
              marginTop: "0.5rem",
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
      <div style={{ flex: 1, overflow: "auto", padding: "0.75rem" }}>
        {brandState.status === "loading" && (
          <div style={{ fontSize: "0.875rem", color: "oklch(55% .015 240)" }}>
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
  return (
    <div style={{ ...panelStyle, borderRight: "none", flex: 2, overflow: "auto" }}>
      <PanelHeader>Preview</PanelHeader>
      <div style={{ flex: 1, overflow: "auto" }}>
        {brandState.status === "ready" &&
          composition !== null &&
          getTemplate(appType).compose(brandState.brand, composition)}
      </div>
    </div>
  );
}
