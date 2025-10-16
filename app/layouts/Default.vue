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

      <ClientOnly>
        <UNavigationMenu :items="menuItems" class="w-full justify-center" />
      </ClientOnly>

      <template #body>
        <ClientOnly>
          <UNavigationMenu :items="menuItems" orientation="vertical" class="-mx-2.5" />
        </ClientOnly>
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui'
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'

  const auth = useAuthStore()
  const { isAdmin } = storeToRefs(auth)

  onMounted(() => {
    auth.ensureLoaded()
  })

  const baseItems: NavigationMenuItem[] = [
    { label: 'Mijn bezoeken', to: '/', icon: 'i-lucide-bike' },
    { label: 'Hulp gevraagd', to: '/advertised', icon: 'i-lucide-megaphone' }
  ]

  const adminGroup: NavigationMenuItem = {
    label: 'Beheer',
    icon: 'i-lucide-settings',
    children: [
      { label: 'Projecten', to: '/admin/projects', icon: 'i-lucide-bird' },
      { label: "Cluster SFC's", to: '/admin/cluster-sfc', icon: 'i-lucide-grape' },
      { label: 'Bezoeken', to: '/admin/visits', icon: 'i-lucide-bike' },
      { label: 'Planning', to: '/admin/planning', icon: 'i-lucide-list-check' },
      { label: 'Onderzoekers', to: '/admin/researchers', icon: 'i-lucide-users' },
      { label: 'Capaciteit', to: '/admin/availability', icon: 'i-lucide-calendar-days' },
      { label: 'Controle', to: '/admin/validation', icon: 'i-lucide-list-checks' }
    ]
  }

  const menuItems = computed<NavigationMenuItem[][]>(() => {
    const items: NavigationMenuItem[] = baseItems.map((i) => ({ ...i }))
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
