<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const token = route.query.token as string
const type = route.query.type as string // 'activation' or 'reset'

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const title = computed(() => type === 'activation' ? 'Account activeren' : 'Wachtwoord herstellen')
const description = computed(() => type === 'activation' 
  ? 'Stel een wachtwoord in om je account te activeren.' 
  : 'Voer een nieuw wachtwoord in.')

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Wachtwoorden komen niet overeen.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Wachtwoord moet minimaal 8 tekens lang zijn.'
    return
  }

  loading.value = true
  error.value = ''
  
  const runtime = useRuntimeConfig()
  const backendApiBase = String(runtime.public.apiBase ?? '')

  try {
    const { error: apiError } = await useFetch('/auth/reset-password', {
      baseURL: backendApiBase,
      method: 'POST',
      body: {
        token,
        new_password: password.value
      }
    })

    if (apiError.value) {
      error.value = apiError.value.data?.detail || 'Er is een fout opgetreden.'
    } else {
      success.value = 'Wachtwoord succesvol ingesteld. Je wordt doorgestuurd naar de inlogpagina...'
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } catch (e) {
    error.value = 'Er is een onverwachte fout opgetreden.'
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-16">
    <UPageHeader :title="title" :description="description" />
    <UCard class="mt-6 p-4 space-y-4">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-circle"
        :title="error"
      />
      <UAlert
        v-if="success"
        color="success"
        variant="soft"
        icon="i-heroicons-check-circle"
        :title="success"
      />

      <form v-if="!success" class="space-y-4" @submit.prevent="handleSubmit">
        <UFormGroup label="Nieuw wachtwoord" name="password">
          <UInput v-model="password" type="password" placeholder="••••••••" autofocus />
        </UFormGroup>
        
        <UFormGroup label="Bevestig wachtwoord" name="confirmPassword">
          <UInput v-model="confirmPassword" type="password" placeholder="••••••••" />
        </UFormGroup>

        <UButton type="submit" block :loading="loading">Wachtwoord instellen</UButton>
      </form>
    </UCard>
  </div>
</template>
