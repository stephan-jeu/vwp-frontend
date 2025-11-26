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
            Leeg onderzoekers
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
  definePageMeta({ middleware: 'admin' })

  const { $api } = useNuxtApp()
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

  const completedStatusValues: VisitStatusCode[] = [
    'executed',
    'executed_with_deviation',
    'approved',
    'rejected'
  ]

  const plannedStatusValues: VisitStatusCode[] = ['planned', 'not_executed']

  const loading = ref(false)
  const clearing = ref(false)
  const currentWeekNumber = currentIsoWeek()
  const week = ref<number>(currentWeekNumber)
  const visits = ref<VisitListRow[]>([])

  type WeekTab = { label: string; value: string; week: number }
  const selectedWeek = ref<string>('current')

  function currentIsoWeek(): number {
    const d = new Date()
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

    const now = new Date()
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

    return currentWeekNumber
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
      if (weekNumber > currentWeekNumber) {
        futureWeeks.add(weekNumber)
      }
    }

    const sortedFutureWeeks = Array.from(futureWeeks).sort((a, b) => a - b)

    const tabs: WeekTab[] = []
    tabs.push({ label: 'Deze week', value: 'current', week: currentWeekNumber })

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
    return tab?.week ?? currentWeekNumber
  })

  const isCurrentWeekTab = computed<boolean>(() => activeWeekNumber.value === currentWeekNumber)

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

  async function loadVisits(): Promise<void> {
    loading.value = true
    try {
      const statuses: VisitStatusCode[] = [...completedStatusValues, ...plannedStatusValues]
      const query: Record<string, unknown> = {
        page: 1,
        page_size: 200,
        statuses
      }
      const response = await $api<VisitListResponse>('/visits', { query })
      visits.value = response.items
    } finally {
      loading.value = false
    }
  }

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

  onMounted(() => {
    void loadVisits()
  })

  function goToDetail(id: number): void {
    navigateTo(`/visits/${id}`)
  }
</script>

