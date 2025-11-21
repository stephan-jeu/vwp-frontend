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

      <div v-else class="my-3">
        <div class="text-xs">
          <span class="font-medium">Legenda: niet-inplanbaar (inplanbaar).</span>
          <span class="ml-1">Kolommen zijn bezoek eind datums.</span>
          <span class="ml-1 text-red-600">Rood = tekort (niet inplanbaar)</span>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
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
    spare: number
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
    const weeks = new Set<string>()
    
    // Grid is Family -> Part -> DeadlineWeek -> Cell
    for (const parts of Object.values(grid)) {
      for (const deadlines of Object.values(parts)) {
        for (const week of Object.keys(deadlines)) {
          weeks.add(week)
        }
      }
    }
    return Array.from(weeks).sort()
  })

  const columns = computed(() => {
    const base = [
      { id: 'family', header: 'Soortfamilie' },
      { id: 'part', header: 'Dagdeel' }
    ]
    const weekCols = weekKeys.value.map((wk) => {
      // wk is ISO date "YYYY-MM-DD" or "No Deadline"
      if (wk === "No Deadline") return { id: wk, header: "Geen deadline" }
      
      try {
        const [y, m, d] = wk.split('-')
        if (y && m && d) {
           return { id: wk, header: `${d}/${m}` }
        }
      } catch (e) {}
      
      return { id: wk, header: wk }
    })
    return [...base, ...weekCols]
  })

  const rows = computed<GridRow[]>(() => {
    const grid = response.value?.grid ?? {}
    const result: GridRow[] = []

    // Grid is Family -> Part -> DeadlineWeek -> Cell
    for (const [family, parts] of Object.entries(grid)) {
      for (const [part, deadlines] of Object.entries(parts)) {
        const row: GridRow = {
          id: `${family}|${part}`,
          family,
          part,
          cells: {}
        }
        
        for (const [week, cell] of Object.entries(deadlines)) {
          row.cells[week] = cell
        }
        
        // Only add if there is some data
        if (Object.keys(row.cells).length > 0) {
          result.push(row)
        }
      }
    }

    return result.sort((a, b) => {
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
    // User requested: "nr of unplannable visits/nr of planned visits"
    // mapped to: shortfall / assigned
    return `${cell.shortfall} (${cell.assigned})`
  }

  function cellClass(cell: GridCell): string {
    if (!cell || cell.required === 0) {
      return 'text-gray-400'
    }
    if (cell.shortfall > 0) {
      return 'text-red-600 dark:text-red-400 font-bold'
    }
    // Green if all unplannable is 0 (meaning all planned)
    return 'text-green-800 dark:text-green-400'
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
