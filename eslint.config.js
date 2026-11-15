import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// Same setup as Vite's React + TypeScript template
export default defineConfig([
  globalIgnores(["dist", "coverage", "vite.config.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The pages load their data by calling a load function from an
      // effect, and that function sets a loading flag first. This React
      // Compiler rule flags every one of those; moving the data loading out
      // of effects is a separate refactor, not part of adding CI.
      "react-hooks/set-state-in-effect": "off",
      // The context files export their hook next to the provider
      "react-refresh/only-export-components": [
        "error",
        { allowExportNames: ["useAuth", "useSocket"] },
      ],
    },
  },
]);
