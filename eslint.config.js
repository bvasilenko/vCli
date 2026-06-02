import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: [
    "dist/**",
    "demo/**",
    "demo-dist/**",
    "node_modules/**",
    "src/template/files/**",
    "src/template/files-vblocks-marketing/**",
    "coverage/**",
    "scripts/**",
    "compose-ui/**",
    "compose-dist/**",
    "examples/**",
    "src/template/files-scaffold/**",
  ],
});
