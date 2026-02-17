<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const route = useRoute()
  const noAccess = computed(() => route.query.no_access === '1')

  const step = ref<'email' | 'password' | 'activation_sent'>('email')
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  
  // Auth Config
  const config = ref({
    google_enabled: true,
    ms365_enabled: false,
    email_enabled: false
  })
  const configLoaded = ref(false)

  const runtime = useRuntimeConfig()
  const backendApiBase = String(runtime.public.apiBase ?? '')

  onMounted(async () => {
    try {
      const { data } = await useFetch<{ google_enabled: boolean, ms365_enabled: boolean, email_enabled: boolean }>('/auth/config', {
        baseURL: backendApiBase
      })
      if (data.value) {
        config.value = data.value
      }
    } catch (e) {
      console.error('Failed to fetch auth config', e)
    } finally {
      configLoaded.value = true
    }
  })

  // Computed: valid providers count (excluding email for direct buttons logic? or generally?)
  const singleProvider = computed(() => {
    if (!configLoaded.value) return null
    const providers = []
    if (config.value.google_enabled) providers.push('google')
    if (config.value.ms365_enabled) providers.push('ms365')
    // If email is enabled, we always show the email form first, so not "single provider" in the sense of "just show one button"
    // But if ONLY google is enabled and NO email, we can show just Google button.
    if (config.value.email_enabled) return null
    
    if (providers.length === 1) return providers[0]
    return null
  })

  async function handleEmailSubmit() {
    if (!email.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      const { data } = await useFetch<{ provider: string, redirect_url?: string }>('/auth/login-options', {
        baseURL: backendApiBase,
        method: 'POST',
        query: { email: email.value }
      })
      
      const option = data.value
      if (!option) throw new Error('No login option returned')

      if (option.provider === 'password') {
        step.value = 'password'
      } else if (option.provider === 'activation_sent') {
        step.value = 'activation_sent'
      } else {
        errorMessage.value = 'Unknown login provider'
      }
    } catch (e) {
      errorMessage.value = 'Kon inlogopties niet ophalen.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function handlePasswordSubmit() {
    if (!password.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      // Login with password
      const { data, error } = await useFetch<{ access_token: string, refresh_token: string }>('/auth/login/password', {
        baseURL: backendApiBase,
        method: 'POST',
        body: { email: email.value, password: password.value }
      })

      if (error.value) {
        errorMessage.value = 'Ongeldige inloggegevens'
        return
      }

      const tokens = data.value
      if (tokens) {
        localStorage.setItem('access_token', tokens.access_token)
        localStorage.setItem('refresh_token', tokens.refresh_token)
        window.location.href = '/'
      }
    } catch (e) {
      errorMessage.value = 'Er is een fout opgetreden.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const goToGoogle = async () => {
    loading.value = true
    const frontendRedirectUri = `${window.location.origin}/auth/callback`
    const { data } = await useFetch<{ authorization_url: string }>('/auth/login', {
      baseURL: backendApiBase,
      query: { redirect_uri: frontendRedirectUri }
    })
    if (data.value?.authorization_url) {
      window.location.href = data.value.authorization_url
    }
  }

  const goToMS365 = async () => {
    loading.value = true
    const frontendRedirectUri = `${window.location.origin}/auth/callback-ms365`
    const { data } = await useFetch<{ authorization_url: string }>('/auth/login/ms365', {
      baseURL: backendApiBase,
      query: { redirect_uri: frontendRedirectUri }
    })
    if (data.value?.authorization_url) {
      window.location.href = data.value.authorization_url
    }
  }

  async function forgotPassword() {
    if (!email.value) {
      errorMessage.value = 'Vul eerst je e-mailadres in.'
      return
    }
    loading.value = true
    try {
       await useFetch('/auth/forgot-password', {
        baseURL: backendApiBase,
        method: 'POST',
        body: { email: email.value }
      })
      alert('Als het e-mailadres bestaat, is er een reset-link verstuurd.')
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="max-w-md mx-auto py-16">
    <UPageHeader title="Inloggen" description="Log in om door te gaan." />
    <UCard class="mt-6 p-4 space-y-4">
      <UAlert
        v-if="noAccess"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Geen toegang"
        description="Je hebt geen toegang tot deze applicatie."
      />
      
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-circle"
        :title="errorMessage"
      />

      <!-- Single Provider Optimization -->
      <div v-if="singleProvider === 'google'" class="flex justify-center mt-6">
        <UButton color="primary" size="lg" icon="i-logos-google-icon" @click="goToGoogle"> Inloggen met Google </UButton>
      </div>

       <div v-else-if="singleProvider === 'ms365'" class="flex justify-center mt-6">
        <UButton color="primary" size="lg" icon="i-logos-microsoft-icon" @click="goToMS365"> Inloggen met MS365 </UButton>
      </div>

      <div v-else>
         <!-- Multi-provider / Email flow -->
        <form class="space-y-4" @submit.prevent="step === 'email' ? handleEmailSubmit() : handlePasswordSubmit()">
          <div v-if="step === 'email'" class="space-y-2">
            <UFormGroup label="E-mailadres" name="email">
              <UInput v-model="email" type="email" placeholder="naam@organisatie.nl" autofocus class="w-full"/>
            </UFormGroup>
            <UButton type="submit" block :loading="loading" class="my-4">Volgende</UButton>
          </div>

          <div v-else-if="step === 'password'" class="space-y-2">
             <div class="flex items-center justify-between mb-2">
              <p class="text-sm text-gray-500">{{ email }} <a href="#" class="text-primary hover:underline" @click.prevent="step = 'email'">(wijzig)</a></p>
            </div>
            <UFormGroup label="Wachtwoord" name="password">
              <UInput v-model="password" type="password" placeholder="Wachtwoord" autofocus class="w-full" />
            </UFormGroup>
            <div class="flex justify-between items-center">
               <a href="#" class="text-sm text-primary hover:underline" @click.prevent="forgotPassword">Wachtwoord vergeten?</a>
            </div>
            <UButton type="submit" block :loading="loading" class="my-4">Inloggen</UButton>
          </div>

          <div v-else-if="step === 'activation_sent'" class="space-y-4">
            <UAlert
              color="primary"
              variant="soft"
              icon="i-heroicons-envelope"
              title="Activatiemail verstuurd"
              :description="`Er is een activatiemail verstuurd naar ${email}. Volg de instructies in de mail om je wachtwoord in te stellen.`"
            />
            <UButton variant="link" @click="step = 'email'">Terug naar inloggen</UButton>
          </div>
        </form>
        
        <div v-if="step === 'email'" class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500">
           Of log direct in met:
           <div class="flex justify-center gap-2 mt-2">
             <UButton v-if="config.google_enabled" color="neutral" icon="i-logos-google-icon" @click="goToGoogle">Google</UButton>
             <UButton v-if="config.ms365_enabled" color="neutral" icon="i-logos-microsoft-icon" @click="goToMS365">MS365</UButton>
           </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
