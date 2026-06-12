import React from "react";
import { VCLI_VERSION } from "./release.js";
import { interactionCss, scaffolderTheme } from "./scaffolder-theme.js";
import { useScaffolderState } from "./use-scaffolder-state.js";
import { BrandPanel, CompositionPanel, PreviewPanel } from "./panels.js";

export function App() {
  const state = useScaffolderState();
  const downloadReady = state.brandState.status === "ready" && state.composition !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: scaffolderTheme.surface.app,
        color: scaffolderTheme.surface.ink,
      }}
    >
      <style>{interactionCss}</style>

      <header
        style={{
          padding: `${scaffolderTheme.space.md} ${scaffolderTheme.space.lg}`,
          borderBottom: `1px solid ${scaffolderTheme.surface.border}`,
          borderTop: `3px solid ${scaffolderTheme.surface.accent}`,
          display: "flex",
          alignItems: "center",
          gap: scaffolderTheme.space.md,
          backgroundColor: scaffolderTheme.surface.panel,
          boxShadow: scaffolderTheme.shadow.sm,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: scaffolderTheme.text.sm,
            letterSpacing: "-0.025em",
          }}
        >
          vCli Scaffolder
        </span>
        <span
          style={{
            color: scaffolderTheme.surface.muted,
            fontSize: scaffolderTheme.text.xs,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: `${scaffolderTheme.space.xs} ${scaffolderTheme.space.sm}`,
            border: `1px solid ${scaffolderTheme.surface.border}`,
            borderRadius: scaffolderTheme.radius.sm,
            backgroundColor: scaffolderTheme.surface.panel,
            boxShadow: scaffolderTheme.shadow.sm,
          }}
        >
          {VCLI_VERSION}
        </span>
        <button
          className="sfc-btn-download"
          onClick={state.onDownload}
          disabled={!downloadReady}
          style={{
            marginLeft: "auto",
            padding: `${scaffolderTheme.space.sm} ${scaffolderTheme.space.md}`,
            fontSize: scaffolderTheme.text.sm,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            backgroundColor: scaffolderTheme.surface.accent,
            color: scaffolderTheme.surface.accentInk,
            border: "none",
            borderRadius: scaffolderTheme.radius.md,
            cursor: downloadReady ? "pointer" : "not-allowed",
            opacity: downloadReady ? 1 : 0.5,
            boxShadow: downloadReady ? scaffolderTheme.shadow.sm : "none",
            transition: `filter ${scaffolderTheme.timing.quick}, opacity ${scaffolderTheme.timing.steady}, transform ${scaffolderTheme.timing.quick}, box-shadow ${scaffolderTheme.timing.quick}`,
          }}
        >
          Download scaffold
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BrandPanel
          inputHandle={state.inputHandle}
          brandState={state.brandState}
          appType={state.appType}
          onInputHandleChange={state.onInputHandleChange}
          onFixtureSelect={state.onFixtureSelect}
          onLoad={state.onLoad}
          onAppTypeChange={state.onAppTypeChange}
        />
        <CompositionPanel
          brandState={state.brandState}
          composition={state.composition}
          onCompositionChange={state.onCompositionChange}
          onCompositionReset={state.onCompositionReset}
        />
        <PreviewPanel
          brandState={state.brandState}
          appType={state.appType}
          composition={state.composition}
        />
      </div>
    </div>
  );
}
