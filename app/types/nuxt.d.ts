export {}

declare module '#app' {
  interface NuxtApp {
    $api: typeof import('ofetch').ofetch
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: typeof import('ofetch').ofetch
  }
}



