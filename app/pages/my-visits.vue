<template>
  <div>
    <UPageHeader title="Mijn bezoeken" />

    <UCard class="mt-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="!pending && !error"
            size="xs"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
          />
        </div>

        <div v-if="pending" class="text-sm text-gray-700 dark:text-gray-300">Bezoeken worden geladen…</div>
        <div v-else-if="error" class="text-sm text-red-500">Kon bezoeken niet laden.</div>
        <div v-else-if="filteredVisits.length === 0" class="text-sm text-gray-700 dark:text-gray-300">
          Er zijn nog geen bezoeken aan je toegewezen voor deze week.
        </div>

        <div v-else class="flex flex-col gap-3">
          <UCard
            v-for="visit in filteredVisits"
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
                  <UBadge v-if="visit.status === 'rejected'" color="warning"> Afgekeurd </UBadge>
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
                <span>{{ visit.functions.map((f) => f.name).join(', ') || '-' }}</span>
              </div>
              <div class="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                <span class="font-medium mr-1">Soorten:</span>
                <span>
                  {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
                </span>
              </div>

              <div class="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                <span class="font-medium mr-1">Onderzoekers:</span>
                <span>
                  {{
                    visit.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ') ||
                    '-'
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
                <UBadge v-if="visit.dvp" class="bg-amber-600 mr-1">DvP</UBadge>
                <UBadge v-if="visit.sleutel" class="bg-amber-600 mr-1">Sleutel</UBadge>
                <UBadge v-if="visit.priority" class="bg-amber-600 mr-1"> Prioriteit </UBadge>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'

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

  const selectedStatuses: VisitStatusCode[] = ['planned', 'not_executed', 'rejected']

  const { data, pending, error, refresh } = useAsyncData('my-visits', async () => {
    await auth.ensureLoaded()

    const query: Record<string, unknown> = {
      page: 1,
      page_size: 200,
      statuses: selectedStatuses
    }

    const response = await $api<VisitListResponse>('/visits', { query })
    return response
  })

  const visits = computed<VisitListRow[]>(() => data.value?.items ?? [])

  const filteredVisits = computed<VisitListRow[]>(() => {
    const currentId = identity.value?.id
    if (!currentId) return []
    return visits.value.filter((v) => v.researchers.some((r) => r.id === currentId))
  })

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

    const now = new Date()
    const monday = new Date(now)
    const day = now.getDay() || 7 // Monday=1..Sunday=7
    monday.setDate(now.getDate() - (day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return dt >= monday && dt <= sunday
  }

  function weekBadge(visit: VisitListRow): string | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (visit.from_date && isThisWeek(visit.from_date)) {
      const from = new Date(visit.from_date)
      const fromDateOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      if (fromDateOnly > today) {
        return 'Na woensdag'
      }
    }

    if (visit.to_date && isThisWeek(visit.to_date)) {
      return 'Voor donderdag'
    }

    return null
  }

  function goToDetail(id: number): void {
    navigateTo(`/visits/${id}`)
  }
</script>
