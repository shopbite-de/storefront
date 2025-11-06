import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    exclude: ['.nuxt/**', 'node_modules/**', 'dist/**'],
    globals: true,
    domEnvironment: 'jsdom',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
      include: [
        'components/**',
        'composables/**',
        'helpers/**',
        'layouts/**',
        'middleware/**',
        'pages/**',
        'server/**',
        'store/**',
        'utils/**',
      ],
    },
  },
})
