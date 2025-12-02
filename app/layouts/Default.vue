<template>
  <UApp>
    <UHeader
      :toggle="{
        color: 'primary',
        variant: 'subtle',
        class: 'rounded-full'
      }"
    >
      <template #left>
        <NuxtLink to="/"> <AppLogo class="max-h-2/4 w-24" /> </NuxtLink>
      </template>
      <UNavigationMenu :items="menuItems" class="w-full justify-center" />

      <template #right>
        <div v-if="testModeUiEnabled" class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            icon="i-lucide-calendar-clock"
            @click="onOpenTestMode"
          >
            {{ simulatedDateLabel }}
          </UButton>
        </div>
      </template>

      <template #body>
        <UNavigationMenu :items="menuItems" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UModal
      v-model:open="testModeModalOpen"
      title="Simuleer datum"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-3 text-sm">
          <div>
            <label class="block text-xs mb-1">Datum</label>
            <UInput v-model="testModeInput" type="date" />
          </div>
          <p class="text-xs text-gray-500">
            Laat het veld leeg om de huidige datum van je computer te gebruiken.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="ghost" @click="onResetTestMode">
            Reset
          </UButton>
          <UButton @click="onConfirmTestMode">
            Opslaan
          </UButton>
        </div>
      </template>
    </UModal>

    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <UMain class="container mx-auto px-4 flex-grow">
        <slot />
      </UMain>
    </div>
  </UApp>
</template>

<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui'
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'
  import { useTestModeStore } from '~~/stores/testMode'

  const auth = useAuthStore()
  const { isAdmin } = storeToRefs(auth)

  const testModeStore = useTestModeStore()
  const { simulatedDate } = storeToRefs(testModeStore)

  const runtimeConfig = useRuntimeConfig()

  const testModeEnabled = computed<boolean>(() => {
    const raw = runtimeConfig.public.testModeEnabled
    if (typeof raw === 'string') {
      return raw === 'true' || raw === '1'
    }
    return Boolean(raw)
  })

  const testModeUiEnabled = computed<boolean>(() => testModeEnabled.value && isAdmin.value)

  const simulatedDateLabel = computed<string>(() => {
    if (!simulatedDate.value) return 'Simuleer: vandaag'
    const dt = new Date(simulatedDate.value)
    if (Number.isNaN(dt.getTime())) return 'Simuleer: vandaag'
    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })
    return `Simuleer: ${formatter.format(dt)}`
  })

  const testModeModalOpen = ref<boolean>(false)
  const testModeInput = ref<string>('')

  function onOpenTestMode(): void {
    if (simulatedDate.value) {
      testModeInput.value = simulatedDate.value
    } else {
      const now = new Date()
      const m = `${now.getMonth() + 1}`.padStart(2, '0')
      const d = `${now.getDate()}`.padStart(2, '0')
      testModeInput.value = `${now.getFullYear()}-${m}-${d}`
    }
    testModeModalOpen.value = true
  }

  function onConfirmTestMode(): void {
    const value = testModeInput.value.trim()
    if (!value) {
      testModeStore.reset()
    } else {
      testModeStore.setSimulatedDate(value)
    }
    testModeModalOpen.value = false
  }

  function onResetTestMode(): void {
    testModeStore.reset()
    testModeModalOpen.value = false
  }

  onMounted(() => {
    auth.ensureLoaded()
  })

  type AdvertisedVisitSummary = { id: number }

  const { $api } = useNuxtApp()

  const { data: advertisedData } = useAsyncData(
    'advertised-visits-layout',
    () => {
      const query: Record<string, string> = {}
      if (testModeUiEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      return $api<AdvertisedVisitSummary[]>('/visits/advertised/list', { query })
    },
    {
      watch: [() => simulatedDate.value, () => testModeUiEnabled.value]
    }
  )

  const advertisedCount = computed(() => advertisedData.value?.length ?? 0)

  const baseItems: NavigationMenuItem[] = [
    { label: 'Mijn bezoeken', to: '/my-visits', icon: 'i-lucide-bike' },
    { label: 'Hulp gevraagd', to: '/advertised', icon: 'i-lucide-megaphone' },
    { label: 'Alle bezoeken', to: '/visits', icon: 'i-lucide-list' }
  ]

  const adminGroup: NavigationMenuItem = {
    label: 'Beheer',
    icon: 'i-lucide-settings',
    children: [
      { label: 'Projecten', to: '/admin/projects', icon: 'i-lucide-bird' },
      { label: "Cluster SFC's", to: '/admin/cluster-sfc', icon: 'i-lucide-grape' },
      { label: 'Planning', to: '/admin/planning', icon: 'i-lucide-list-check' },
      { label: 'Onderzoekers', to: '/admin/researchers', icon: 'i-lucide-users' },
      { label: 'Beschikbaarheid', to: '/admin/availability', icon: 'i-lucide-calendar-days' },
      { label: 'Controle', to: '/admin/audit', icon: 'i-lucide-list-checks' },
      { label: 'Capaciteitsplanning', to: '/admin/capacity', icon: 'i-lucide-square-chart-gantt' }
    ]
  }

  const menuItems = computed<NavigationMenuItem[][]>(() => {
    const items: NavigationMenuItem[] = baseItems.map((i) => ({ ...i }))

    const count = advertisedCount.value
    if (count > 0) {
      const advertisedItem = items.find((i) => i.to === '/advertised')
      if (advertisedItem) {
        advertisedItem.badge = String(count)
      }
    }

    if (isAdmin.value) {
      const clonedAdmin: NavigationMenuItem = {
        ...adminGroup,
        children: adminGroup.children?.map((c) => ({ ...c }))
      }
      items.push(clonedAdmin)
    }
    return [items]
  })
</script>
