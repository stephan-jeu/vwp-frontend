<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/"> <AppLogo class="max-h-2/4 w-24" /> </NuxtLink>
      </template>
      <template #right>
        <nav class="flex items-center gap-4">
          <NuxtLink to="/" class="hover:underline">Mijn bezoeken</NuxtLink>
          <NuxtLink to="/advertised" class="hover:underline">Hulp gevraagd</NuxtLink>
        </nav>
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
  // Default layout for standard users
</script>
