<template>
  <div v-if="authLoaded && isAdmin" class="space-y-4">
    <UPageHeader title="Admin startpagina" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">Te behandelen</h2>
            <UBadge color="warning" variant="subtle">
              {{ pendingVisits.length }}
            </UBadge>
          </div>
        </template>

        <div v-if="pendingVisitsPending" class="text-sm text-gray-500">
          Bezoeken worden geladen…
        </div>
        <div v-else-if="pendingVisitsError" class="text-sm text-red-500">
          Kon bezoeken niet laden.
        </div>
        <div v-else-if="pendingVisitsPreview.length === 0" class="text-sm text-gray-500">
          Geen bezoeken om te behandelen.
        </div>
        <div v-else class="space-y-3">
          <ul class="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <li
              v-for="visit in pendingVisitsPreview"
              :key="visit.id"
              class="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <div class="font-medium">
                      {{ visit.project_code }} · Cluster {{ visit.cluster_number }}
                    </div>
                    <UBadge size="sm" variant="subtle" color="neutral">
                      {{ statusLabel(visit.status) }}
                    </UBadge>
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ visit.cluster_address }}
                  </div>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-arrow-right"
                  :to="`/visits/${visit.id}`"
                />
              </div>

              <div
                class="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600"
              >
                <div>
                  <span class="font-medium">Functies: </span>
                  <span>
                    {{ visit.functions.map((f) => f.name).join(', ') || '-' }}
                  </span>
                </div>
                <div>
                  <span class="font-medium">Soorten: </span>
                  <span>
                    {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
                  </span>
                </div>
                <div>
                  <span class="font-medium">Onderzoekers: </span>
                  <span>
                    {{
                      visit.researchers.length
                        ? visit.researchers
                            .map((r) => r.full_name || `Gebruiker #${r.id}`)
                            .join(', ')
                        : '-'
                    }}
                  </span>
                </div>
                <div>
                  <span>
                    {{ visit.part_of_day }}
                  </span>
                  <span v-if="visit.planned_week" >
                    · Week {{ visit.planned_week }}
                  </span>
                </div>
              </div>
            </li>
          </ul>

          <div class="pt-2 border-t flex justify-between items-center">
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
      </UCard>

      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">Onderzoeken deze week</h2>
          </template>

          <div v-if="visitsPending" class="text-sm text-gray-500">
            Bezoeken worden geladen…
          </div>
          <div v-else-if="visitsError" class="text-sm text-red-500">
            Kon bezoeken niet laden.
          </div>
          <div v-else>
            <p class="text-sm text-gray-700 dark:text-gray-200">
              Totaal: <span class="font-semibold">{{ totalThisWeek }}</span>
            </p>
            <ul class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <li>Uitgevoerd: <span class="font-semibold">{{ executedThisWeek }}</span></li>
              <li>
                Nog uit te voeren:
                <span class="font-semibold">{{ plannedThisWeek }}</span>
              </li>
              <li>Afwijking: <span class="font-semibold">{{ deviationThisWeek }}</span></li>
            </ul>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">Recente activiteit</h2>
            </div>
          </template>

          <div v-if="activityPending" class="text-sm text-gray-500">
            Activiteit wordt geladen…
          </div>
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
              <div>
                Pagina {{ activityPage }} · {{ activityTotal }} items
              </div>
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

    if (action === 'planning_generated') {
      const week = (details.week as number | undefined) ?? null
      const selected = (details.selected_visit_ids as unknown[] | undefined) ?? []
      const count = selected.length
      const visitsLabel = `${count} bezoek${count === 1 ? '' : 'en'} ingepland`
      const weekLabel = week != null ? `week ${week}` : 'deze week'
      return `${actor} heeft de planning gegenereerd voor ${weekLabel} (${visitsLabel}) op ${when}`
    }

    if (action === 'project_created') {
      const code = (details.code as string | undefined) ?? 'onbekend project'
      const location = (details.location as string | undefined) ?? ''
      const locationPart = location ? ` (${location})` : ''
      return `${actor} heeft project ${code}${locationPart} aangemaakt op ${when}`
    }

    if (action === 'cluster_deleted') {
      const clusterNumber = (details.cluster_number as number | undefined) ?? null
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend project'
      const clusterLabel = clusterNumber != null ? `cluster ${clusterNumber}` : 'een cluster'
      return `${actor} heeft ${clusterLabel} van project ${projectCode} verwijderd op ${when}`
    }

    if (action === 'cluster_created') {
      const projectCode = (details.project_code as string | undefined) ?? 'onbekend project'
      const functionNames = (details.function_names as string[] | undefined) ?? []
      const speciesAbbreviations = (details.species_abbreviations as string[] | undefined) ?? []
      const functionsLabel =
        functionNames.length > 0 ? functionNames.join(', ') : 'onbekende functies'
      const speciesLabel =
        speciesAbbreviations.length > 0
          ? speciesAbbreviations.join(', ')
          : 'onbekende soorten'
      return `${actor} heeft een cluster toegevoegd voor project ${projectCode} voor de functies ${functionsLabel} en de soorten ${speciesLabel} op ${when}`
    }

    switch (action) {
      case 'visit_executed':
        return `${actor} heeft het bezoek uitgevoerd op ${when}`
      case 'visit_executed_with_deviation':
      case 'visit_executed_deviation':
        return `${actor} heeft het bezoek uitgevoerd (met afwijking) op ${when}`
      case 'visit_not_executed':
        return `${actor} heeft het bezoek niet uitgevoerd op ${when}`
      case 'visit_approved':
        return `${actor} heeft het bezoek goedgekeurd op ${when}`
      case 'visit_rejected':
        return `${actor} heeft het bezoek afgekeurd op ${when}`
      case 'visit_cancelled':
        return `${actor} heeft het bezoek geannuleerd op ${when}`
      case 'visit_advertised':
        return `${actor} heeft dit bezoek aangeboden ter overname op ${when}`
      case 'visit_advertised_cancelled':
        return `${actor} heeft het aanbod tot overname ingetrokken op ${when}`
      case 'visit_takeover_accepted':
        return `${actor} heeft het bezoek overgenomen op ${when}`
      case 'user_created': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `gebruiker #${entry.target_id ?? ''}`.trim()
        return `${actor} heeft gebruiker ${label} aangemaakt op ${when}`
      }
      case 'user_updated': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `gebruiker #${entry.target_id ?? ''}`.trim()
        return `${actor} heeft gebruiker ${label} bijgewerkt op ${when}`
      }
      case 'user_deleted': {
        const fullName = (details.full_name as string | undefined) ?? null
        const email = (details.email as string | undefined) ?? null
        const label = fullName || email || `gebruiker #${entry.target_id ?? ''}`.trim()
        return `${actor} heeft gebruiker ${label} verwijderd op ${when}`
      }
      default:
        return `${actor} heeft actie "${action}" uitgevoerd op ${when}`
    }
  }

  function activityTargetUrl(entry: ActivityLogEntry): string | null {
    if (entry.target_type === 'visit' && entry.target_id != null) {
      return `/visits/${entry.target_id}`
    }
    if (entry.target_type === 'user' && entry.target_id != null && entry.action !== 'user_deleted') {
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
    cluster_number: number
    cluster_address: string
    status: VisitStatusCode
    planned_week: number | null
    from_date: string | null
    to_date: string | null
    functions: CompactFunction[]
    species: CompactSpecies[]
    researchers: UserName[]
    part_of_day: string | null
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

  const pendingVisitsAll = computed<VisitListRow[]>(
    () => pendingVisitsData.value?.items ?? []
  )

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

  const totalThisWeek = computed<number>(() => visitsThisWeek.value.length)
  const executedThisWeek = computed<number>(() =>
    visitsThisWeek.value.filter((v) => v.status === 'executed').length
  )
  const deviationThisWeek = computed<number>(() =>
    visitsThisWeek.value.filter((v) => v.status === 'executed_with_deviation').length
  )
  const plannedThisWeek = computed<number>(() =>
    visitsThisWeek.value.filter((v) => v.status === 'planned').length
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
</script>
