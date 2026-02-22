// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@sentry/nuxt/module'],

  sentry: {
    sourceMapsUploadOptions: {
      enabled: false // Disable direct sourcemap upload here; let coolify/pipelines handle if needed
    }
  },

  devtools: {
    enabled: true
  },

  ssr: false,

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // NUXT_PUBLIC_API_BASE env var will override this at runtime automatically
      apiBase: 'http://127.0.0.1:8000',
      testModeEnabled: true,
      demoMode: false,
      featureDailyPlanning: false, // Overridden by NUXT_PUBLIC_FEATURE_DAILY_PLANNING
      featureStrictAvailability: false, // Overridden by NUXT_PUBLIC_FEATURE_STRICT_AVAILABILITY
      featureLanguageSupport: false, // Overridden by NUXT_PUBLIC_FEATURE_LANGUAGE_SUPPORT
      enableVisitCode: false, // Overridden by NUXT_PUBLIC_ENABLE_VISIT_CODE
      featureAdvertise: true, // Overridden by NUXT_PUBLIC_FEATURE_ADVERTISE

      // Branding
      brandName: 'Habitus', // Overridden by NUXT_PUBLIC_BRAND_NAME
      brandLogoUrl: '', // Overridden by NUXT_PUBLIC_BRAND_LOGO_URL
      brandColorPrimary: '', // Overridden by NUXT_PUBLIC_BRAND_COLOR_PRIMARY
    }
  },

  compatibilityDate: '2025-01-15'
})
