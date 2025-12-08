// eslint.config.mjs - Flat Config para ESLint 9+

/**
 * Configuração mínima só pra permitir o ESLint rodar.
 * Você pode ir refinando as regras depois.
 */
export default [
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
