import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      complexity: ["error", 15],
      "max-lines-per-function": ["error", 80],
      "max-depth": ["error", 4],
      eqeqeq: "error",
      "prefer-const": "error",
      "no-var": "error",
      curly: "error"
    }
  }
]);