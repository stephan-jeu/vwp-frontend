<template>
  <div class="max-w-md mx-auto py-16">
    <UPageHeader title="Inloggen" description="Log in met je Google-account om door te gaan." />
    <UCard class="mt-6 p-4 space-y-4">
      <UAlert
        v-if="noAccess"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Je hebt geen toegang tot de Veldwerkplanning"
        description="Neem contact op met een beheerder als je denkt dat dit onjuist is."
      />
      <div class="flex justify-center mt-6">
        <UButton color="primary" size="lg" @click="goToLogin"> Inloggen met Google </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const route = useRoute()
  const noAccess = computed(() => route.query.no_access === '1')

  const goToLogin = async () => {
    const runtime = useRuntimeConfig()
    const backendApiBase = String(runtime.public.apiBase ?? '')
    const frontendRedirectUri = `${window.location.origin}/auth/callback` // Our frontend callback

    // Fetch the Google authorization URL from our backend
    const { data } = await useFetch<{ authorization_url: string }>('/auth/login', {
      baseURL: backendApiBase,
      // Pass the frontend redirect URI to the backend's /auth/login endpoint
      // so the backend can correctly construct the Google auth URL
      query: { redirect_uri: frontendRedirectUri }
    })

    const googleAuthUrl = data.value?.authorization_url
    if (googleAuthUrl) {
      window.location.href = googleAuthUrl
    } else {
      // Handle error if auth URL not returned
      console.error('Failed to get Google authorization URL from backend.')
    }
  }
</script>
