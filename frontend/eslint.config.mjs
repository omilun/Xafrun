import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Pin React version so eslint-plugin-react doesn't call context.getFilename()
  // (removed in ESLint 10) during auto-detection.
  {
    settings: {
      react: { version: "19" },
    },
  },
]);

export default eslintConfig;
