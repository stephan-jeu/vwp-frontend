<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const route = useRoute()
  const router = useRouter()
  const error = ref('')

  onMounted(async () => {
    const code = route.query.code
    if (!code) {
      error.value = 'Geen autorisatiecode ontvangen.'
      return
    }

    const runtime = useRuntimeConfig()
    const backendApiBase = String(runtime.public.apiBase ?? '')

    try {
      const { data, error: apiError } = await useFetch<{ access_token: string, refresh_token: string }>('/auth/callback/ms365', {
        baseURL: backendApiBase,
        method: 'POST',
        body: { code }
      })

      if (apiError.value) {
        error.value = apiError.value.data?.detail || 'Inloggen mislukt.'
        return
      }

      const tokens = data.value
      if (tokens) {
        localStorage.setItem('access_token', tokens.access_token)
        localStorage.setItem('refresh_token', tokens.refresh_token)
        await router.push('/')
      }
    } catch (e) {
      error.value = 'Er is een fout opgetreden tijdens het inloggen.'
      console.error(e)
    }
  })
</script>

<template>
  <div class="max-w-md mx-auto py-16 text-center">
    <UCard class="p-8">
      <div v-if="error" class="space-y-4">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto" />
        <h3 class="text-lg font-medium text-red-600">Inloggen mislukt</h3>
        <p class="text-gray-500">{{ error }}</p>
        <UButton to="/login" variant="ghost">Terug naar inloggen</UButton>
      </div>
      <div v-else class="space-y-4">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mx-auto" />
        <p class="text-gray-500">Bezig met inloggen...</p>
      </div>
    </UCard>
  </div>
</template>
