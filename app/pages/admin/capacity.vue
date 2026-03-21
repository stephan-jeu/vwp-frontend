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
            <UPopover v-model:open="quotePopoverOpen" :ui="{ content: 'w-80' }">
              <UButton
                variant="outline"
                color="neutral"
                trailing-icon="i-heroicons-chevron-down"
              >
                {{ quoteButtonLabel }}
              </UButton>

              <template #content>
                <div class="p-2 space-y-2">
                  <!-- Search -->
                  <UInput
                    v-model="quoteSearch"
                    placeholder="Zoeken..."
                    icon="i-heroicons-magnifying-glass"
                    size="sm"
                    autofocus
                  />
                  <!-- Select all / deselect all -->
                  <div class="flex gap-2">
                    <UButton size="xs" variant="ghost" color="primary" @click="selectAllQuoteProjects">Alles selecteren</UButton>
                    <UButton size="xs" variant="ghost" color="neutral" @click="deselectAllQuoteProjects">Wis selectie</UButton>
                  </div>
                  <!-- Checkbox list -->
                  <div class="max-h-60 overflow-y-auto space-y-1 border-t border-gray-100 dark:border-gray-700 pt-2">
                    <label
                      v-for="option in filteredQuoteOptions"
                      :key="option.value"
                      class="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    >
                      <UCheckbox
                        :model-value="isQuoteProjectSelected(option.value)"
                        @update:model-value="toggleQuoteProject(option)"
                      />
                      <span>{{ option.label }}</span>
                    </label>
                    <p v-if="filteredQuoteOptions.length === 0" class="text-xs text-gray-400 px-2 py-1">Geen resultaten</p>
                  </div>
                  <!-- Apply button -->
                  <div class="border-t border-gray-100 dark:border-gray-700 pt-2">
                    <UButton size="sm" color="primary" class="w-full justify-center" @click="applyAndClosePopover">Toepassen</UButton>
                  </div>
                </div>
              </template>
            </UPopover>
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
        <!-- Simulatiemodus: toon resultaat van de simulatie (geen volledige bezoekkaarten) -->
        <template v-if="simulateWithQuotes">
          <div v-if="loading" class="text-sm text-gray-500">
            Simulatie wordt geladen...
          </div>
          <div v-else-if="simulatedUnschedulable.length === 0" class="text-sm text-gray-500">
            Geen niet-inplanbare bezoeken gevonden in de simulatie.
          </div>
          <div v-else class="space-y-4">
            <p class="text-sm text-amber-700 dark:text-amber-400">
              Simulatieresultaat: <strong>{{ simulatedUnschedulable.length }} bezoeken</strong> kunnen niet worden ingepland als offerteprojecten worden meegenomen.
            </p>
            <div class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                    <th class="text-left px-3 py-2 font-medium">Einddatum</th>
                    <th class="text-left px-3 py-2 font-medium">Familie</th>
                    <th class="text-left px-3 py-2 font-medium">Dagdeel</th>
                    <th class="text-left px-3 py-2 font-medium">Project</th>
                    <th class="text-left px-3 py-2 font-medium">Adres</th>
                    <th class="text-left px-3 py-2 font-medium">Reden</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in simulatedUnschedulable"
                    :key="item.visit_id"
                    class="border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    @click="openVisit(item.visit_id)"
                  >
                    <td class="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{{ item.to_date ? formatDateShort(item.to_date) : '—' }}</td>
                    <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ item.family ?? '—' }}</td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">{{ item.part_of_day ?? '—' }}</td>
                    <td class="px-3 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">{{ item.project_code ?? '—' }}</td>
                    <td class="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{{ item.cluster_address ?? '—' }}</td>
                    <td class="px-3 py-2 text-amber-700 dark:text-amber-400 text-xs">{{ item.reason_nl }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Normale modus: bezoeken uit de database met volledige kaarten -->
        <template v-else>
          <div v-if="notPlannableVisitsLoading" class="text-sm text-gray-500">
            Bezoeken worden geladen...
          </div>
          <div v-else-if="notPlannableVisits.length === 0" class="text-sm text-gray-500">
            Geen bezoeken gevonden.
          </div>
          <div v-else class="space-y-6">
            <!-- Summary table grouped by end date -->
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
                Overzicht per bezoek einddatum
                <span class="ml-1 font-normal text-red-600 dark:text-red-400">({{ notPlannableVisits.length }} bezoeken niet inplanbaar)</span>
              </p>
              <div class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                      <th class="text-left px-3 py-2 font-medium">Bezoek einddatum</th>
                      <th class="text-left px-3 py-2 font-medium">Type</th>
                      <th class="text-left px-3 py-2 font-medium">Familie</th>
                      <th class="text-left px-3 py-2 font-medium">Dagdeel</th>
                      <th class="text-right px-3 py-2 font-medium">Aantal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in notPlannableSummary"
                      :key="`${row.dateKey}|${row.functionLabel}|${row.speciesLabel}|${row.partLabel}`"
                      class="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td class="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{{ row.dateLabel }}</td>
                      <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ row.functionLabel }}</td>
                      <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ row.speciesLabel }}</td>
                      <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ row.partLabel }}</td>
                      <td class="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">{{ row.count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Individual visit cards -->
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Individuele bezoeken</p>
              <div class="space-y-4">
                <div v-for="visit in notPlannableVisits" :key="visit.id">
                  <VisitPreviewCard
                    :visit="visit"
                    @open="openVisit(visit.id)"
                  />
                  <p v-if="planningReasons[String(visit.id)]" class="mt-1 text-xs text-amber-700 dark:text-amber-400 px-1">
                    {{ planningReasons[String(visit.id)] }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else-if="viewMode === 'deadline'">
        <div v-if="!response" class="text-sm text-gray-500">
          Nog geen resultaten. Klik op Bereken om de capaciteit in te zien.
        </div>
        <div v-else-if="deadlineSummary.length === 0" class="text-sm text-gray-500">
          Geen bezoeken gevonden.
        </div>
        <div v-else class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <th class="text-left px-3 py-2 font-medium">Familie</th>
                <th class="text-left px-3 py-2 font-medium">Dagdeel</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">Einddatum</th>
                <th class="text-right px-3 py-2 font-medium">Gepland</th>
                <th class="text-right px-3 py-2 font-medium">Voorlopig</th>
                <th class="text-right px-3 py-2 font-medium whitespace-nowrap">Niet ingepland</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in deadlineSummary"
                :key="`${row.family}|${row.part_of_day}|${row.deadline}`"
                class="border-t border-gray-100 dark:border-gray-700"
              >
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ row.family }}</td>
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">{{ row.part_of_day }}</td>
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{{ row.deadline ? formatDateShort(row.deadline) : '—' }}</td>
                <td class="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{{ row.planned }}</td>
                <td class="px-3 py-2 text-right text-amber-600 dark:text-amber-400">{{ row.provisional }}</td>
                <td class="px-3 py-2 text-right font-semibold" :class="row.not_scheduled > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'">{{ row.not_scheduled }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="!hasData" class="text-sm text-gray-500">
        Nog geen resultaten. Klik op Herberekenen om de capaciteit in te zien.
      </div>

      <div v-else class="my-3">
        <!-- Week view legend -->
        <div class="text-xs mb-2 flex items-center gap-2">
          <span class="font-medium">Legenda: vrije capaciteit (ingepland).</span>
          <span class="text-red-600">Rood = weinig of geen ruimte over</span>
          <UPopover :ui="{ content: 'w-80' }">
            <UButton icon="i-heroicons-question-mark-circle" size="xs" color="neutral" variant="ghost" class="p-0" />
            <template #content>
              <div class="p-3 text-xs space-y-2 text-gray-700 dark:text-gray-300">
                <p class="font-semibold text-sm">Uitleg capaciteitsgrid</p>
                <p>Elke cel toont de capaciteit voor een specifieke categorie (soortgroep + dagdeel) in een week:</p>
                <ul class="space-y-1 list-none">
                  <li><span class="font-medium">Vrije capaciteit</span> — het aantal slots dat nog beschikbaar is voor nieuwe inplanningen.</li>
                  <li><span class="font-medium">Ingepland</span> — het aantal slots dat al aan bezoeken is toegewezen.</li>
                </ul>
                <p><span class="text-red-600 font-medium">Rood</span> betekent dat er weinig of geen ruimte meer over is: minder dan 20% van de capaciteit is nog vrij, of de vraag overstijgt wat beschikbaar is.</p>
              </div>
            </template>
          </UPopover>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 overflow-x-auto">
          <UTable :key="tableKey" :columns="columns" :data="rows" class="max-h-[600px]" sticky :column-pinning="{ left: ['family'] }">
             <!-- Custom Cell Rendering -->

            <template #family-cell="{ row }">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap" :class="{ 'font-bold': isRowTotal(row) }">
                {{ getFamily(row) }}<span v-if="getPart(row)" class="text-xs text-gray-500 dark:text-gray-400 font-normal"> – {{ getPart(row) }}</span>
              </span>
            </template>

            <!-- Dynamic Week Column Headers -->
            <template
              v-for="week in activeWeekKeys"
              :key="`hdr-${week}`"
              #[`${week}-header`]
            >
              <div class="text-center leading-tight">
                <div>{{ getWeekColumnLabel(week) }}</div>
                <div v-if="weekToMondayLabel(week)" class="text-[10px] text-gray-400 font-normal">{{ weekToMondayLabel(week) }}</div>
              </div>
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

  type UnschedulableVisitInfo = {
    visit_id: number
    reason_nl: string
    reason_code: string
    project_code?: string | null
    cluster_address?: string | null
    to_date?: string | null
    part_of_day?: string | null
    family?: string | null
  }

  type DeadlineSummaryRow = {
    family: string
    part_of_day: string
    deadline: string | null
    planned: number
    provisional: number
    not_scheduled: number
  }

  type CapacitySimulationResponse = {
    horizon_start: string
    horizon_end: string
    created_at?: string | null
    updated_at?: string | null
    grid: Record<string, Record<string, Record<string, FamilyDaypartCapacity>>>
    week_view?: WeekViewData | null
    unschedulable_visits?: UnschedulableVisitInfo[]
    deadline_summary?: DeadlineSummaryRow[]
  }

  type SeasonPlannerStatusResponse = {
    last_run_at: string | null
  }

  type InputMenuItem = {
    label: string
    value: number
  }

  const quoteProjectOptions = ref<InputMenuItem[]>([])
  const selectedQuoteProjects = ref<InputMenuItem[]>([])
  const simulateWithQuotes = computed(() => selectedQuoteProjects.value.length > 0)

  // Popover state
  const quotePopoverOpen = ref(false)
  const quoteSearch = ref('')

  const filteredQuoteOptions = computed(() => {
    const q = quoteSearch.value.toLowerCase()
    if (!q) return quoteProjectOptions.value
    return quoteProjectOptions.value.filter(o => o.label.toLowerCase().includes(q))
  })

  const quoteButtonLabel = computed(() => {
    const n = selectedQuoteProjects.value.length
    if (n === 0) return 'Offerte projecten'
    return `${n} offerte project${n === 1 ? '' : 'en'}`
  })

  function isQuoteProjectSelected(id: number): boolean {
    return selectedQuoteProjects.value.some(p => p.value === id)
  }

  function toggleQuoteProject(option: InputMenuItem): void {
    if (isQuoteProjectSelected(option.value)) {
      selectedQuoteProjects.value = selectedQuoteProjects.value.filter(p => p.value !== option.value)
    } else {
      selectedQuoteProjects.value = [...selectedQuoteProjects.value, option]
    }
  }

  function selectAllQuoteProjects(): void {
    selectedQuoteProjects.value = [...quoteProjectOptions.value]
  }

  function deselectAllQuoteProjects(): void {
    selectedQuoteProjects.value = []
  }

  function applyAndClosePopover(): void {
    quotePopoverOpen.value = false
    quoteSearch.value = ''
    void loadCapacity()
    void loadNotPlannableVisits()
  }

  const viewMode = ref<ViewMode>('week')

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

  type CompactSpecies = { id: number; name: string; abbreviation?: string | null; family_name?: string | null }

  type UserName = { id: number; full_name: string | null }

  type VisitCardRow = {
    id: number
    project_code: string
    project_location: string
    cluster_number: string
    cluster_address: string
    status: VisitStatusCode
    planned_week: number | null
    planned_date: string | null
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
    vog: boolean
    hub: boolean
    dvp: boolean
    sleutel: boolean
    priority: boolean
    visit_code: string | null
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
          const spare = c.spare ?? 0
          const supply = spare + (c.planned ?? 0)
          const isRed = supply > 0 && spare / supply <= 0.20 && (spare > 0 || (c.shortage ?? 0) > 2)
          if (isRed) {
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
             if (a.startsWith('Totalen') && !b.startsWith('Totalen')) return -1
             if (b.startsWith('Totalen') && !a.startsWith('Totalen')) return 1
             if (a.startsWith('Totalen') && b.startsWith('Totalen')) return a.localeCompare(b)
             return a.localeCompare(b)
         })

         for (const label of sortedLabels) {
             const rowData = wv.rows[label] ?? {}
             const isTotal = label.startsWith('Totalen')

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
  const planningReasons = ref<Record<string, string>>({})



  const hasData = computed(() => {
     if (viewMode.value === 'not_plannable') {
         return notPlannableVisits.value.length > 0
     }
     if (!response.value) return false
     return !!response.value.week_view
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

  type NotPlannableSummaryRow = {
    dateKey: string
    dateLabel: string
    functionLabel: string
    speciesLabel: string
    partLabel: string
    count: number
  }

  function formatDateShort(isoDate: string): string {
    const date = new Date(isoDate + 'T00:00:00Z')
    return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
  }

  const notPlannableSummary = computed<NotPlannableSummaryRow[]>(() => {
    const visits = notPlannableVisits.value
    if (!visits.length) return []

    const map = new Map<string, NotPlannableSummaryRow>()
    for (const visit of visits) {
      if (!visit.to_date) continue
      const dateKey = visit.to_date
      const dateLabel = formatDateShort(visit.to_date)
      const functionLabel = visit.functions.length
        ? visit.functions.map(f => f.name).join(' / ')
        : 'Onbekend'
      const familyNames = [...new Set(visit.species.map(s => s.family_name).filter(Boolean))]
      const speciesLabel = familyNames.length
        ? familyNames.join(' / ')
        : '–'
      const partLabel = visit.part_of_day ?? '–'
      const key = `${dateKey}|${functionLabel}|${speciesLabel}|${partLabel}`
      if (!map.has(key)) {
        map.set(key, { dateKey, dateLabel, functionLabel, speciesLabel, partLabel, count: 0 })
      }
      map.get(key)!.count++
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey)
      if (a.functionLabel !== b.functionLabel) return a.functionLabel.localeCompare(b.functionLabel)
      return a.partLabel.localeCompare(b.partLabel)
    })
  })

  const simulatedUnschedulable = computed<UnschedulableVisitInfo[]>(() => {
    if (!simulateWithQuotes.value) return []
    return response.value?.unschedulable_visits ?? []
  })

  const deadlineSummary = computed<DeadlineSummaryRow[]>(() => {
    return response.value?.deadline_summary ?? []
  })

  async function loadNotPlannableVisits(): Promise<void> {
    notPlannableVisitsLoading.value = true
    try {
      const [result, reasons] = await Promise.all([
        $api<VisitListResponse>('/visits', {
          query: { page: 1, page_size: 200, unplanned_only: true }
        }),
        $api<Record<string, string>>('/admin/capacity/planning-reasons').catch(() => ({})),
      ])

      planningReasons.value = reasons

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
    if (Number.isNaN(d.getTime())) return ''

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
        const relevantWeeks = weeks.filter((week) => {
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

  function getWeekColumnLabel(wk: string): string {
    if (viewMode.value === 'deadline') {
      if (wk === 'No Deadline') return 'Geen deadline'
      const [y, m, d] = wk.split('-')
      if (y && m && d && d.length === 2 && m.length === 2) return `${d}-${m}`
      return wk
    } else {
      const [, weekNum] = wk.split('-W')
      if (weekNum) return `W${weekNum}`
      return wk
    }
  }

  function isoWeekMonday(year: number, week: number): Date {
    // Jan 4 is always in ISO week 1
    const jan4 = new Date(year, 0, 4)
    const dow = jan4.getDay() || 7 // Sun=0 → 7
    const week1Monday = new Date(jan4)
    week1Monday.setDate(jan4.getDate() - (dow - 1))
    const result = new Date(week1Monday)
    result.setDate(week1Monday.getDate() + (week - 1) * 7)
    return result
  }

  function weekToMondayLabel(wk: string): string {
    const [yearStr, weekStr] = wk.split('-W')
    if (!yearStr || !weekStr) return ''
    const year = parseInt(yearStr)
    const week = parseInt(weekStr)
    if (isNaN(year) || isNaN(week)) return ''
    const monday = isoWeekMonday(year, week)
    return `${monday.getDate()}-${monday.getMonth() + 1}`
  }

  const columns = computed<TableColumn[]>(() => {
    const base: TableColumn[] = [
      { accessorKey: 'family', header: '' }
    ]
    const weekCols = activeWeekKeys.value.map((wk) => {
      return { accessorKey: wk, header: getWeekColumnLabel(wk) } satisfies TableColumn
    })
    return [...base, ...weekCols]
  })

  async function loadQuoteProjects(): Promise<void> {
    try {
      type ProjectRead = { id: number; code: string; location: string; quote: boolean }
      const projects = await $api<ProjectRead[]>('/projects')
      quoteProjectOptions.value = projects
        .filter(p => p.quote)
        .map(p => ({ label: `${p.code} — ${p.location}`, value: p.id }))
    } catch {
      // Non-critical, ignore
    }
  }

  async function loadCapacity(): Promise<void> {
    loading.value = true
    try {
      const selectedIds = selectedQuoteProjects.value.map(p => p.value)
      const query = selectedIds.length > 0
        ? { quote_project_ids: selectedIds, simulate: true }
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
          const selectedIds = selectedQuoteProjects.value.map(p => p.value)
          const query = selectedIds.length > 0
            ? { quote_project_ids: selectedIds, simulate: true }
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
     void loadQuoteProjects()
     void loadCapacity()
     void loadNotPlannableVisits()
  })

</script>
