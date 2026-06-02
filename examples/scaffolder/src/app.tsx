import React from "react";
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
        backgroundColor: "oklch(98% .005 240)",
        color: "oklch(12% .01 240)",
      }}
    >
      <style>{
        `.sfc-btn-load:hover{filter:brightness(0.93);}` +
        `.sfc-btn-load:focus-visible{outline:2px solid oklch(55% .2 250);outline-offset:2px;}` +
        `.sfc-btn-load:active{filter:brightness(0.88);}` +
        `.sfc-btn-download:hover:not(:disabled){filter:brightness(0.88);}` +
        `.sfc-btn-download:focus-visible{outline:2px solid oklch(55% .2 250);outline-offset:2px;}` +
        `.sfc-btn-download:active:not(:disabled){filter:brightness(0.80);}` +
        `.sfc-select:focus-visible,.sfc-input:focus-visible{outline:2px solid oklch(55% .2 250);outline-offset:2px;border-color:oklch(55% .2 250);}`
      }</style>

      <header
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid oklch(90% .008 240)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          backgroundColor: "oklch(98% .005 240)",
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>vCli Scaffolder</span>
        <span style={{ color: "oklch(55% .015 240)", fontSize: "0.75rem" }}>
          0.3.0-alpha.1
        </span>
        <button
          className="sfc-btn-download"
          onClick={state.onDownload}
          disabled={!downloadReady}
          style={{
            marginLeft: "auto",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            backgroundColor: "oklch(55% .2 250)",
            color: "oklch(99% .005 250)",
            border: "none",
            borderRadius: "0.375rem",
            cursor: downloadReady ? "pointer" : "default",
            opacity: downloadReady ? 1 : 0.5,
            transition: "opacity 0.15s",
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
