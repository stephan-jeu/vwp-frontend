<template>
  <div>
    <UPageHeader title="Mijn bezoeken" />

    <UTabs :items="tabs" class="mt-4">
      <template #visits>
        <UCard>
          <div class="flex flex-col gap-3">
            <div v-if="pending" class="text-sm text-gray-700 dark:text-gray-300">
              Bezoeken worden geladen…
            </div>
            <div v-else-if="error" class="text-sm text-red-500">Kon bezoeken niet laden.</div>
            <div v-else class="flex flex-col gap-3">
              <div class="w-64">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Bekijk bezoeken voor week
                </label>
                <USelectMenu
                  v-model="selectedWeekTab"
                  :items="weekTabs"
                  option-attribute="label"
                  placeholder="Selecteer week"
                  class="w-sm"
                />
              </div>

              <div
                v-if="visitsForActiveWeek.length === 0"
                class="text-sm text-gray-700 dark:text-gray-300"
              >
                Er zijn geen bezoeken voor deze week.
              </div>

              <div v-else class="flex flex-col gap-3">
                <UCard
                  v-for="visit in visitsForActiveWeek"
                  :key="visit.id"
                  class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  @click="goToDetail(visit.id)"
                >
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-sm text-gray-700 dark:text-gray-300">
                          {{ visit.project_code }} · {{ visit.project_location }}
                        </div>
                        <div class="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                          Cluster {{ visit.cluster_number }} · {{ visit.cluster_address }}
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-1">
                        <UBadge :color="statusBadgeColor(visit.status)" variant="solid">
                          {{ statusLabel(visit.status) }}
                        </UBadge>
                        <UBadge v-if="weekBadge(visit)" color="warning">
                          {{ weekBadge(visit) }}
                        </UBadge>
                      </div>
                    </div>
                    <div
                      v-if="visit.part_of_day"
                      class="mt-2 flex flex-wrap gap-1 text-[12px] text-gray-700 dark:text-gray-300"
                    >
                      <span>Dagdeel: </span><span>{{ visit.part_of_day }}</span>
                    </div>
                    <div
                      v-if="visit.start_time_text"
                      class="mt-1 flex flex-wrap gap-1 text-[12px] text-gray-700 dark:text-gray-300"
                    >
                      <span v-if="visit.start_time_text">Start: {{ visit.start_time_text }}</span>
                      <span v-else
                        >Periode: {{ formatDate(visit.from_date) }} –
                        {{ formatDate(visit.to_date) }}</span
                      >
                    </div>

                    <div class="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                      <span class="font-medium mr-1">Functies:</span>
                      <span>{{
                          visit.functions.length
                          ? visit.functions.map((f) => f.name).join(', ')
                          : visit.custom_function_name || '-'
                      }}</span>
                    </div>
                    <div class="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                      <span class="font-medium mr-1">Soorten:</span>
                      <span>
                        {{
                            visit.species.length
                            ? visit.species.map((s) => s.abbreviation || s.name).join(', ')
                            : visit.custom_species_name || '-'
                        }}
                      </span>
                    </div>

                    <div class="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                      <span class="font-medium mr-1">Onderzoekers:</span>
                      <span>
                        {{
                          visit.researchers
                            .map((r) => r.full_name || `Gebruiker #${r.id}`)
                            .join(', ') || '-'
                        }}
                      </span>
                    </div>

                    <div
                      v-if="
                        visit.wbc ||
                        visit.fiets ||
                        visit.hub ||
                        visit.dvp ||
                        visit.sleutel ||
                        visit.priority
                      "
                      class="mt-2 text-sm text-gray-700 dark:text-gray-300 font-medium"
                    >
                      Bijzonderheden:
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <UBadge v-if="visit.wbc" class="bg-amber-600 mr-1">WBC</UBadge>
                      <UBadge v-if="visit.fiets" class="bg-amber-600 mr-1">Fiets</UBadge>
                      <UBadge v-if="visit.hub" class="bg-amber-600 mr-1">HUB</UBadge>
                      <UBadge v-if="visit.dvp" class="bg-amber-600 mr-1">DVP</UBadge>
                      <UBadge v-if="visit.sleutel" class="bg-amber-600 mr-1">Sleutel</UBadge>
                      <UBadge v-if="visit.priority" class="bg-amber-600 mr-1"> Prioriteit </UBadge>
                    </div>
                  </div>
                </UCard>
              </div>
            </div>
          </div>
        </UCard>
      </template>

      <template #availability>
        <UCard>
          <div v-if="featureStrictAvailability" class="space-y-4">
            <h3 class="font-semibold text-lg">Mijn beschikbaarheidspatronen</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Beheer hier je beschikbaarheidsperioden.
            </p>
            <AvailabilityPatternManager v-if="identity?.id" :user-id="identity.id" />
          </div>
          <div v-else>
            <div v-if="avPending" class="text-sm text-gray-700 dark:text-gray-300">
              Beschikbaarheid laden…
            </div>
            <div v-else-if="avError" class="text-sm text-red-500">
              Kon beschikbaarheid niet laden.
            </div>
            <div v-else class="flex flex-col gap-4">
              <div
                v-if="availabilityList.length === 0"
                class="text-sm text-gray-700 dark:text-gray-300"
              >
                Geen beschikbaarheid opgegeven.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="item in availabilityList"
                  :key="item.week"
                  class="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0"
                >
                  <div class="font-semibold text-gray-900 dark:text-white mb-2">
                    {{ formatAvWeekLabel(item.week) }}
                  </div>
                  <div class="flex flex-wrap gap-4 text-sm">
                    <div
                      v-for="part in item.parts"
                      :key="part.label"
                      class="flex items-center gap-2"
                    >
                      <span class="text-gray-600 dark:text-gray-400">{{ part.label }}:</span>
                      <span class="font-medium text-gray-900 dark:text-white">{{ part.value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UTabs>  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'
  import { useTestModeStore } from '~~/stores/testMode'

  definePageMeta({ layout: 'default' })

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
    planning_locked: boolean
    researchers: UserName[]
    custom_function_name: string | null
    custom_species_name: string | null
    visit_code: string | null
  }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  const { $api } = useNuxtApp()

  const auth = useAuthStore()
  const { identity } = storeToRefs(auth)

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

  const featureStrictAvailability = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureStrictAvailability
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

  const { data, pending, error, refresh } = useAsyncData('my-visits', async () => {
    await auth.ensureLoaded()

    const w = activeWeekNumber.value
    const query: Record<string, unknown> = {
      page: 1,
      page_size: 200,
      week: w
    }

    if (testModeEnabled.value && simulatedDate.value) {
      query.simulated_today = simulatedDate.value
    }

    const response = await $api<VisitListResponse>('/visits', { query })
    return response
  })

  const visits = computed<VisitListRow[]>(() => data.value?.items ?? [])

  type BadgeColor = 'primary' | 'warning' | 'success' | 'error' | 'neutral' | 'secondary' | 'info'

  const statusLabelMap: Record<VisitStatusCode, string> = {
    created: 'Aangemaakt',
    open: 'Open',
    planned: 'Gepland',
    overdue: 'Verlopen',
    executed: 'Uitgevoerd',
    executed_with_deviation: 'Uitgevoerd (afwijking)',
    not_executed: 'Niet uitgevoerd',
    approved: 'Goedgekeurd',
    rejected: 'Afgekeurd',
    cancelled: 'Geannuleerd',
    missed: 'Gemist'
  }

  const statusBadgeColorMap: Partial<Record<VisitStatusCode, BadgeColor>> = {
    planned: 'primary',
    overdue: 'warning',
    executed: 'success',
    executed_with_deviation: 'success',
    not_executed: 'warning',
    approved: 'success',
    rejected: 'error',
    cancelled: 'neutral',
    missed: 'warning'
  }

  function statusLabel(code: VisitStatusCode): string {
    return statusLabelMap[code] ?? code
  }

  function statusBadgeColor(code: VisitStatusCode): BadgeColor {
    return statusBadgeColorMap[code] ?? 'neutral'
  }

  const filteredVisits = computed<VisitListRow[]>(() => {
    const currentId = identity.value?.id
    if (!currentId) return []
    return visits.value.filter((v) => v.researchers.some((r) => r.id === currentId))
  })

  function isoWeekRange(week: number | null): { start: Date; end: Date } | null {
    if (week == null || !Number.isInteger(week) || week < 1 || week > 53) return null

    const base = effectiveToday.value
    const year = base.getFullYear()
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay() || 7
    const monday = new Date(simple)
    monday.setDate(simple.getDate() - (dow - 1))
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    return { start: monday, end: friday }
  }

  function weekRangeLabel(week: number): string | null {
    const range = isoWeekRange(week)
    if (!range) return null

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(range.start)
    const end = formatter.format(range.end)
    return `${start} - ${end}`
  }

  function getIsoWeekNumber(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const diff = tmp.getTime() - yearStart.getTime()
    return Math.ceil((diff / 86400000 + 1) / 7)
  }

  const currentWeekNumber = computed<number>(() => getIsoWeekNumber(effectiveToday.value))

  function _visitWeekNumber(visit: VisitListRow): number {
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

  type WeekTab = { label: string; value: string; week: number }

  const availableWeeks = ref<number[]>([])

  const weekTabs = computed<WeekTab[]>(() => {
    // Merge available weeks with current week to ensure at least current is shown
    const allWeeks = new Set(availableWeeks.value)
    allWeeks.add(currentWeekNumber.value)

    // Sort logically
    const sorted = Array.from(allWeeks).sort((a, b) => a - b)

    const tabs: WeekTab[] = []

    for (const w of sorted) {
      if (w === currentWeekNumber.value) {
        tabs.push({ label: 'Deze week', value: 'current', week: w })
      } else {
        const range = weekRangeLabel(w)
        const base = `Week ${w}`
        const label = range ? `${base} (${range})` : base
        tabs.push({ label, value: `week-${w}`, week: w })
      }
    }
    return tabs
  })

  onMounted(async () => {
    try {
      // Filter weeks to only those where I have visits
      availableWeeks.value = await $api<number[]>('/visits/weeks', {
        query: { mine: true }
      })
    } catch (_e) {
      console.error('Failed to load weeks', _e)
    }
  })

  /*
   * We bind the SelectMenu to the full tab object.
   * Default is the "current" week tab. We compute it similarly to how we build the list.
   */
  const defaultTab = { label: 'Deze week', value: 'current', week: currentWeekNumber.value }
  const selectedWeekTab = ref<WeekTab>(defaultTab)

  const activeWeekNumber = computed<number>(() => {
    return selectedWeekTab.value.week
  })

  // Ensure selectedTab stays valid or defaults to current if options change
  watch(weekTabs, (tabs) => {
    const currentVal = selectedWeekTab.value.value
    const found = tabs.find((t) => t.value === currentVal)
    if (found) {
      selectedWeekTab.value = found
    } else {
      // If previously selected week is gone, fallback to current
      const current = tabs.find((t) => t.value === 'current')
      if (current) selectedWeekTab.value = current
    }
  })

  // Reload data when active week changes
  watch(activeWeekNumber, () => {
    refresh()
  })

  const statusSortOrder: Partial<Record<VisitStatusCode, number>> = {
    planned: 1,
    not_executed: 2,
    executed_with_deviation: 3,
    executed: 4
  }

  const visitsForActiveWeek = computed<VisitListRow[]>(() => {
    // We trust backend filtering now, but still filter by researcher ownership
    return filteredVisits.value.slice().sort((a, b) => {
      const rankA = statusSortOrder[a.status] ?? 99
      const rankB = statusSortOrder[b.status] ?? 99
      if (rankA !== rankB) return rankA - rankB

      const fromA = a.from_date ?? ''
      const fromB = b.from_date ?? ''
      if (fromA !== fromB) return fromA < fromB ? -1 : 1

      return a.id - b.id
    })
  })

  // --- Availability Tab Logic ---
  const tabs = [
    { label: 'Mijn bezoeken', slot: 'visits' },
    { label: 'Mijn beschikbaarheid', slot: 'availability' }
  ]

  type AvailabilityWeekOut = {
    week: number
    morning_days: number
    daytime_days: number
    nighttime_days: number
    flex_days: number
  }

  // Fetch availability
  const {
    data: avData,
    pending: avPending,
    error: avError
  } = useAsyncData('my-availability', async () => {
    await auth.ensureLoaded()
    const currentWeek = getIsoWeekNumber(effectiveToday.value)
    // Fetch a generous range, e.g., current week to current + 20
    return await $api<AvailabilityWeekOut[]>('/availability/me', {
      query: {
        week_start: currentWeek,
        week_end: currentWeek + 30
      }
    })
  })

  // Computed list for display
  const availabilityList = computed(() => {
    if (!avData.value) return []
    const list = []
    for (const weekData of avData.value) {
      if (
        weekData.morning_days === 0 &&
        weekData.daytime_days === 0 &&
        weekData.nighttime_days === 0 &&
        weekData.flex_days === 0
      ) {
        continue
      }

      const parts = []
      if (weekData.morning_days > 0) parts.push({ label: 'Ochtend', value: weekData.morning_days })
      if (weekData.daytime_days > 0) parts.push({ label: 'Dag', value: weekData.daytime_days })
      if (weekData.nighttime_days > 0)
        parts.push({ label: 'Avond', value: weekData.nighttime_days })
      if (weekData.flex_days > 0) parts.push({ label: 'Flex', value: weekData.flex_days })

      list.push({ week: weekData.week, parts })
    }
    return list
  })

  function formatAvWeekLabel(week: number): string {
    const range = weekRangeLabel(week)
    return range ? `Week ${week} (${range})` : `Week ${week}`
  }

  // ...
  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function isThisWeek(dateStr: string | null): boolean {
    if (!dateStr) return false
    const dt = new Date(dateStr)
    if (Number.isNaN(dt.getTime())) return false

    const base = effectiveToday.value
    const monday = new Date(base)
    const day = base.getDay() || 7 // Monday=1..Sunday=7
    monday.setDate(base.getDate() - (day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return dt >= monday && dt <= sunday
  }

  function getDayName(date: Date): string {
    return new Intl.DateTimeFormat('nl-NL', { weekday: 'long' }).format(date)
  }

  function weekBadge(visit: VisitListRow): string | null {
    const base = effectiveToday.value
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())

    if (visit.from_date && isThisWeek(visit.from_date)) {
      const from = new Date(visit.from_date)
      const fromDateOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      if (fromDateOnly > today) {
        const prev = new Date(from)
        prev.setDate(from.getDate() - 1)
        return `Na ${getDayName(prev)}`
      }
    }

    if (visit.to_date && isThisWeek(visit.to_date)) {
      const to = new Date(visit.to_date)
      const next = new Date(to)
      next.setDate(to.getDate() + 1)
      return `Voor ${getDayName(next)}`
    }

    return null
  }

  function goToDetail(id: number): void {
    navigateTo({
      path: `/visits/${id}`,
      query: { back: 'my-visits' }
    })
  }
</script>
