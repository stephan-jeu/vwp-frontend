import { ofetch, type FetchOptions } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const base = ofetch.create({
    baseURL: String(config.public.apiBase || ''),
    async onRequest({ options }) {
      if (import.meta.server) return
      const token = localStorage.getItem('access_token') ?? undefined
      const headers = new Headers(options.headers as HeadersInit)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    }
  })

  async function api<T>(request: string, options?: FetchOptions<'json'>): Promise<T> {
    try {
      return await base<T>(request, options)
    } catch (error: unknown) {
      // Only handle 401 on client
      if (import.meta.server) throw error
      const err = error as { response?: Response }
      if (!err.response || err.response.status !== 401) throw error

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw error

      // Try refresh
      const refreshed = await ofetch<{ access_token: string; token_type: string }>(
        '/auth/refresh',
        {
          baseURL: String(config.public.apiBase || ''),
          method: 'POST',
          query: { refresh_token: refreshToken }
        }
      )

      if (!refreshed?.access_token) throw error
      localStorage.setItem('access_token', refreshed.access_token)

      const retryHeaders = new Headers((options?.headers as HeadersInit) || {})
      retryHeaders.set('Authorization', `Bearer ${refreshed.access_token}`)
      return await base<T>(request, { ...options, headers: retryHeaders })
    }
  }

  return {
    provide: {
      api
    }
  }
})
