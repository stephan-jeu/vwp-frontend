import type { FetchOptions, ResponseType } from 'ofetch'

export {}

type ApiClient = <T>(request: string, options?: FetchOptions<ResponseType>) => Promise<T>

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
