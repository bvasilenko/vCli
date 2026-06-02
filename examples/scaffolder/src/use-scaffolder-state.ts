import { useCallback, useEffect, useRef, useState } from "react";
import { getTemplate, isTemplateId, TEMPLATE_IDS } from "@booga/vbrand/templates";
import type { TemplateId } from "@booga/vbrand/templates";
import type { CompositionSpec } from "@booga/vbrand/composition";
import { useBrandLoader } from "./use-brand-loader.js";
import type { BrandState } from "./use-brand-loader.js";
import { readRouteState, writeRouteState } from "./router.js";
import { downloadScaffoldZip } from "./scaffold-zip.js";

export interface ScaffolderState {
  readonly inputHandle: string;
  readonly brandState: BrandState;
  readonly appType: TemplateId;
  readonly composition: CompositionSpec | null;
  readonly onInputHandleChange: (handle: string) => void;
  readonly onFixtureSelect: (fixture: string) => void;
  readonly onLoad: () => void;
  readonly onAppTypeChange: (type: TemplateId) => void;
  readonly onCompositionChange: (spec: CompositionSpec) => void;
  readonly onCompositionReset: () => void;
  readonly onDownload: () => void;
}

export function useScaffolderState(): ScaffolderState {
  const [initialRoute] = useState(() => readRouteState());

  const [inputHandle, setInputHandle] = useState(initialRoute.brand);
  const [activeBrandHandle, setActiveBrandHandle] = useState(initialRoute.brand);
  const [appType, setAppType] = useState<TemplateId>(
    isTemplateId(initialRoute.app) ? initialRoute.app : "landing"
  );
  const [composition, setComposition] = useState<CompositionSpec | null>(null);

  const compositionInitialized = useRef(false);

  const { brandState, reload } = useBrandLoader(activeBrandHandle);

  useEffect(() => {
    if (brandState.status !== "ready" || compositionInitialized.current) return;
    compositionInitialized.current = true;
    setComposition(
      initialRoute.composition ?? getTemplate(appType).defaultComposition()
    );
  }, [brandState.status, initialRoute.composition, appType]);

  useEffect(() => {
    if (composition === null) return;
    writeRouteState(activeBrandHandle, appType, composition);
  }, [activeBrandHandle, appType, composition]);

  const onInputHandleChange = useCallback((handle: string) => {
    setInputHandle(handle);
  }, []);

  const onFixtureSelect = useCallback((fixture: string) => {
    const handle = `fixture:${fixture}`;
    setInputHandle(handle);
    setActiveBrandHandle(handle);
  }, []);

  const onLoad = useCallback(() => {
    if (inputHandle !== activeBrandHandle) {
      setActiveBrandHandle(inputHandle);
    } else {
      reload();
    }
  }, [inputHandle, activeBrandHandle, reload]);

  const onAppTypeChange = useCallback((next: TemplateId) => {
    setAppType(next);
    setComposition(getTemplate(next).defaultComposition());
  }, []);

  const onCompositionChange = useCallback((spec: CompositionSpec) => {
    setComposition(spec);
  }, []);

  const onCompositionReset = useCallback(() => {
    setComposition(getTemplate(appType).defaultComposition());
  }, [appType]);

  const onDownload = useCallback(() => {
    if (brandState.status !== "ready" || composition === null) return;
    downloadScaffoldZip(brandState.brand, composition, appType);
  }, [brandState, composition, appType]);

  return {
    inputHandle,
    brandState,
    appType,
    composition,
    onInputHandleChange,
    onFixtureSelect,
    onLoad,
    onAppTypeChange,
    onCompositionChange,
    onCompositionReset,
    onDownload,
  };
}
