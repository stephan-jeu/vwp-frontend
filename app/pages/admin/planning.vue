<template>
  <div>
    <UPageHeader title="Planning" />

    <UCard class="mt-4">
      <div class="flex flex-col gap-4">
        <div class="flex items-end gap-3">
          <UInput v-model.number="week" type="number" :min="1" :max="53" label="Week (ISO)" class="w-32" />
          <UButton icon="i-heroicons-arrow-path" color="neutral" variant="soft" :loading="loading" @click="load">
            Vernieuwen
          </UButton>
        </div>

        <div v-if="items.length === 0" class="text-gray-500">Geen geplande bezoeken gevonden.</div>

        <div v-else class="space-y-2">
          <div v-for="it in items" :key="it.id" class="border rounded-md p-3">
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div><span class="font-medium">Project:</span> {{ it.project_code }}</div>
              <div><span class="font-medium">Cluster:</span> {{ it.cluster_number }}</div>
              <div class="grow" />
              <div><span class="font-medium">Van:</span> {{ it.from_date || '-' }}</div>
              <div><span class="font-medium">Tot:</span> {{ it.to_date || '-' }}</div>
            </div>
            <div class="mt-2 text-sm">
              <div><span class="font-medium">Functies:</span> {{ it.functions.join(', ') }}</div>
              <div><span class="font-medium">Soorten:</span> {{ it.species.join(', ') }}</div>
              <div><span class="font-medium">Onderzoekers:</span> {{ it.researchers.join(', ') }}</div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
  
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'admin' })

  type PlanningVisit = {
    id: number
    project_code: string
    cluster_number: number
    functions: string[]
    species: string[]
    from_date: string | null
    to_date: string | null
    researchers: string[]
  }

  const { $api } = useNuxtApp()

  const items = ref<PlanningVisit[]>([])
  const loading = ref(false)
  const week = ref<number>(currentIsoWeek())

  function currentIsoWeek(): number {
    const d = new Date()
    // Set to nearest Thursday: current date + 4 - current day number (Sunday=0)
    const dayNr = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dayNr + 3)
    const firstThursday = new Date(d.getFullYear(), 0, 4)
    const weekNumber =
      1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
    return Math.max(1, Math.min(53, weekNumber))
  }

  async function load(): Promise<void> {
    loading.value = true
    try {
      const w = week.value
      items.value = await $api<PlanningVisit[]>(`/planning${w ? `?week=${w}` : ''}`)
    } finally {
      loading.value = false
    }
  }

  watch(week, () => {
    // Optional: auto refresh on change
    load()
  })

  onMounted(load)
</script>
