import { ofetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = ofetch.create({
    baseURL: String(config.public.apiBase || ''),
    onRequest({ options }) {
      const token = localStorage.getItem('access_token') ?? undefined
      const headers = new Headers(options.headers as HeadersInit)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    }
  })

  return {
    provide: {
      api
    }
  }
})
