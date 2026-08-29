import tseslint from "typescript-eslint";

const typedFiles = ["**/*.ts", "**/*.tsx"];

export default tseslint.config(
  {
    ignores: [
      "**/artifacts/**",
      "**/resources/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/bin/**",
      "**/obj/**",
      "**/.vite/**",
      "**/out/**",
    ],
  },
  ...tseslint.configs.strict.map((config) => ({ ...config, files: typedFiles })),
  ...tseslint.configs.stylistic.map((config) => ({ ...config, files: typedFiles })),
  {
    files: typedFiles,
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
);
