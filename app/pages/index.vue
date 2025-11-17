<template>
  <div v-if="authLoaded && isAdmin">
    <UPageHeader title="Admin startpagina" />
    <UCard class="mt-4">
      <p class="text-sm text-gray-600">
        Admin dashboard (komt nog). Ga naar het overzicht van alle bezoeken via de knop
        hieronder.
      </p>
      <div class="mt-3">
        <UButton to="/visits">Naar alle bezoeken</UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'

  definePageMeta({ layout: 'default' })

  const auth = useAuthStore()
  const { isAdmin, loaded } = storeToRefs(auth)

  const authLoaded = computed(() => loaded.value)

  onMounted(async () => {
    await auth.ensureLoaded()
    if (!isAdmin.value) {
      await navigateTo('/my-visits')
    }
  })
</script>
