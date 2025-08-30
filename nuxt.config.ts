// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    sourceMap: false
  },
  vite: {
    build: {
      sourcemap: false, cssMinify: true,
      chunkSizeWarningLimit: 2000
    },
    css: {
      devSourcemap: false
    },
  },
  ui: {
    colorMode: true
  },
  pinia: {
    storesDirs: ['./stores']
  },
  runtimeConfig: {
    public: {
      kingsApiBase: 'https://kings-logix.ru/api',
      sltApiBase: 'http://77.222.43.243:8080/api'
    }
  },
  app: {
    head: {
      title: 'SLT',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Транспортный учет'}
      ],
    }
  },
})