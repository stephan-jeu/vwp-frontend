import type { FetchOptions } from 'ofetch'

export {}

type ApiClient = <T>(request: string, options?: FetchOptions<'json'>) => Promise<T>

declare module '#app' {
  interface NuxtApp {
    $api: ApiClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: ApiClient
  }
}
