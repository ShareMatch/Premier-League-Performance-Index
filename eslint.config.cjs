const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".vercel/**",
      "supabase/functions/**",
      "strategic-deck/**",
      "components/chatbot/backend/**",
      "monitoring/**",
      "tests/**",
      "adapters/**",
      "agents/**",
      "scripts/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-console": "error",
    },
  },
];
