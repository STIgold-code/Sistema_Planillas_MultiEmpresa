import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prohíbe `any` explícito; la red permanente contra regresiones de tipos.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Reglas experimentales del React Compiler (eslint-plugin-react-hooks v6):
      // dan falsos positivos sobre patrones válidos pre-Compiler (refs como prop,
      // Math.random en skeletons de shadcn, reset de estado en effects). Quedan
      // como warn —visibles, no bloqueantes— hasta adoptar React Compiler.
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // sucamec está oculto por decisión de producto; código intacto, fuera del lint.
    "**/*ucamec*",
  ]),
]);

export default eslintConfig;
