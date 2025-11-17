import { defineStore } from 'pinia'
import type { FetchOptions } from 'ofetch'

interface AuthIdentity {
  id: number
  sub: string
  full_name: string | null
  admin: boolean
}

interface AuthState {
  identity: AuthIdentity | null
  loaded: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    identity: null,
    loaded: false
  }),
  getters: {
    isAuthenticated: (state): boolean => Boolean(state.identity?.sub),
    isAdmin: (state): boolean => Boolean(state.identity?.admin)
  },
  actions: {
    async fetchMe(): Promise<void> {
      type ApiClient = <T>(request: string, options?: FetchOptions<'json'>) => Promise<T>
      const { $api } = useNuxtApp() as unknown as { $api: ApiClient }
      try {
        const me = await $api<AuthIdentity>('/auth/me')
        this.identity = me
      } catch {
        this.identity = null
      } finally {
        this.loaded = true
      }
    },
    async ensureLoaded(): Promise<void> {
      if (!this.loaded) {
        await this.fetchMe()
      }
    }
  }
})
