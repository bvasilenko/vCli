declare const __VCLI_VERSION__: string | undefined;

export const VCLI_PACKAGE_NAME = "@booga/vcli";
export const VCLI_VERSION =
  typeof __VCLI_VERSION__ === "string" && __VCLI_VERSION__.length > 0
    ? __VCLI_VERSION__
    : "0.0.0-local";
