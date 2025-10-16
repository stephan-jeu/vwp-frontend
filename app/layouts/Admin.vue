<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2">
          <AppLogo class="h-6 w-6" />
          <span class="font-semibold">Veldwerkplanning</span>
        </NuxtLink>
      </template>
      <template #right>
        <nav class="flex items-center gap-4">
          <NuxtLink to="/" class="hover:underline">Mijn bezoeken</NuxtLink>
          <NuxtLink to="/advertised" class="hover:underline">Hulp gevraagd</NuxtLink>
        </nav>
      </template>
    </UHeader>

    <div class="flex">
      <aside class="w-64 border-r border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <UVerticalNavigation :links="links" />
      </aside>
      <UMain>
        <slot />
      </UMain>
    </div>
  </UApp>
</template>

<script setup lang="ts">
  const links = [
    [{ label: 'Projecten', to: '/admin/projects' }],
    [{ label: "Cluster SFC's", to: '/admin/clusters-sfc' }],
    [{ label: 'Bezoeken', to: '/admin/visits' }],
    [{ label: 'Planning', to: '/admin/planning' }],
    [{ label: 'Onderzoekers', to: '/admin/researchers' }],
    [{ label: 'Capaciteit', to: '/admin/availability' }],
    [{ label: 'Controle', to: '/admin/validation' }]
  ]
</script>
