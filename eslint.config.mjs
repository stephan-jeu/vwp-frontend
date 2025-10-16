// eslint.config.mjs (flat config for ESLint v9)
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt([
  // Your rule overrides go here
  {
    rules: {
      // Let Prettier handle formatting; keep ESLint for correctness
      quotes: 'off',
      'comma-dangle': 'off',
      'brace-style': 'off',
      'vue/max-attributes-per-line': 'off'
    }
  },
  // Put Prettier last to disable any remaining conflicting stylistic rules
  prettier
])
