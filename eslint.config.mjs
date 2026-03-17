import nextTypescript from "eslint-config-next/typescript";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [...nextTypescript, ...nextCoreWebVitals, {
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "release/**",
    "dist-electron/**",
    "convex/_generated/**"
  ],
  rules: {
    "react-hooks/set-state-in-effect": "warn",
  }
}];

export default eslintConfig;
