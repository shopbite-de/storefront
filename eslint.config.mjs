// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(
  {
    rules: {
      "vue/no-watch-after-await": "error",
      "vue/no-lifecycle-after-await": "error",
      "vue/multi-word-component-names": "off",
    },
  },
  eslintConfigPrettier,
);
