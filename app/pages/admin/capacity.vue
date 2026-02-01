<template>
  <div>
    <UPageHeader title="Capaciteitsplanning" />

    <UCard class="mt-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <!-- Left: Action & Info -->
        <div class="flex flex-wrap items-center gap-3">
             <UButton
                icon="i-heroicons-calculator"
                color="primary"
                variant="outline"
                :loading="loading"
                @click="recalculateSimulation"
            >
                {{ hasData ? 'Herberekenen' : 'Bereken' }}
            </UButton>
            <UCheckbox v-model="simulateWithQuotes" label="Simuleer met offerte projecten" />
            <span v-if="lastCalculatedLabel" class="text-xs text-gray-500">
                {{ lastCalculatedLabel }}
            </span>
            <span v-if="seasonPlannerLastRunLabel" class="text-xs text-gray-500">
              Laatste capaciteitsplanning: {{ seasonPlannerLastRunLabel }}
            </span>
        </div>

        <!-- Right: View Toggle -->
        <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Weergave:</span>
            <UButton
                :variant="viewMode === 'week' ? 'solid' : 'soft'"
                :color="viewMode === 'week' ? 'primary' : 'neutral'"
                size="sm"
                @click="viewMode = 'week'"
            >Per week</UButton>
             <UButton
                :variant="viewMode === 'deadline' ? 'solid' : 'soft'"
                :color="viewMode === 'deadline' ? 'primary' : 'neutral'"
                size="sm"
                @click="viewMode = 'deadline'"
            >Per bezoek einddatum</UButton>
            <UButton
                :variant="viewMode === 'not_plannable' ? 'solid' : 'soft'"
                :color="viewMode === 'not_plannable' ? 'primary' : 'neutral'"
                size="sm"
                @click="viewMode = 'not_plannable'"
            >Niet in te plannen</UButton>
        </div>
      </div>



      <div v-if="loading" class="text-sm text-gray-500">
        Capaciteitssimulatie wordt geladen...
      </div>

      <div v-else-if="viewMode === 'not_plannable'">
        <div v-if="notPlannableVisitsLoading" class="text-sm text-gray-500">
          Bezoeken worden geladen...
        </div>
        <div v-else-if="notPlannableVisits.length === 0" class="text-sm text-gray-500">
          Geen bezoeken gevonden.
        </div>
        <div v-else class="space-y-4">
          <VisitPreviewCard
            v-for="visit in notPlannableVisits"
            :key="visit.id"
            :visit="visit"
            @open="openVisit(visit.id)"
          />
        </div>
      </div>

      <div v-else-if="!hasData" class="text-sm text-gray-500">
        Nog geen resultaten. Klik op Herberekenen om de capaciteit in te zien.
      </div>

      <div v-else class="my-3">
        <!-- Legend dependent on view -->
        <div class="text-xs mb-2">
          <template v-if="viewMode === 'deadline'">
              <span class="font-medium">Legenda: niet-inplanbaar (gepland).</span>
              <span class="ml-1">Kolommen zijn bezoek eind datums.</span>
              <span class="ml-1 text-red-600">Rood = tekort</span>
          </template>
          <template v-else>
              <span class="font-medium">Legenda: vrije capaciteit (gebruikte capaciteit).</span>
              <span class="ml-1 text-red-600">Rood = weinig vrije capaciteit </span>
          </template>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 overflow-x-auto">
          <UTable :key="tableKey" :columns="columns" :data="rows" class="max-h-[600px]">
             <!-- Custom Cell Rendering -->

            <template #family-cell="{ row }">
               <span
                class="text-sm font-medium text-gray-800 dark:text-gray-100"
                :class="{ 'font-bold': isRowTotal(row) }"
               >
                {{ getFamily(row) }}
              </span>
            </template>

            <template #part-cell="{ row }">
               <span class="text-xs text-gray-700 dark:text-gray-200">
                {{ getPart(row) }}
              </span>
            </template>

            <!-- Dynamic Week Columns -->
            <template
              v-for="week in activeWeekKeys"
              :key="week"
              #[`${week}-cell`]="{ row }"
            >
              <div :class="getCellClass(row, week)" class="text-[11px] text-center px-1">
                {{ formatCell(row, week) }}
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import VisitPreviewCard from '../../components/VisitPreviewCard.vue'

  definePageMeta({ middleware: 'admin' })

  // --- Types ---

  type FamilyDaypartCapacity = {
    required: number
    assigned: number
    shortfall: number
    spare: number
  }

  type WeekResultCell = {
      spare: number
      planned: number
      shortage: number
  }

  type WeekViewData = {
      weeks: string[]
      rows: Record<string, Record<string, WeekResultCell>>
  }

  type CapacitySimulationResponse = {
    horizon_start: string
    horizon_end: string
    created_at?: string | null
    updated_at?: string | null
    grid: Record<string, Record<string, Record<string, FamilyDaypartCapacity>>>
    week_view?: WeekViewData | null
  }

  type SeasonPlannerStatusResponse = {
    last_run_at: string | null
  }

  const simulateWithQuotes = ref(false)

  // Force table re-render when structure changes significantly to avoid patch errors
  const tableKey = computed(() => {
     const modeStr = viewMode.value
     const dataTime = response.value ? response.value.horizon_start : 'no-data'
     // Just toggling viewMode or getting data should re-render
     return `${modeStr}-${dataTime}`
  })

  // Row for UTable
  type ViewMode = 'deadline' | 'week' | 'not_plannable'
  type CellValue = FamilyDaypartCapacity | WeekResultCell
  type TableColumn = { accessorKey: string; header: string; sortable?: boolean }
  type GridRow = {
    id: string
    family: string
    part: string
    isTotal?: boolean
    [key: string]: unknown
  }

  type VisitStatusCode =
    | 'created'
    | 'open'
    | 'planned'
    | 'overdue'
    | 'executed'
    | 'executed_with_deviation'
    | 'not_executed'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'missed'

  type CompactFunction = { id: number; name: string }

  type CompactSpecies = { id: number; name: string; abbreviation?: string | null }

  type UserName = { id: number; full_name: string | null }

  type VisitCardRow = {
    id: number
    project_code: string
    project_location: string
    cluster_number: number
    cluster_address: string
    status: VisitStatusCode
    planned_week: number | null
    provisional_week: number | null
    visit_nr: number | null
    from_date: string | null
    to_date: string | null
    functions: CompactFunction[]
    species: CompactSpecies[]
    researchers: UserName[]
    part_of_day: string | null
    custom_function_name: string | null
    custom_species_name: string | null
    wbc: boolean
    fiets: boolean
    hub: boolean
    dvp: boolean
    sleutel: boolean
    priority: boolean
  }

  type VisitListResponse = {
    items: VisitCardRow[]
    total: number
    page: number
    page_size: number
  }

  // Helper to safely access row data in template
  function getRowData(row: unknown): GridRow {
      if (row && typeof row === 'object' && 'original' in row) {
          const original = (row as { original?: unknown }).original
          if (original && typeof original === 'object') {
              return original as GridRow
          }
      }
      return row as GridRow
  }

  function getFamily(row: unknown): string {
      return getRowData(row).family
  }

  function getPart(row: unknown): string {
      return getRowData(row).part
  }

  function isRowTotal(row: unknown): boolean {
      return !!getRowData(row).isTotal
  }

  function isCellValue(v: unknown): v is CellValue {
      if (!v || typeof v !== 'object') return false
      return (
          ('required' in v && 'assigned' in v && 'shortfall' in v && 'spare' in v) ||
          ('spare' in v && 'planned' in v)
      )
  }

  function formatCell(rowRaw: unknown, colKey: string): string {
      const row = getRowData(rowRaw)
      const cell = row[colKey]
      if (!isCellValue(cell)) return ''

      if (viewMode.value === 'week') {
         const c = cell as WeekResultCell
         if (c.spare === 0 && c.planned === 0) return '-'
         return `${c.spare} (${c.planned})`
      } else {
         const c = cell as FamilyDaypartCapacity
         if (c.required === 0) return ''
         return `${c.shortfall} (${c.assigned})`
      }
  }

  function getCellClass(rowRaw: unknown, colKey: string): string {
      const row = getRowData(rowRaw)
      const cell = row[colKey]

      if (viewMode.value === 'week') {
          if (!isCellValue(cell)) return 'text-gray-300'
          const c = cell as WeekResultCell
          if (c.spare === 0 && c.planned === 0) return 'text-gray-300'
          const isTotal = isRowTotal(rowRaw)
          const shortageThreshold = isTotal ? 6 : 3
          const spareValue = Number(c.spare ?? 0)
          if (Number.isNaN(spareValue)) return 'text-gray-700 dark:text-gray-300'
          if (spareValue <= shortageThreshold) {
            return 'text-red-600 dark:text-red-400 font-bold'
          }
          return 'text-gray-700 dark:text-gray-300'
      } else {
          if (!isCellValue(cell)) return 'text-gray-400'
          const c = cell as FamilyDaypartCapacity
          if (c.required === 0) return 'text-gray-400'

          if (c.shortfall > 0) {
             return 'text-red-600 dark:text-red-400 font-bold'
          }
          return 'text-green-800 dark:text-green-400'
      }
  }

  const rows = computed<GridRow[]>(() => {
    if (!response.value) return []
    const result: GridRow[] = []

    if (viewMode.value === 'week') {
         const wv = response.value.week_view
         if (!wv) return []

         const sortedLabels = Object.keys(wv.rows).sort((a,b) => {
             if (a === 'Totalen') return -1
             if (b === 'Totalen') return 1
             return a.localeCompare(b)
         })

         for (const label of sortedLabels) {
             const rowData = wv.rows[label] ?? {}
             const isTotal = label === 'Totalen'

             // Calculate total planned visits for this row across all relevant weeks
             // activeWeekKeys are already filtered to existing weeks
             const weeks = activeWeekKeys.value
             let totalPlanned = 0
             for (const wk of weeks) {
                 const cell = rowData[wk]
                 if (cell) totalPlanned += cell.planned
             }

             // Hide row if 0 planned visits, unless it's the Totalen row
             if (!isTotal && totalPlanned === 0) {
                 continue
             }

             // Parse label "Family - Part"
             let family = label
             let part = ''
             const parts2 = label.split(' - ')
             if (parts2.length > 1) {
                 part = parts2.pop() ?? ''
                 family = parts2.join(' - ')
             }

             const row: GridRow = {
                 id: label,
                 family,
                 part,
                 isTotal,
                 ...rowData // Spread week data directly into row
             }
             result.push(row)
         }

    } else {
        // Deadline View
        const grid = response.value.grid ?? {}

        for (const [family, parts] of Object.entries(grid)) {
          for (const [part, deadlines] of Object.entries(parts)) {
            const row: GridRow = {
              id: `${family}|${part}`,
              family,
              part,
              // Spread deadlines
              ...deadlines
            }
            if (Object.keys(deadlines).length > 0) {
              result.push(row)
            }
          }
        }

        result.sort((a, b) => {
          if (a.family === b.family) return a.part.localeCompare(b.part)
          return a.family.localeCompare(b.family)
        })
    }

    return result
  })

  const { $api } = useNuxtApp()
  const toast = useToast()

  type ApiErrorShape = {
    data?: { detail?: unknown } | null
    response?: { _data?: { detail?: unknown } | null } | null
  }

  function errorDescription(error: unknown): string {
    const err = error as ApiErrorShape
    const detail = err?.data?.detail ?? err?.response?._data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (error instanceof Error && error.message) return error.message
    return 'Onbekende fout'
  }

  const loading = ref(false)
  const response = ref<CapacitySimulationResponse | null>(null)

  const seasonPlannerStatus = ref<SeasonPlannerStatusResponse | null>(null)

  const notPlannableVisitsLoading = ref(false)
  const notPlannableVisits = ref<VisitCardRow[]>([])

  const viewMode = ref<ViewMode>('week')



  const hasData = computed(() => {
     if (viewMode.value === 'not_plannable') {
         return notPlannableVisits.value.length > 0
     }
     if (!response.value) return false
     if (viewMode.value === 'week') {
         return !!response.value.week_view
     }
     const grid = response.value.grid
     return !!grid && Object.keys(grid).length > 0
  })

  function openVisit(visitId: number): void {
    void navigateTo(`/visits/${visitId}`)
  }

  function parseDateKey(iso: string | null): number {
    if (!iso) return Number.POSITIVE_INFINITY
    const dt = new Date(iso)
    const t = dt.getTime()
    if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
    return t
  }

  async function loadNotPlannableVisits(): Promise<void> {
    notPlannableVisitsLoading.value = true
    try {
      const result = await $api<VisitListResponse>('/visits', {
        query: { page: 1, page_size: 200, unplanned_only: true }
      })

      const filtered = (result.items ?? [])
        .filter((v) => {
          const isCustom = Boolean(v.custom_function_name || v.custom_species_name)
          if (isCustom) return false
          return v.provisional_week == null && v.planned_week == null
        })
        .sort((a, b) => {
          const startDiff = parseDateKey(a.from_date) - parseDateKey(b.from_date)
          if (startDiff !== 0) return startDiff
          const endDiff = parseDateKey(a.to_date) - parseDateKey(b.to_date)
          if (endDiff !== 0) return endDiff
          return a.project_code.localeCompare(b.project_code)
        })

      notPlannableVisits.value = filtered
    } catch (error: unknown) {
      toast.add({
        title: 'Kon bezoeken niet laden',
        description: errorDescription(error),
        color: 'error'
      })
    } finally {
      notPlannableVisitsLoading.value = false
    }
  }

  const lastCalculatedLabel = computed(() => {
    // Prefer updated_at, fallback to created_at
    const ts = response.value?.updated_at || response.value?.created_at
    if (!ts) return ''

    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''

    const day = d.getDate()
    const month = d.getMonth() + 1
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')

    return `(Laatste keer berekend op ${day}-${month} om ${h}:${m})`
  })

  const seasonPlannerLastRunLabel = computed<string | null>(() => {
    const last = seasonPlannerStatus.value?.last_run_at
    if (!last) return null
    const dt = new Date(last)
    if (Number.isNaN(dt.getTime())) return null
    return new Intl.DateTimeFormat('nl-NL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(dt)
  })

  // --- Logic for Views ---

  const activeWeekKeys = computed<string[]>(() => {
    if (!response.value) return []

    if (viewMode.value === 'week') {
        const wv = response.value.week_view
        if (!wv) return []

        // Filter weeks to only those that have data in at least one row
        const weeks = wv.weeks ?? []
        const relevantWeeks = weeks.filter(week => {
             // Check all rows for this week
             for (const row of Object.values(wv.rows)) {
                 const cell = row[week]
                 if (cell && (cell.spare !== 0 || cell.planned !== 0)) {
                     return true
                 }
             }
             return false
        })

        return relevantWeeks
    } else {
        // Deadline View logic
        const grid = response.value.grid ?? {}
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
    }
  })

  const columns = computed<TableColumn[]>(() => {
    const base: TableColumn[] = [
      { accessorKey: 'family', header: '', sortable: true },
      { accessorKey: 'part', header: '' }
    ]
    const weekCols = activeWeekKeys.value.map((wk) => {
      let label = wk

      if (viewMode.value === 'deadline') {
           if (wk === "No Deadline") label = "Geen deadline"
           else {
               const [y, m, d] = wk.split('-')
               if (y && m && d && d.length === 2 && m.length === 2) {
                   label = `${d}-${m}`
               }
           }
      } else {
           // Week View: YYYY-WXX -> WXX
           const parts = wk.split('-W')
           if (parts.length === 2) {
               label = `W${parts[1]}`
           }
      }

      // Use accessorKey for data binding
      return { accessorKey: wk, header: label } satisfies TableColumn
    })
    return [...base, ...weekCols]
  })

  async function loadCapacity(): Promise<void> {
    loading.value = true
    try {
      const query = simulateWithQuotes.value
        ? { include_quotes: true, simulate: true }
        : undefined
      const result = await $api<CapacitySimulationResponse>(
        '/admin/capacity/visits/families',
        { method: 'GET', query }
      )
      response.value = result
      void loadSeasonPlannerStatus()
    } catch (error: unknown) {
      toast.add({
        title: 'Kon capaciteitssimulatie niet laden',
        description: errorDescription(error),
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  async function loadSeasonPlannerStatus(): Promise<void> {
    try {
      seasonPlannerStatus.value = await $api<SeasonPlannerStatusResponse>(
        '/admin/season-planner/status'
      )
    } catch {
      seasonPlannerStatus.value = null
    }
  }

  async function recalculateSimulation(): Promise<void> {
      toast.add({ title: 'De capaciteit wordt opnieuw berekend, dit kan even duren.', color: 'info' })

      loading.value = true
      try {
          const query = simulateWithQuotes.value
            ? { include_quotes: true, simulate: true }
            : undefined
          // Trigger POST
          const result = await $api<CapacitySimulationResponse>(
            '/admin/capacity/visits/families',
            { method: 'POST', query }
          )
          response.value = result
          void loadSeasonPlannerStatus()

          // Keep the "Niet in te plannen" view in sync as well.
          await loadNotPlannableVisits()
          toast.add({ title: 'Simulatie opnieuw berekend', color: 'success' })
      } catch (error: unknown) {
          toast.add({
            title: 'Fout bij herberekenen',
            description: errorDescription(error),
            color: 'error'
          })
      } finally {
          loading.value = false
      }
  }

  onMounted(() => {
     void loadCapacity()
     void loadNotPlannableVisits()
  })

  watch(simulateWithQuotes, () => {
    void loadCapacity()
  })
</script>
