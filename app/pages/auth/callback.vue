<template>
  <div class="flex justify-center items-center h-screen">
    <UCard class="p-8 text-center">
      <p class="mt-4 text-lg">Authenticating with Google...</p>
      <p class="text-sm text-gray-500">Please wait, this may take a moment.</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'auth' })

  const route = useRoute()
  const router = useRouter()
  const { $api } = useNuxtApp()

  onMounted(async () => {
    const code = route.query.code as string
    if (!code) {
      console.error('No authorization code found in callback URL.')
      router.push('/login')
      return
    }

    try {
      // Exchange the code with our backend
      const response = await $api<{
        access_token: string
        refresh_token: string
        token_type: string
      }>('/auth/callback', {
        method: 'POST',
        body: { code } // Send the code to the backend
      })

      if (response.access_token && response.refresh_token) {
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('refresh_token', response.refresh_token)
        router.push('/') // Redirect to MyVisits page
      } else {
        console.error('Backend did not return tokens.', response)
        router.push('/login')
      }
    } catch (error: unknown) {
      // If backend denies access (user not in DB), redirect with no_access flag
      const err = error as { statusCode?: number }
      if (err?.statusCode === 403) {
        router.push('/login?no_access=1')
        return
      }
      console.error('Error during authentication callback:', error)
      router.push('/login')
    }
  })
</script>
