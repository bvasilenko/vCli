import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { getTemplate, isTemplateId } from "@booga/vbrand/templates";
import rawBrand from "../brand.json";
import rawComposition from "../composition.json";
import scaffoldConfig from "../scaffold.json";

const appType = isTemplateId(scaffoldConfig.appType)
  ? scaffoldConfig.appType
  : "landing";

createRoot(document.getElementById("root")).render(
  React.createElement(
    React.StrictMode,
    null,
    getTemplate(appType).compose(rawBrand, rawComposition)
  )
);
