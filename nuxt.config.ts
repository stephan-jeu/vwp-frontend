// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],

  devtools: {
    enabled: true
  },

  ssr: false,

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // NUXT_PUBLIC_API_BASE env var will override this at runtime automatically
      apiBase: 'http://localhost:8000',
      testModeEnabled: true,
      demoMode: false
    }
  },



  compatibilityDate: '2025-01-15'
})
