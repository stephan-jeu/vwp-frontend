<template>
  <div v-if="authLoaded && isAdmin" class="space-y-4">
    <UPageHeader title="Admin startpagina" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 flex flex-col gap-4">
        <UTabs :items="dashboardTabs" class="w-full">
          <template #default="{ item }">
            <div class="flex items-center gap-2 relative truncate">
              <span class="truncate">{{ item.label }}</span>
              <UBadge
                v-if="item.key === 'pending' && pendingVisits.length > 0"
                color="warning"
                variant="subtle"
                size="xs"
                class="rounded-full"
              >
                {{ pendingVisits.length }}
              </UBadge>
              <UBadge
                v-if="item.key === 'tight' && tightVisits.length > 0"
                color="error"
                variant="subtle"
                size="xs"
                class="rounded-full"
              >
                {{ tightVisits.length }}
              </UBadge>
            </div>
          </template>

          <template #pending>
               <div v-if="pendingVisitsPending" class="text-sm text-gray-500">
                Bezoeken worden geladen…
              </div>
              <div v-else-if="pendingVisitsError" class="text-sm text-red-500">
                Kon bezoeken niet laden.
              </div>
              <div v-else-if="pendingVisitsPreview.length === 0" class="text-sm text-gray-500">
                Geen bezoeken om te behandelen.
              </div>
              <div v-else class="space-y-4">
                 <VisitPreviewCard
                   v-for="visit in pendingVisitsPreview"
                   :key="visit.id"
                   :visit="visit"
                   @open="navigateTo(`/visits/${visit.id}`)"
                 />

                 <!-- Pagination -->
                 <div class="flex justify-between items-center pt-2">
                   <div class="text-xs text-gray-500">
                     Pagina {{ pendingPage }} · {{ pendingVisits.length }} bezoeken
                   </div>
                   <div class="flex items-center gap-2">
                     <UButton
                       size="xs"
                       variant="ghost"
                       :disabled="pendingPage <= 1 || pendingVisitsPending"
                       @click="onPendingPrev()"
                     >
                       Vorige
                     </UButton>
                     <UButton
                       size="xs"
                       variant="ghost"
                       :disabled="pendingPage >= pendingMaxPage || pendingVisitsPending"
                       @click="onPendingNext()"
                     >
                       Volgende
                     </UButton>
                   </div>
                 </div>
              </div>
          </template>

          <template #tight>
            <UCard class="mt-2">
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold">Krappe planning (bezoek moet binnen 14 dagen)</h2>
                </div>
              </template>

              <div v-if="tightVisitsPending" class="text-sm text-gray-500">Laden…</div>
              <div v-else-if="tightVisitsData === null" class="text-sm text-red-500">Fout bij laden.</div>
              <div v-else-if="tightVisits.length === 0" class="text-sm text-gray-500">
                Geen bezoeken met krappe planning gevonden.
              </div>
              <div v-else class="space-y-4">
                <UCard
                  v-for="(tv, idx) in tightVisits"
                  :key="idx"
                  class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all dark:hover:ring-primary-400"
                  @click="navigateTo(`/visits/${tv.visit.id}`)"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <div class="font-bold text-gray-900 dark:text-white">
                        <span v-if="tv.visit.project_location" class="mr-1">{{ tv.visit.project_location }} -</span>
                        {{ tv.visit.project_code }}
                        <span class="text-gray-500 font-normal ml-1">
                           Cluster {{ tv.visit.cluster_number }}
                           <span v-if="tv.visit.cluster_address">({{ tv.visit.cluster_address }})</span>
                        </span>
                      </div>
                      <div class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {{ tv.protocol_names.join(', ') }}
                      </div>
                    </div>

                    <UBadge color="error" variant="subtle" class="rounded-full">
                      Binnen {{ tv.slack }} dagen
                    </UBadge>
                  </div>

                  <!-- Visit Details -->
                  <div class="mt-2 pl-3 border-l-2 border-primary-500">
                      <div class="flex items-center justify-between text-sm">
                        <span class="font-semibold text-gray-800 dark:text-gray-200">
                           Bezoek {{ tv.visit.visit_nr }}
                           <span v-if="tv.visit.part_of_day"> ({{ tv.visit.part_of_day }})</span>
                        </span>
                      </div>

                      <!-- Dates & Status -->
                      <div class="text-sm mt-1 text-gray-700 dark:text-gray-300">
                        <div>{{ formatDate(tv.visit.from_date) }} - {{ formatDate(tv.visit.to_date) }}</div>
                        <UBadge size="md" variant="subtle" color="neutral" class="mt-1">
                           {{ statusLabel(tv.visit.status) }}
                        </UBadge>
                      </div>

                      <!-- Planned details if applicable -->
                      <div
                        v-if="tv.visit.status === 'planned'"
                        class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs"
                      >
                          <div class="flex items-center gap-2">
                             <span class="font-semibold">Week:</span>
                             <span>{{ plannedWeekDisplay(tv.visit) }}</span>
                          </div>
                          <div class="flex items-center gap-2 mt-1">
                             <span class="font-semibold">Onderzoeker(s):</span>
                             <span>{{ tv.visit.researchers.map((u) => u.full_name).filter(Boolean).join(', ') || 'Nog niet toegewezen' }}</span>
                          </div>
                      </div>
                  </div>
                </UCard>
              </div>
            </UCard>
          </template>
        </UTabs>
      </div>

      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">Onderzoeken deze week</h2>
          </template>

          <div v-if="visitsPending" class="text-sm text-gray-500">Bezoeken worden geladen…</div>
          <div v-else-if="visitsError" class="text-sm text-red-500">Kon bezoeken niet laden.</div>
          <div v-else>
            <p class="text-sm text-gray-700 dark:text-gray-200">
              Totaal: <span class="font-semibold">{{ totalThisWeek }}</span>
            </p>
            <ul class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <li>
                Uitgevoerd: <span class="font-semibold">{{ executedThisWeek }}</span>
              </li>
              <li>
                Nog uit te voeren:
                <span class="font-semibold">{{ plannedThisWeek }}</span>
              </li>
              <li>
                Afwijking: <span class="font-semibold">{{ deviationThisWeek }}</span>
              </li>
            </ul>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">Recente activiteit</h2>
            </div>
          </template>

          <div v-if="activityPending" class="text-sm text-gray-500">Activiteit wordt geladen…</div>
          <div v-else-if="activityError" class="text-sm text-red-500">
            Kon activiteit niet laden.
          </div>
          <div v-else-if="activityEntries.length === 0" class="text-sm text-gray-500">
            Geen recente activiteit.
          </div>
          <div v-else class="text-sm text-gray-700 dark:text-gray-200">
            <ul class="space-y-0">
              <li
                v-for="item in activityEntries"
                :key="item.id"
                class="first:pb-2 py-2 border-b border-gray-200 last:border-b-0"
              >
                <NuxtLink
                  v-if="activityTargetUrl(item)"
                  :to="activityTargetUrl(item)!"
                  class="hover:underline"
                >
                  {{ formatActivitySentence(item) }}
                </NuxtLink>
                <span v-else>
                  {{ formatActivitySentence(item) }}
                </span>
              </li>
            </ul>

            <div class="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
              <div>Pagina {{ activityPage }} · {{ activityTotal }} items</div>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  variant="ghost"
                  :disabled="activityPage <= 1 || activityPending"
                  @click="onActivityPrev()"
                >
                  Vorige
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  :disabled="activityPage >= activityMaxPage || activityPending"
                  @click="onActivityNext()"
                >
                  Volgende
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'
  import { useTestModeStore } from '~~/stores/testMode'
  import VisitPreviewCard from '../components/VisitPreviewCard.vue'

  definePageMeta({ layout: 'default' })

  const auth = useAuthStore()
  const { isAdmin, loaded } = storeToRefs(auth)

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

  const authLoaded = computed(() => loaded.value)

  onMounted(async () => {
    await auth.ensureLoaded()
    if (!isAdmin.value) {
      await navigateTo('/my-visits')
    }
  })

  const { $api } = useNuxtApp()

  type ActivityLogEntry = {
    id: number
    created_at: string
    actor_id: number | null
    action: string
    target_type: string
    target_id: number | null
    details: Record<string, unknown> | null
    batch_id: string | null
    actor: { id: number; full_name: string | null } | null
  }

  type ActivityLogListResponse = {
    items: ActivityLogEntry[]
    total: number
    page: number
    page_size: number
  }

  const activityPage = ref<number>(1)
  const activityPageSize = 10

  const {
    data: activityData,
    pending: activityPending,
    error: activityError
  } = useAsyncData(
    'admin-activity',
    () =>
      $api<ActivityLogListResponse>('/admin/activity', {
        query: { page: activityPage.value, page_size: activityPageSize }
      }),
    {
      watch: [() => activityPage.value]
    }
  )

  const activityEntries = computed<ActivityLogEntry[]>(() => activityData.value?.items ?? [])
  const activityTotal = computed<number>(() => activityData.value?.total ?? 0)

  const activityMaxPage = computed<number>(() => {
    if (activityTotal.value === 0) return 1
    return Math.max(1, Math.ceil(activityTotal.value / activityPageSize))
  })

  function onActivityPrev(): void {
    if (activityPage.value <= 1) return
    activityPage.value -= 1
  }

  function onActivityNext(): void {
    if (activityPage.value >= activityMaxPage.value) return
    activityPage.value += 1
  }

  function formatActivityDate(iso: string): string {
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return ''

    const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })
    const timeFormatter = new Intl.DateTimeFormat('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    })

    return `${dateFormatter.format(dt)}, ${timeFormatter.format(dt)}`
  }

  function formatActivitySentence(entry: ActivityLogEntry): string {
    const actor = entry.actor?.full_name ?? 'Systeem'
    const action = entry.action
    const details = entry.details ?? {}
    const rawExecution = (details.execution_date as string | undefined) ?? null
    const when = formatActivityDate(rawExecution ?? entry.created_at)

    const projectCode = (details.project_code as string | undefined) ?? null
    const clusterNumber = (details.cluster_number as number | undefined) ?? null
    const visitNr = (details.visit_nr as number | undefined) ?? null
    const visitLabelBase =
      projectCode && clusterNumber != null ? `${projectCode}-${clusterNumber}` : 'het bezoek'
    const visitLabel = visitNr != null ? `${visitLabelBase} nr ${visitNr}` : visitLabelBase

    if (action === 'planning_generated') {
      const week = (details.week as number | undefined) ?? null
      const selected = (details.selected_visit_ids as unknown[] | undefined) ?? []
      const count = selected.length
      const visitsLabel = `${count} bezoek${count === 1 ? '' : 'en'} ingepland`
      const weekLabel = week != null ? `week ${week}` : 'deze week'
      return `${actor} heeft de planning gegenereerd voor ${weekLabel} (${visitsLabel}) op ${when}`
    }

    if (action === 'seasonal_planner_run') {
      return `${actor} heeft de seizoensplanning uitgevoerd op ${when}`
    }

    if (action === 'project_created') {
      const code = (details.code as string | undefined) ?? 'onbekend project'
      const location = (details.location as string | undefined) ?? ''
      const locationPart = location ? ` (${location})` : ''
      return `${actor} heeft project ${code}${locationPart} aangemaakt op ${when}`
    }

    if (action === 'cluster_deleted') {
      const deletedClusterNumber = (details.cluster_number as number | undefined) ?? null
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend project'
      const clusterLabel =
        deletedClusterNumber != null ? `cluster ${deletedClusterNumber}` : 'een cluster'
      return `${actor} heeft ${clusterLabel} van project ${projectCode} verwijderd op ${when}`
    }

    if (action === 'cluster_created') {
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend project'
      const functionNames = (details.function_names as string[] | undefined) ?? []
      const speciesAbbreviations = (details.species_abbreviations as string[] | undefined) ?? []
      const functionsLabel =
        functionNames.length > 0 ? functionNames.join(', ') : 'onbekende functies'
      const speciesLabel =
        speciesAbbreviations.length > 0 ? speciesAbbreviations.join(', ') : 'onbekende soorten'
      return `${actor} heeft een cluster toegevoegd voor project ${projectCode} voor de functies ${functionsLabel} en de soorten ${speciesLabel} op ${when}`
    }

    if (action === 'cluster_duplicated') {
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend'
      const functionNames = (details.function_names as string[] | undefined) ?? []
      const speciesAbbreviations = (details.species_abbreviations as string[] | undefined) ?? []
      const functionsLabel =
        functionNames.length > 0 ? functionNames.join(', ') : 'onbekende functies'
      const speciesLabel =
        speciesAbbreviations.length > 0 ? speciesAbbreviations.join(', ') : 'onbekende soorten'
      return `${actor} heeft een cluster gedupliceerd voor project ${projectCode} voor de functies ${functionsLabel} en de soorten ${speciesLabel} op ${when}`
    }

    if (action === 'cluster_updated') {
      const clusterNumber = (details.cluster_number as number | undefined) ?? null
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend'
      const clusterLabel = clusterNumber != null ? `${clusterNumber}` : 'onbekend'
      return `${actor} heeft cluster ${clusterLabel} bijgewerkt voor project ${projectCode} op ${when}`
    }

    if (action === 'visit_status_cleared') {
      const previousStatusRaw = (details.previous_status as string | undefined) ?? null
      const modeRaw = (details.mode as string | undefined) ?? null
      const previousLabel =
        previousStatusRaw != null ? statusLabel(previousStatusRaw as VisitStatusCode) : null
      const newLabel = modeRaw != null ? statusLabel(modeRaw as VisitStatusCode) : null

      if (previousLabel && newLabel) {
        return `${actor} heeft de status van bezoek ${visitLabel} aangepast van ${previousLabel} naar ${newLabel} op ${when}`
      }

      if (newLabel) {
        return `${actor} heeft de status van bezoek ${visitLabel} aangepast naar ${newLabel} op ${when}`
      }

      return `${actor} heeft de status van bezoek ${visitLabel} aangepast op ${when}`
    }

    switch (action) {
      case 'visit_executed':
        return `${actor} heeft het bezoek ${visitLabel} uitgevoerd op ${when}`
      case 'visit_executed_with_deviation':
      case 'visit_executed_deviation':
        return `${actor} heeft het bezoek ${visitLabel} uitgevoerd (met afwijking) op ${when}`
      case 'visit_not_executed':
        return `${actor} heeft het bezoek ${visitLabel} niet uitgevoerd op ${when}`
      case 'visit_approved':
        return `${actor} heeft het bezoek ${visitLabel} goedgekeurd op ${when}`
      case 'visit_rejected':
        return `${actor} heeft het bezoek ${visitLabel} afgekeurd op ${when}`
      case 'visit_cancelled':
        return `${actor} heeft het bezoek ${visitLabel} geannuleerd op ${when}`
      case 'visit_advertised':
        return `${actor} heeft het bezoek ${visitLabel} aangeboden ter overname op ${when}`
      case 'visit_advertised_cancelled':
        return `${actor} heeft het aanbod tot overname voor bezoek ${visitLabel} ingetrokken op ${when}`
      case 'visit_takeover_accepted':
        return `${actor} heeft het bezoek ${visitLabel} overgenomen op ${when}`
      case 'user_created': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `#${entry.target_id ?? ''}`.trim()
        return `${actor} heeft ${label} aangemaakt op ${when}`
      }
      case 'user_updated': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `#${entry.target_id ?? ''}`.trim()
        return `${actor} heeft ${label} bijgewerkt op ${when}`
      }
      case 'user_deleted': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `#${entry.target_id ?? ''}`.trim()
        return `${actor} heeft ${label} verwijderd op ${when}`
      }
      default:
        return `${actor} heeft actie "${action}" uitgevoerd op ${when}`
    }
  }

  function activityTargetUrl(entry: ActivityLogEntry): string | null {
    if (entry.target_type === 'visit' && entry.target_id != null) {
      return `/visits/${entry.target_id}`
    }
    if (
      entry.target_type === 'user' &&
      entry.target_id != null &&
      entry.action !== 'user_deleted'
    ) {
      return '/admin/researchers'
    }
    return null
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

  const pendingStatusList: VisitStatusCode[] = [
    'overdue',
    'executed_with_deviation',
    'not_executed',
    'missed',
    'rejected'
  ]

  type CompactFunction = { id: number; name: string }
  type CompactSpecies = { id: number; name: string; abbreviation?: string | null }
  type UserName = { id: number; full_name: string | null }

  type VisitListRow = {
    id: number
    project_code: string
    project_location: string
    cluster_number: number
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
    hub: boolean
    dvp: boolean
    sleutel: boolean
    priority: boolean
  }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  const {
    data: visitsData,
    pending: visitsPending,
    error: visitsError
  } = useAsyncData(
    'admin-dashboard-visits',
    () => {
      const query: Record<string, string | number> = { page: 1, page_size: 200 }
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      return $api<VisitListResponse>('/visits', { query })
    },
    {
      watch: [() => simulatedDate.value, () => testModeEnabled.value]
    }
  )

  const allVisits = computed<VisitListRow[]>(() => visitsData.value?.items ?? [])

  const {
    data: pendingVisitsData,
    pending: pendingVisitsPending,
    error: pendingVisitsError
  } = useAsyncData(
    'admin-dashboard-pending-visits',
    () => {
      const query: Record<string, string | number | VisitStatusCode[]> = {
        page: 1,
        page_size: 200,
        statuses: pendingStatusList
      }
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      return $api<VisitListResponse>('/visits', { query })
    },
    {
      watch: [() => simulatedDate.value, () => testModeEnabled.value]
    }
  )

  const pendingVisitsAll = computed<VisitListRow[]>(() => pendingVisitsData.value?.items ?? [])

  function getIsoWeekNumber(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const diff = tmp.getTime() - yearStart.getTime()
    return Math.ceil((diff / 86400000 + 1) / 7)
  }

  const currentWeekNumber = computed<number>(() => getIsoWeekNumber(effectiveToday.value))

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

  const visitsThisWeek = computed<VisitListRow[]>(() => {
    const weekNow = currentWeekNumber.value
    return allVisits.value.filter((v) => visitWeekNumber(v) === weekNow)
  })

  function plannedWeekDisplay(visit: VisitListRow): string {
    if (visit.planned_week != null) {
      return `${visit.planned_week} (gepland)`
    }
    if (visit.provisional_week != null) {
      return `${visit.provisional_week} (voorlopig)`
    }
    return 'onbekend'
  }

  const totalThisWeek = computed<number>(() => visitsThisWeek.value.length)
  const executedThisWeek = computed<number>(
    () => visitsThisWeek.value.filter((v) => v.status === 'executed').length
  )
  const deviationThisWeek = computed<number>(
    () => visitsThisWeek.value.filter((v) => v.status === 'executed_with_deviation').length
  )
  const plannedThisWeek = computed<number>(
    () => visitsThisWeek.value.filter((v) => v.status === 'planned').length
  )

  const pendingVisits = computed<VisitListRow[]>(() => pendingVisitsAll.value)

  const pendingPage = ref<number>(1)
  const pendingPageSize = 10

  const pendingMaxPage = computed<number>(() => {
    if (pendingVisits.value.length === 0) return 1
    return Math.max(1, Math.ceil(pendingVisits.value.length / pendingPageSize))
  })

  const pendingVisitsPreview = computed<VisitListRow[]>(() => {
    const start = (pendingPage.value - 1) * pendingPageSize
    const end = start + pendingPageSize
    return pendingVisits.value.slice(start, end)
  })

  function onPendingPrev(): void {
    if (pendingPage.value <= 1) return
    pendingPage.value -= 1
  }

  function onPendingNext(): void {
    if (pendingPage.value >= pendingMaxPage.value) return
    pendingPage.value += 1
  }

  function statusLabel(code: VisitStatusCode): string {
    const map: Record<VisitStatusCode, string> = {
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
    return map[code]
  }

  // --- Tight Visits ---

  interface TightVisit {
    visit: VisitListRow
    min_start: string
    max_end: string
    slack: number
    protocol_names: string[]
  }

  const { data: tightVisitsData, pending: tightVisitsPending } = useAsyncData(
    'admin-tight-visits',
    () => {
        // Only fetch if admin
        if (!isAdmin.value) return Promise.resolve([])
        const query: Record<string, string> = {}
        if (testModeEnabled.value && simulatedDate.value) {
           query.simulated_today = simulatedDate.value
        }
        return $api<TightVisit[]>('/admin/tight-visits', { query })
    },
    {
       watch: [() => simulatedDate.value, () => testModeEnabled.value],
       immediate: isAdmin.value
    }
  )

  const tightVisits = computed<TightVisit[]>(() => tightVisitsData.value ?? [])

  const dashboardTabs = computed(() => [
    {
      label: 'Te behandelen',
      key: 'pending',
      slot: 'pending'
    },
    {
      label: 'Krappe planning',
      key: 'tight',
      slot: 'tight'
    }
  ])

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }
</script>
