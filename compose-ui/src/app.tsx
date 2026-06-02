import React, { useEffect, useState, useCallback } from "react";
import { CompositionEditor } from "@booga/vbrand/composition";
import type { CompositionSpec } from "@booga/vbrand/composition";
import type { VbrandType } from "@booga/vbrand";
import { fetchBrand, fetchComposition, saveComposition } from "./api.js";
import { readHashComposition, writeHashComposition } from "./hash.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; brand: VbrandType; composition: CompositionSpec };

type SaveState = "idle" | "saving" | "saved" | "error";

function useSave(composition: CompositionSpec | null) {
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const save = useCallback(async () => {
    if (!composition) return;
    setSaveState("saving");
    try {
      await saveComposition(composition);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, [composition]);

  return { saveState, save };
}

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { saveState, save } = useSave(
    state.status === "ready" ? state.composition : null
  );

  useEffect(() => {
    Promise.all([fetchBrand(), fetchComposition()])
      .then(([brand, serverComposition]) => {
        const fromHash = readHashComposition();
        const composition = fromHash ?? serverComposition;
        setState({ status: "ready", brand, composition });
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);

  if (state.status === "loading") {
    return React.createElement(
      "div",
      { style: { padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" } },
      "Loading..."
    );
  }

  if (state.status === "error") {
    return React.createElement(
      "div",
      { style: { padding: "2rem", color: "oklch(55% .22 27)", fontFamily: "system-ui, -apple-system, sans-serif" } },
      state.message
    );
  }

  const { brand, composition } = state;

  const handleChange = (next: CompositionSpec) => {
    setState({ status: "ready", brand, composition: next });
    writeHashComposition(next);
  };

  const handleReset = () => {
    fetchComposition().then((original) => {
      setState({ status: "ready", brand, composition: original });
      writeHashComposition(original);
    });
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved to composition.json"
        : saveState === "error"
          ? "Save failed"
          : "Save to composition.json";

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "oklch(98% .005 240)",
        color: "oklch(12% .01 240)",
      },
    },
    React.createElement(
      "style",
      null,
      `.btn-compose-save:hover:not(:disabled){filter:brightness(0.88);}` +
      `.btn-compose-save:focus-visible{outline:2px solid oklch(55% .2 250);outline-offset:2px;}` +
      `.btn-compose-save:active:not(:disabled){filter:brightness(0.80);}`
    ),
    React.createElement(
      "header",
      {
        style: {
          padding: "0.75rem 1rem",
          borderBottom: "1px solid oklch(90% .008 240)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        },
      },
      React.createElement(
        "span",
        { style: { fontWeight: 600, fontSize: "0.875rem" } },
        "vcli compose"
      ),
      React.createElement(
        "button",
        {
          className: "btn-compose-save",
          onClick: save,
          disabled: saveState === "saving",
          style: {
            marginLeft: "auto",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            cursor: saveState === "saving" ? "default" : "pointer",
            backgroundColor: saveState === "error" ? "oklch(55% .22 27)" : saveState === "saved" ? "oklch(55% .18 145)" : "oklch(55% .2 250)",
            color: "oklch(99% .005 250)",
            border: "none",
            borderRadius: "0.25rem",
            opacity: saveState === "saving" ? 0.6 : 1,
            transition: "opacity 0.15s, background-color 0.15s",
          },
        },
        saveLabel
      )
    ),
    React.createElement(
      "div",
      { style: { flex: 1, overflow: "auto", padding: "1rem" } },
      React.createElement(CompositionEditor, {
        spec: composition,
        onChange: handleChange,
        onReset: handleReset,
      })
    )
  );
}
