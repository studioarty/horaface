import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "temp_deploy_extract", "yooess-server", "yooess-nvr", "yooess_app", "IgrejaKioskApp", "WindowsKioskApp", "ponto-cloud", "ponto-face-clone", "backend", ".agent", ".shared", "Diveribav_Extracted", "Dravibav3_Extracted", "Dravibav4_Extracted", "Dravibav5_Extracted", "Dravibav6_Extracted", "Drveribav_Extracted", "scratch", "Nova pasta"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
      "no-empty": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  }
);
