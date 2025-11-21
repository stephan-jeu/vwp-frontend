<template>
  <div>
    <UPageHeader title="Capaciteitsplanning" />

    <UCard class="mt-4 space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <UInput
          v-model="startDate"
          type="date"
          label="Startdatum"
          class="w-48"
        />
        <UButton
          icon="i-heroicons-sparkles"
          color="primary"
          variant="solid"
          :loading="loading"
          @click="runSimulation"
        >
          Genereer capaciteit
        </UButton>
        <span v-if="metaText" class="text-xs text-gray-500">
          {{ metaText }}
        </span>
      </div>

      <div v-if="loading" class="text-sm text-gray-500">
        Capaciteitssimulatie wordt uitgevoerd...
      </div>

      <div v-else-if="!hasData" class="text-sm text-gray-500">
        Nog geen resultaten. Kies een startdatum en genereer de simulatie.
      </div>

      <div v-else class="space-y-3">
        <div class="text-xs text-gray-600">
          <span class="font-medium">Legenda:</span>
          <span class="ml-2">groen = alle vraag ingevuld</span>
          <span class="ml-2 text-red-600">rood = tekort</span>
          <span class="ml-2 text-gray-500">grijs = geen vraag</span>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded-md bg-white">
          <UTable :columns="columns" :data="rows" class="max-h-[600px]">
            <template #family-cell="{ row }">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-100">
                {{ row.original.family }}
              </span>
            </template>

            <template #part-cell="{ row }">
              <span class="text-xs text-gray-700 dark:text-gray-200">
                {{ row.original.part }}
              </span>
            </template>

            <template
              v-for="week in weekKeys"
              :key="week"
              #[`${week}-cell`]="{ row }"
            >
              <div :class="cellClass(row.original.cells[week])" class="text-[11px] text-center">
                {{ formatCell(row.original.cells[week]) }}
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'admin' })

  type FamilyDaypartCapacity = {
    required: number
    assigned: number
    shortfall: number
  }

  type CapacitySimulationResponse = {
    horizon_start: string
    horizon_end: string
    grid: Record<string, Record<string, Record<string, FamilyDaypartCapacity>>>
  }

  type GridCell = FamilyDaypartCapacity | null | undefined

  type GridRow = {
    id: string
    family: string
    part: string
    cells: Record<string, GridCell>
  }

  const { $api } = useNuxtApp()
  const toast = useToast()

  const loading = ref(false)
  const response = ref<CapacitySimulationResponse | null>(null)

  function todayIsoDate(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const startDate = ref<string>(todayIsoDate())

  const hasData = computed(() => {
    const grid = response.value?.grid
    return !!grid && Object.keys(grid).length > 0
  })

  const weekKeys = computed<string[]>(() => {
    const grid = response.value?.grid ?? {}
    return Object.keys(grid).sort()
  })

  const columns = computed(() => {
    const base = [
      { id: 'family', header: 'Soortfamilie' },
      { id: 'part', header: 'Dagdeel' }
    ]
    const weekCols = weekKeys.value.map((wk) => ({ id: wk, header: wk }))
    return [...base, ...weekCols]
  })

  const rows = computed<GridRow[]>(() => {
    const grid = response.value?.grid ?? {}
    const map = new Map<string, GridRow>()

    const parts = ['Ochtend', 'Dag', 'Avond']

    for (const [weekId, families] of Object.entries(grid)) {
      for (const [family, byPart] of Object.entries(families)) {
        for (const part of parts) {
          const key = `${family}|${part}`
          let row = map.get(key)
          if (!row) {
            row = { id: key, family, part, cells: {} }
            map.set(key, row)
          }
          const cell = byPart[part] as FamilyDaypartCapacity | undefined
          row.cells[weekId] = cell ?? null
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.family === b.family) return a.part.localeCompare(b.part)
      return a.family.localeCompare(b.family)
    })
  })

  const metaText = computed(() => {
    if (!response.value) return ''
    const { horizon_start, horizon_end } = response.value
    return `Horizon: ${horizon_start} - ${horizon_end}`
  })

  function formatCell(cell: GridCell): string {
    if (!cell || cell.required === 0) return ''
    return `${cell.assigned}/${cell.required}`
  }

  function cellClass(cell: GridCell): string {
    if (!cell || cell.required === 0) {
      return 'text-gray-400'
    }
    if (cell.shortfall > 0) {
      return 'text-red-600 font-semibold'
    }
    return 'text-emerald-700'
  }

  async function runSimulation(): Promise<void> {
    loading.value = true
    try {
      const query: Record<string, string> = {}
      if (startDate.value) {
        query.start = startDate.value
      }
      const result = await $api<CapacitySimulationResponse>(
        '/admin/capacity/visits/families',
        { method: 'GET', query }
      )
      response.value = result
    } catch {
      toast.add({ title: 'Kon capaciteitssimulatie niet laden', color: 'error' })
    } finally {
      loading.value = false
    }
  }
</script>
