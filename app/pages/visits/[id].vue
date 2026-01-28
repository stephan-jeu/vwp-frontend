<template>
  <div>
    <UPageHeader :title="pageTitle" />

    <UCard class="mt-4">
      <div v-if="pending" class="text-sm text-gray-700 dark:text-gray-300">
        Bezoek wordt geladen…
      </div>
      <div v-else-if="error || !visit" class="text-sm text-red-500">Kon dit bezoek niet laden.</div>

      <div v-else class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <UBadge v-if="weekBadge(visit)" color="warning" class="mb-4">
                {{ weekBadge(visit) }}
              </UBadge>
              <div class="mb-4">
                <UButton
                  variant="outline"
                  color="neutral"
                  icon="i-heroicons-arrow-left"
                  class="-ml-2.5"
                  @click="goBack"
                >
                  Terug
                </UButton>
              </div>
              <div class="text-xs text-gray-700 dark:text-gray-300">Project</div>
              <div class="text-sm font-semibold text-gray-800">
                {{ visit.project_code }} · {{ visit.project_location }}
              </div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                Cluster {{ visit.cluster_number }} · {{ visit.cluster_address }}
              </div>
              <div class="mt-1 text-xs text-gray-700 dark:text-gray-300">
                Bezoek nr {{ visit.visit_nr ?? '-' }}
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2">
                <div v-if="canResearcherEditStatus">
                  <UButton
                    size="sm"
                    icon="i-lucide-shield-check"
                    class="dark:text-gray-300"
                    @click="openStatusModal"
                  >
                    Status aanpassen
                  </UButton>
                </div>
                <div v-else>
                  <UBadge :color="statusBadgeColor(visit.status)" variant="solid">
                    {{ statusLabel(visit.status) }}
                  </UBadge>
                </div>
                <UButton
                  v-if="canAdminEditStatus"
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-calendar-clock"
                  @click="onOpenAdminPlanning"
                >
                  Status aanpassen
                </UButton>
              </div>
            </div>
          </div>

          <div v-if="isVisitResearcher" class="mt-3 flex items-center gap-2">
            <USwitch
              v-model="advertizedLocal"
              :disabled="advertizedUpdating || !canEditAdvertised"
              @update:model-value="onToggleAdvertized"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Vraag iemand anders</span>
            <UPopover>
              <UButton variant="ghost" color="neutral" icon="i-lucide-circle-question-mark" />
              <template #content>
                <div class="p-3 text-xs text-gray-700 dark:text-gray-300 max-w-xs">
                  Zet dit aan als je graag wilt dat iemand anders dit bezoek overneemt. Dit verzoek
                  komt dan terecht in 'Hulp gevraagd'.
                </div>
              </template>
            </UPopover>
          </div>
        </div>

        <div class="border-t pt-3 flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
          <div v-if="visit.part_of_day">
            <span class="font-medium">Dagdeel:</span>
            <span class="ml-1">{{ visit.part_of_day }}</span>
          </div>
          <div v-if="visit.start_time_text">
            <span class="font-medium">Starttijd:</span>
            <span class="ml-1">{{ visit.start_time_text }}</span>
          </div>
          <div>
            <span class="font-medium">Periode:</span>
            <span class="ml-1">
              {{ formatDate(visit.from_date) }} – {{ formatDate(visit.to_date) }}
            </span>
          </div>

          <div>
            <span class="font-medium">Week:</span>
            <span class="ml-1">{{ weekDisplay }}</span>
          </div>

          <div v-if="durationHoursDisplay">
            <span class="font-medium">Duur:</span>
            <span class="ml-1">{{ durationHoursDisplay }}</span>
          </div>

          <div>
            <span class="font-medium">Functies:</span>
            <span class="ml-1">
              {{
                visit.functions.length
                  ? visit.functions.map((f) => f.name).join(', ')
                  : visit.custom_function_name || '-'
              }}
            </span>
          </div>
          <div>
            <span class="font-medium">Soorten:</span>
            <span class="ml-1">
              {{
                visit.species.length
                  ? visit.species.map((s) => s.abbreviation || s.name).join(', ')
                  : visit.custom_species_name || '-'
              }}
            </span>
          </div>
          <div>
            <span class="font-medium">Onderzoekers:</span>
            <span class="ml-1">
              {{
                visit.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ') || '-'
              }}
            </span>
          </div>

          <div class="mt-2">
            <span class="font-medium">Weercondities:</span>
            <span class="ml-1">
              Min {{ visit.min_temperature_celsius ?? '-' }} °C, max wind
              {{ visit.max_wind_force_bft ?? '-' }}, max neerslag
              {{ visit.max_precipitation || '-' }}
            </span>
          </div>

          <div v-if="visit.project_google_drive_folder" class="mt-1 text-sm text-primary-600">
            <a
              :href="visit.project_google_drive_folder"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              Project Google drive
            </a>
          </div>

          <div class="mt-2">
            <span class="font-medium">Bijzonderheden:</span>
            <span class="ml-1">
              <span v-if="!hasFlags">-</span>
            </span>
          </div>
          <div v-if="hasFlags" class="mt-1 flex flex-wrap gap-1">
            <UBadge v-if="visit.wbc" class="bg-amber-600 mr-1">WBC</UBadge>
            <UBadge v-if="visit.fiets" class="bg-amber-600 mr-1">Fiets</UBadge>
            <UBadge v-if="visit.hub" class="bg-amber-600 mr-1">HUB</UBadge>
            <UBadge v-if="visit.dvp" class="bg-amber-600 mr-1">DVP</UBadge>
            <UBadge v-if="visit.sleutel" class="bg-amber-600 mr-1">Sleutel</UBadge>
            <UBadge v-if="visit.priority" class="bg-amber-600 mr-1">Prioriteit</UBadge>
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="font-medium mb-1 text-sm">Opmerkingen veld</div>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {{ visit.remarks_field || 'Geen opmerkingen' }}
          </p>
        </div>

        <VisitActivityLog :visit-id="visit.id" />
      </div>
    </UCard>

    <VisitStatusModal
      v-if="visit"
      v-model:open="statusModalOpen"
      :visit="visit"
      :is-admin="isAdmin"
      :researcher-options="adminPlanningResearcherOptions"
      @saved="refresh"
    />
  </div>
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

  type VisitDetailRow = {
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
    custom_function_name: string | null
    custom_species_name: string | null
    functions: CompactFunction[]
    species: CompactSpecies[]
    required_researchers: number | null
    visit_nr: number | null
    planned_week: number | null
    provisional_week: number | null
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

  type BadgeColor = 'primary' | 'warning' | 'success' | 'error' | 'neutral' | 'secondary' | 'info'

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

  type ResearcherOption = { label: string; value: number }

  const route = useRoute()
  const { $api } = useNuxtApp()
  const toast = useToast()

  const auth = useAuthStore()
  const { isAdmin, identity } = storeToRefs(auth)

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

  const visitId = computed(() => Number(route.params.id))

  const { data, pending, error, refresh } = useAsyncData(
    'visit-detail',
    () => {
      const query: Record<string, string> = {}
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      return $api<VisitDetailRow>(`/visits/${visitId.value}`, { query })
    },
    {
      watch: [visitId, () => simulatedDate.value, () => testModeEnabled.value]
    }
  )

  const visit = computed<VisitDetailRow | null>(() => data.value ?? null)

  const weekDisplay = computed<string>(() => {
    if (!visit.value) return ''
    if (visit.value.planned_week != null) {
      return `${visit.value.planned_week} (gepland)`
    }
    if (visit.value.provisional_week != null) {
      return `${visit.value.provisional_week} (voorlopig)`
    }
    return 'onbekend'
  })

  function formatDurationHours(minutes: number | null): string {
    if (minutes == null) return ''
    const hours = minutes / 60
    const formatted = new Intl.NumberFormat('nl-NL', {
      maximumFractionDigits: 2
    }).format(hours)
    return `${formatted} uur`
  }

  const durationHoursDisplay = computed<string>(() => {
    if (!visit.value) return ''
    return formatDurationHours(visit.value.duration)
  })

  const pageTitle = computed(() => {
    if (!visit.value) return 'Bezoekdetails'
    if (visit.value.visit_nr != null) return `Bezoek ${visit.value.visit_nr}`
    return `Bezoek #${visit.value.id}`
  })

  const hasFlags = computed(
    () =>
      !!visit.value &&
      (visit.value.wbc ||
        visit.value.fiets ||
        visit.value.hub ||
        visit.value.dvp ||
        visit.value.sleutel ||
        visit.value.priority)
  )

  const isVisitResearcher = computed(() => {
    if (!visit.value) return false
    const userId = identity.value?.id
    if (!userId) return false
    return visit.value.researchers.some((r) => r.id === userId)
  })

  const canEditAdvertised = computed(() => isVisitResearcher.value)

  const canResearcherEditStatus = computed(() => {
    if (!visit.value) return false
    return visit.value.status === 'planned' && isVisitResearcher.value
  })

  const canAdminEditStatus = computed(() => {
    if (!visit.value) return false
    return (
      ['missed', 'rejected', 'executed_with_deviation', 'not_executed'].includes(
        visit.value.status
      ) && isAdmin.value
    )
  })

  function statusLabel(code: VisitStatusCode): string {
    switch (code) {
      case 'created':
        return 'Aangemaakt'
      case 'open':
        return 'Open'
      case 'planned':
        return 'Gepland'
      case 'overdue':
        return 'Verlopen'
      case 'missed':
        return 'Gemist'
      case 'executed':
        return 'Uitgevoerd'
      case 'executed_with_deviation':
        return 'Uitgevoerd (afwijking)'
      case 'not_executed':
        return 'Niet uitgevoerd'
      case 'approved':
        return 'Goedgekeurd'
      case 'rejected':
        return 'Afgekeurd'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return code
    }
  }

  function statusBadgeColor(code: VisitStatusCode): BadgeColor {
    return statusBadgeColorMap[code] ?? 'neutral'
  }

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

  function weekBadge(v: VisitDetailRow): string | null {
    const base = effectiveToday.value
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())

    if (v.from_date && isThisWeek(v.from_date)) {
      const from = new Date(v.from_date)
      const fromDateOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      if (fromDateOnly > today) {
        const prev = new Date(from)
        prev.setDate(from.getDate() - 1)
        return `Na ${getDayName(prev)}`
      }
    }

    if (v.to_date && isThisWeek(v.to_date)) {
      const to = new Date(v.to_date)
      const next = new Date(to)
      next.setDate(to.getDate() + 1)
      return `Voor ${getDayName(next)}`
    }

    return null
  }

  const advertizedLocal = ref(false)
  const advertizedUpdating = ref(false)

  watch(
    () => visit.value?.advertized,
    (val) => {
      if (typeof val === 'boolean') advertizedLocal.value = val
    },
    { immediate: true }
  )

  async function onToggleAdvertized(val: boolean): Promise<void> {
    if (!visit.value || !canEditAdvertised.value) return
    advertizedUpdating.value = true
    const previous = !val
    try {
      await $api(`/visits/${visit.value.id}/advertised`, {
        method: 'POST',
        body: { advertized: val }
      })
      if (data.value) {
        data.value.advertized = val
      }
      toast.add({
        title: val ? 'Vraag iemand anders ingeschakeld' : 'Vraag iemand anders uitgeschakeld',
        color: 'success'
      })
    } catch {
      advertizedLocal.value = previous
      toast.add({ title: 'Kon advertentie-status niet bijwerken', color: 'error' })
    } finally {
      advertizedUpdating.value = false
    }
  }

  const statusModalOpen = ref(false)
  const adminPlanningResearcherOptions = ref<ResearcherOption[]>([])
  const adminPlanningOptionsLoaded = ref(false)
  const adminPlanningLoading = ref(false)

  // Combined opener for both researchers and admins
  async function openStatusModal(): Promise<void> {
    // If admin is doing planning-related status changes, fetch researchers
    if (isAdmin.value) {
        await ensureAdminPlanningOptionsLoaded()
    }
    statusModalOpen.value = true
  }

  async function ensureAdminPlanningOptionsLoaded(): Promise<void> {
    if (!isAdmin.value) return
    if (adminPlanningOptionsLoaded.value || adminPlanningLoading.value) return

    adminPlanningLoading.value = true
    try {
      const users = await $api<Array<{ id: number; full_name: string | null }>>('/admin/users')
      adminPlanningResearcherOptions.value = users.map((u) => ({
        value: u.id,
        label: u.full_name ?? `Gebruiker #${u.id}`
      }))
      adminPlanningOptionsLoaded.value = true
    } catch {
      toast.add({ title: 'Kon onderzoekers niet laden', color: 'error' })
    } finally {
      adminPlanningLoading.value = false
    }
  }

  // Alias for old admin open handler if needed, or simply replace usage
  async function onOpenAdminPlanning(): Promise<void> {
    if (!visit.value || !isAdmin.value) return
    await ensureAdminPlanningOptionsLoaded()
    if (!adminPlanningOptionsLoaded.value) return
    statusModalOpen.value = true
  }

  function goBack(): void {
    const back = route.query.back as string | undefined
    if (back === 'planning') {
      const q: Record<string, string | number> = {}
      if (route.query.week) {
        q.week = route.query.week as string
      }
      navigateTo({ path: '/admin/planning', query: q })
    } else if (back === 'my-visits') {
      navigateTo('/my-visits')
    } else if (back === 'visits' || back === 'index') {
      if (back === 'index') {
        navigateTo('/')
      } else {
        navigateTo('/visits')
      }
    } else {
      useRouter().back()
    }
  }
</script>
