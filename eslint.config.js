import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ["dist/**", "demo/**", "node_modules/**", "src/template/files/**", "coverage/**", "scripts/**"],
});
