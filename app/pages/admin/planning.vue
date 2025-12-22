<template>
  <div>
    <UPageHeader title="Planning" />

    <UCard class="mt-4">
      <div class="flex flex-col gap-4">
        <div class="flex items-end gap-3">
          <UInput
            v-model.number="week"
            type="number"
            :min="1"
            :max="53"
            label="Week (ISO)"
            class="w-32"
          />
          <UButton
            icon="i-heroicons-sparkles"
            color="primary"
            variant="solid"
            :loading="loading"
            @click="runPlanning"
          >
            Genereer planning
          </UButton>
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="soft"
            :loading="clearing"
            @click="clearResearchers"
          >
            Verwijder planning
          </UButton>
          <div v-if="weekLabel" class="ml-auto text-xs text-gray-500">
            {{ weekLabel }}
          </div>
        </div>

        <div v-if="loading" class="text-sm text-gray-500">Bezoeken worden geladen…</div>

        <div v-else>
          <div class="mb-3">
            <UTabs v-model="selectedWeek" :items="weekTabs" />
          </div>

          <!-- Capacity Section -->
          <div
            v-if="capacityData.researchers.length > 0"
            class="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              @click="availabilityCollapsed = !availabilityCollapsed"
            >
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-200">
                <span class="font-semibold text-gray-900 dark:text-white">Nog beschikbaar:</span>
                <span>Avond <span :class="{'text-red-600 font-bold': capacityData.totals.avond < 0}">{{ capacityData.totals.avond }}</span></span>
                <span>Ochtend <span :class="{'text-red-600 font-bold': capacityData.totals.ochtend < 0}">{{ capacityData.totals.ochtend }}</span></span>
                <span>Dag <span :class="{'text-red-600 font-bold': capacityData.totals.dag < 0}">{{ capacityData.totals.dag }}</span></span>
                <span>Flex <span :class="{'text-red-600 font-bold': capacityData.totals.flex < 0}">{{ capacityData.totals.flex }}</span></span>
              </div>
              <UIcon
                :name="availabilityCollapsed ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                class="w-5 h-5 text-gray-500"
              />
            </button>

            <div
              v-if="!availabilityCollapsed"
              class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800"
            >
              <div
                v-for="r in capacityData.researchers"
                :key="r.id"
                class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100 min-w-[120px]">{{ r.name }}</div>
                <div class="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                   <div :class="{'text-red-600 font-bold': r.remaining.avond < 0}">Avond: {{ r.remaining.avond }}</div>
                   <div :class="{'text-red-600 font-bold': r.remaining.ochtend < 0}">Ochtend: {{ r.remaining.ochtend }}</div>
                   <div :class="{'text-red-600 font-bold': r.remaining.dag < 0}">Dag: {{ r.remaining.dag }}</div>
                   <div :class="{'text-red-600 font-bold': r.remaining.flex < 0}">Flex: {{ r.remaining.flex }}</div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="completedVisits.length === 0 && plannedVisits.length === 0"
            class="text-sm text-gray-500"
          >
            Geen bezoeken gevonden voor deze week.
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div v-if="isCurrentWeekTab">
              <div class="flex items-baseline justify-between mb-2">
                <h3 class="text-sm font-semibold">
                  Uitgevoerde bezoeken ({{ completedVisits.length }})
                </h3>
              </div>

              <div
                v-if="completedVisits.length === 0"
                class="text-xs text-gray-500"
              >
                Geen uitgevoerde bezoeken voor deze week.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="visit in completedVisits"
                  :key="visit.id"
                  class="border rounded-md p-3 text-xs hover:bg-gray-50 cursor-pointer"
                  @click="goToDetail(visit.id)"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex-1 space-y-1">
                      <div class="flex flex-wrap gap-x-2 gap-y-1">
                        <span class="font-medium">{{ visit.project_code }}</span>
                        <span class="text-gray-600">{{ visit.project_location }}</span>
                        <span class="text-gray-500">· Cluster {{ visit.cluster_number }}</span>
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Functies:</span>
                        {{ visit.functions.map((f) => f.name).join(', ') || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Soorten:</span>
                        {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Dagdeel:</span>
                        {{ visit.part_of_day || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Onderzoekers:</span>
                        {{
                          visit.researchers
                            .map((r) => r.full_name || `Gebruiker #${r.id}`)
                            .join(', ') || '-'
                        }}
                      </div>
                    </div>
                    <UBadge
                      :label="statusLabel(visit.status)"
                      variant="subtle"
                      color="neutral"
                      class="text-[11px] text-gray-700"
                    />
                  </div>

                  <VisitActivityLog :visit-id="visit.id" />
                </div>
              </div>
            </div>

            <div>
              <div class="flex items-baseline justify-between mb-2">
                <h3 class="text-sm font-semibold">
                  Geplande bezoeken ({{ plannedVisits.length }})
                </h3>
              </div>

              <div v-if="plannedVisits.length === 0" class="text-xs text-gray-500">
                Geen geplande bezoeken voor deze week.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="visit in plannedVisits"
                  :key="visit.id"
                  class="border rounded-md p-3 text-xs hover:bg-gray-50 cursor-pointer"
                  @click="goToDetail(visit.id)"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex-1 space-y-1">
                      <div class="flex flex-wrap gap-x-2 gap-y-1">
                        <span class="font-medium">{{ visit.project_code }}</span>
                        <span class="text-gray-600">{{ visit.project_location }}</span>
                        <span class="text-gray-500">· Cluster {{ visit.cluster_number }}</span>
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Functies:</span>
                        {{ visit.functions.map((f) => f.name).join(', ') || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Soorten:</span>
                        {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Dagdeel:</span>
                        {{ visit.part_of_day || '-' }}
                      </div>
                      <div class="text-gray-700">
                        <span class="font-medium">Onderzoekers:</span>
                        {{
                          visit.researchers
                            .map((r) => r.full_name || `Gebruiker #${r.id}`)
                            .join(', ') || '-'
                        }}
                      </div>
                    </div>
                    <UBadge
                      v-if="visit.status === 'not_executed'"
                      :label="statusLabel(visit.status)"
                      variant="subtle"
                      color="neutral"
                      class="text-[11px] text-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>

</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useTestModeStore } from '~~/stores/testMode'

  definePageMeta({ middleware: 'admin' })

  const { $api } = useNuxtApp()
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

  const effectiveToday = computed<Date>(() => {
    if (testModeEnabled.value && simulatedDate.value) {
      const dt = new Date(simulatedDate.value)
      if (!Number.isNaN(dt.getTime())) return dt
    }
    return new Date()
  })
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

  type VisitListRow = {
    id: number
    project_code: string
    project_location: string
    project_google_drive_folder: string | null
    cluster_id: number
    cluster_number: number
    cluster_address: string
    status: VisitStatusCode
    function_ids: number[]
    species_ids: number[]
    functions: CompactFunction[]
    species: CompactSpecies[]
    required_researchers: number | null
    visit_nr: number | null
    planned_week: number | null
    from_date: string | null
    to_date: string | null
    duration: number | null
    min_temperature_celsius: number | null
    max_wind_force_bft: number | null
    max_precipitation: string | null
    expertise_level: string | null
    wbc: boolean
    fiets: boolean
    hub: boolean
    dvp: boolean
    sleutel: boolean
    remarks_planning: string | null
    remarks_field: string | null
    priority: boolean
    part_of_day: string | null
    start_time_text: string | null
    preferred_researcher_id: number | null
    preferred_researcher: UserName | null
    researchers: UserName[]
    advertized: boolean
    quote: boolean
  }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  type VisitStatusOption = { label: string; value: VisitStatusCode }

  const statusOptions: VisitStatusOption[] = [
    { label: 'Aangemaakt', value: 'created' },
    { label: 'Open', value: 'open' },
    { label: 'Gepland', value: 'planned' },
    { label: 'Verlopen', value: 'overdue' },
    { label: 'Gemist', value: 'missed' },
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Uitgevoerd (afwijking)', value: 'executed_with_deviation' },
    { label: 'Niet uitgevoerd', value: 'not_executed' },
    { label: 'Goedgekeurd', value: 'approved' },
    { label: 'Afgekeurd', value: 'rejected' },
    { label: 'Geannuleerd', value: 'cancelled' }
  ]

  // --- Availability / Capacity Types ---
  interface ApiAvailabilityCompact {
    week: number
    morning_days: number
    daytime_days: number
    nighttime_days: number
    flex_days: number
    // We ignore backend 'assigned_*' counts here as we calculate them dynamically 
    // based on the actual visits loaded in the planning view for accuracy.
  }
  interface ApiUserAvailability {
    id: number
    name: string
    availability: ApiAvailabilityCompact[]
  }
  interface ApiAvailabilityListResponse {
    users: ApiUserAvailability[]
  }

  interface ResearcherCapacity {
    id: number
    name: string
    remaining: {
      ochtend: number
      dag: number
      avond: number
      flex: number
    }
  }

  const completedStatusValues: VisitStatusCode[] = [
    'executed',
    'executed_with_deviation',
    'approved',
    'rejected'
  ]

  const plannedStatusValues: VisitStatusCode[] = ['planned', 'not_executed']

  const loading = ref(false)
  const clearing = ref(false)
  const currentWeekNumber = computed<number>(() => currentIsoWeek(effectiveToday.value))
  const week = ref<number>(currentWeekNumber.value)
  const visits = ref<VisitListRow[]>([])
  
  // Availability data
  const rawAvailability = ref<ApiUserAvailability[]>([])
  const availabilityCollapsed = ref(true)

  type WeekTab = { label: string; value: string; week: number }
  const selectedWeek = ref<string>('current')

  function currentIsoWeek(baseDate: Date): number {
    const d = new Date(baseDate)
    const dayNr = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dayNr + 3)
    const firstThursday = new Date(d.getFullYear(), 0, 4)
    const weekNumber =
      1 +
      Math.round(
        ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) /
          7
      )
    return Math.max(1, Math.min(53, weekNumber))
  }

  function isoWeekRange(weekNumber: number | null): { start: Date; end: Date } | null {
    if (weekNumber == null || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53)
      return null

    const now = effectiveToday.value
    const year = now.getFullYear()
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
    const dow = simple.getDay() || 7
    const monday = new Date(simple)
    monday.setDate(simple.getDate() - (dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return { start: monday, end: sunday }
  }

  const weekRange = computed(() => isoWeekRange(activeWeekNumber.value))

  const weekLabel = computed(() => {
    if (!weekRange.value) return ''

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(weekRange.value.start)
    const end = formatter.format(weekRange.value.end)
    return `Ma-zo: ${start} - ${end}`
  })

  function getIsoWeekNumber(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const diff = tmp.getTime() - yearStart.getTime()
    return Math.ceil((diff / 86400000 + 1) / 7)
  }

  function visitWeekNumber(visit: VisitListRow): number {
    if (visit.planned_week && Number.isInteger(visit.planned_week)) {
      return visit.planned_week
    }

    if (visit.from_date) {
      const dt = new Date(visit.from_date)
      if (!Number.isNaN(dt.getTime())) {
        return getIsoWeekNumber(dt)
      }
    }

    return currentWeekNumber.value
  }

  function weekRangeLabel(weekNumber: number): string | null {
    const range = isoWeekRange(weekNumber)
    if (!range) return null

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(range.start)
    const end = formatter.format(range.end)
    return `${start} - ${end}`
  }

  function statusLabel(code: VisitStatusCode): string {
    const found = statusOptions.find((s) => s.value === code)
    return found?.label ?? code
  }

  const weekTabs = computed<WeekTab[]>(() => {
    const futureWeeks = new Set<number>()

    for (const v of visits.value) {
      const hasResearchers = v.researchers && v.researchers.length > 0
      const isPlannedStatus = plannedStatusValues.includes(v.status)
      if (!hasResearchers || !isPlannedStatus) continue

      const weekNumber = visitWeekNumber(v)
      if (weekNumber > currentWeekNumber.value) {
        futureWeeks.add(weekNumber)
      }
    }

    const sortedFutureWeeks = Array.from(futureWeeks).sort((a, b) => a - b)

    const tabs: WeekTab[] = []
    tabs.push({ label: 'Deze week', value: 'current', week: currentWeekNumber.value })

    for (const w of sortedFutureWeeks) {
      const rangeLabel = weekRangeLabel(w)
      const base = `Week ${w}`
      const label = rangeLabel ? `${base} (${rangeLabel})` : base
      tabs.push({ label, value: `week-${w}`, week: w })
    }

    return tabs
  })

  const activeWeekNumber = computed<number>(() => {
    const tab = weekTabs.value.find((t) => t.value === selectedWeek.value)
    return tab?.week ?? currentWeekNumber.value
  })

  const isCurrentWeekTab = computed<boolean>(() => activeWeekNumber.value === currentWeekNumber.value)

  function isInSelectedWeek(visit: VisitListRow): boolean {
    if (!weekRange.value) return false
    if (!visit.from_date || !visit.to_date) return false

    const from = new Date(visit.from_date)
    const to = new Date(visit.to_date)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false

    return from <= weekRange.value.end && to >= weekRange.value.start
  }

  const completedVisits = computed(() =>
    visits.value.filter((v) => completedStatusValues.includes(v.status) && isInSelectedWeek(v))
  )

  const plannedVisits = computed(() =>
    visits.value.filter((v) => plannedStatusValues.includes(v.status) && isInSelectedWeek(v))
  )



  // --- Capacity Calculation ---

  const capacityData = computed<{
    researchers: ResearcherCapacity[]
    totals: { ochtend: number; dag: number; avond: number; flex: number }
  }>(() => {
    // 1. Build initial map from raw availability
    const map = new Map<number, ResearcherCapacity>()
    const targetWeek = activeWeekNumber.value
    
    for (const user of rawAvailability.value) {
      // Find the availability entry for the *active* week
      const entry = user.availability.find((a) => a.week === targetWeek)
      if (!entry) continue

      // Initialize with total capacity
      map.set(user.id, {
        id: user.id,
        name: user.name,
        remaining: {
          ochtend: entry.morning_days ?? 0,
          dag: entry.daytime_days ?? 0,
          avond: entry.nighttime_days ?? 0,
          flex: entry.flex_days ?? 0,
        },
      })
    }

    // 2. Subtract assigned visits
    // We use 'visits' and 'isInSelectedWeek' to ensure we only count what's visible/relevant
    // for this week tab.
    
    for (const v of visits.value) {
      if (['cancelled', 'rejected'].includes(v.status)) continue

      // The tab logic already filters by week for display, but let's double check logic match.
      // isInSelectedWeek uses date ranges. visitWeekNumber is more direct for planning logic.
      if (visitWeekNumber(v) !== targetWeek) continue

      const part = v.part_of_day 
      
      for (const r of v.researchers) {
         const cap = map.get(r.id)
         if (!cap) continue

         if (part === 'Ochtend' || part === 'ochtend') {
           cap.remaining.ochtend--
           if (cap.remaining.ochtend < 0 && cap.remaining.flex > 0) {
             cap.remaining.ochtend++
             cap.remaining.flex--
           }
         } else if (part === 'Dag' || part === 'dag') {
           cap.remaining.dag--
           if (cap.remaining.dag < 0 && cap.remaining.flex > 0) {
             cap.remaining.dag++
             cap.remaining.flex--
           }
         } else if (part === 'Avond' || part === 'avond' || part === 'Nacht' || part === 'nacht') {
           cap.remaining.avond--
           if (cap.remaining.avond < 0 && cap.remaining.flex > 0) {
             cap.remaining.avond++
             cap.remaining.flex--
           }
         } else {
           // No specific part -> consume Flex
           cap.remaining.flex--
         }
      }
    }

    // 3. Aggregate totals and list
    const researchers = Array.from(map.values())
      .filter((r) => r.remaining.ochtend > 0 || r.remaining.dag > 0 || r.remaining.avond > 0 || r.remaining.flex > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
    
    const totals = { ochtend: 0, dag: 0, avond: 0, flex: 0 }
    for (const r of researchers) {
      if (r.remaining.ochtend > 0) totals.ochtend += r.remaining.ochtend
      if (r.remaining.dag > 0) totals.dag += r.remaining.dag
      if (r.remaining.avond > 0) totals.avond += r.remaining.avond
      if (r.remaining.flex > 0) totals.flex += r.remaining.flex
    }

    return { researchers, totals }
  })

  async function loadAvailability(): Promise<void> {
    try {
      // Fetch for the active week tab
      const w = activeWeekNumber.value
      const response = await $api<ApiAvailabilityListResponse>('/admin/availability', {
        method: 'GET',
        query: { week_start: w, week_end: w }
      })
      rawAvailability.value = response.users
    } catch (e) {
      console.error('Failed to load availability', e)
    }
  }

  async function loadVisits(): Promise<void> {
    loading.value = true
    try {
      const statuses: VisitStatusCode[] = [...completedStatusValues, ...plannedStatusValues]
      const query: Record<string, unknown> = {
        page: 1,
        page_size: 200,
        statuses
      }
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      const response = await $api<VisitListResponse>('/visits', { query })
      visits.value = response.items
      
      // Load availability for the initial active week
      void loadAvailability()
    } finally {
      loading.value = false
    }
  }
  
  // Refetch availability when switching tabs (weeks)
  watch(activeWeekNumber, () => {
    void loadAvailability()
  })

  async function runPlanning(): Promise<void> {
    loading.value = true
    try {
      const w = week.value
      await $api(`/planning/generate`, { method: 'POST', body: { week: w } })
      await loadVisits()
    } finally {
      loading.value = false
    }
  }

  async function clearResearchers(): Promise<void> {
    clearing.value = true
    try {
      const w = week.value
      await $api(`/planning/clear`, { method: 'POST', body: { week: w } })
      await loadVisits()
    } finally {
      clearing.value = false
    }
  }

  watch(week, () => {
    // Week change only affects client-side filtering; no extra load needed.
  })

  watch(
    () => simulatedDate.value,
    () => {
      if (!testModeEnabled.value) return
      void loadVisits()
    }
  )

  onMounted(() => {
    void loadVisits()
  })

  function goToDetail(id: number): void {
    navigateTo(`/visits/${id}`)
  }
</script>

