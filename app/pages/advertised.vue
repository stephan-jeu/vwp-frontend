<template>
  <div>
    <UPageHeader title="Hulp gevraagd" />

    <UCard class="mt-4">
      <div v-if="pending" class="text-sm text-gray-700 dark:text-gray-300">
        Advertenties worden geladen…
      </div>
      <div v-else-if="error" class="text-sm text-red-500">
        Kon de lijst met geadverteerde bezoeken niet laden.
      </div>
      <div v-else-if="visits.length === 0" class="text-sm text-gray-700 dark:text-gray-300">
        Er zijn nu geen geadverteerde bezoeken.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="visit in visits"
          :key="visit.id"
          class="border rounded-md p-3 flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2">
              <UIcon
                v-if="visitIcons[visit.id]"
                :name="`i-lucide-${visitIcons[visit.id]}`"
                class="w-12 h-12 text-primary-500 mt-0.5 ma-8"
              />
              <div>
                <div class="text-xs text-gray-500">
                  Project {{ visit.project_code }} · {{ visit.project_location }}
                </div>
                <div class="text-sm font-semibold">
                  Cluster {{ visit.cluster_number }} · {{ visit.cluster_address }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  Bezoek nr {{ visit.visit_nr ?? '-' }}
                </div>
              </div>
            </div>
            <div class="text-xs text-right text-gray-500">
              <div>Geplaatst door:</div>
              <div class="font-medium">
                {{ visit.advertized_by?.full_name ?? 'Onbekend' }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <div>
              <span class="font-medium">Functies:</span>
              <span class="ml-1">
                {{ visit.functions.map((f) => f.name).join(', ') || '-' }}
              </span>
            </div>
            <div>
              <span class="font-medium">Soorten:</span>
              <span class="ml-1">
                {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              <span class="font-medium">Onderzoekers:</span>
              <span class="ml-1">
                {{ otherResearchersLabel(visit) }}
              </span>
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
            <div v-if="visit.duration != null">
              <span class="font-medium">Duur:</span>
              <span class="ml-1">{{ formatDurationHours(visit.duration) }}</span>
            </div>
            <div v-if="visit.expertise_level">
              <span class="font-medium">Expertiseniveau:</span>
              <span class="ml-1">{{ visit.expertise_level }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-1 mt-1">
            <UBadge v-if="visit.wbc" class="bg-amber-600 mr-1">WBC</UBadge>
            <UBadge v-if="visit.fiets" class="bg-amber-600 mr-1">Fiets</UBadge>
            <UBadge v-if="visit.hub" class="bg-amber-600 mr-1">HUB</UBadge>
            <UBadge v-if="visit.dvp" class="bg-amber-600 mr-1">DVP</UBadge>
            <UBadge v-if="visit.sleutel" class="bg-amber-600 mr-1">Sleutel</UBadge>
          </div>

          <div class="mt-1">
            <div class="font-medium">Opmerkingen veld</div>
            <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {{ visit.remarks_field || 'Geen opmerkingen' }}
            </div>
          </div>

          <div class="mt-4 flex">
            <UButton
              v-if="visit.can_accept"
              :loading="acceptingId === visit.id"
              @click="onAccept(visit)"
            >
              Accepteer
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
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

  type AdvertisedVisitRow = {
    id: number
    project_code: string
    project_location: string
    cluster_id: number
    cluster_number: number
    cluster_address: string
    status: VisitStatusCode
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
    part_of_day: string | null
    start_time_text: string | null
    researchers: UserName[]
    advertized: boolean
    quote: boolean
    advertized_by: UserName | null
    can_accept: boolean | null
  }

  const { $api } = useNuxtApp()
  const toast = useToast()

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

  const ICONS = [
    'hand-metal',
    'leafy-green',
    'ribbon',
    'smile',
    'flower',
    'birdhouse',
    'eye-closed',
    'telescope',
    'party-popper',
    'bottle-wine',
    'cake',
    'cake-slice',
    'flame',
    'gift',
    'gem',
    'rose',
    'kayak',
    'cat',
    'dog',
    'panda',
    'squirrel',
    'paw-print',
    'rat'
  ] as const

  type IconName = (typeof ICONS)[number]

  const {
    data,
    pending,
    error,
    refresh
  } = useAsyncData(
    'advertised-visits',
    () => {
      const query: Record<string, string> = {}
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      return $api<AdvertisedVisitRow[]>('/visits/advertised/list', { query })
    },
    {
      watch: [() => simulatedDate.value, () => testModeEnabled.value]
    }
  )

  function formatDurationHours(durationMinutes: number): string {
    const hours = durationMinutes / 60
    const rounded = Math.round(hours * 10) / 10
    const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    return `${formatted} uur`
  }

  const visits = computed(() => data.value ?? [])

  const visitIcons = computed<Record<number, IconName>>(() => {
    const items = visits.value
    if (!items.length) return {}

    const result: Record<number, IconName> = {}
    const pool: IconName[] = [...ICONS]

    for (const v of items) {
      if (pool.length === 0) {
        // Refill when we have more visits than icons; reuse is fine then.
        pool.push(...ICONS)
      }
      const idx = Math.floor(Math.random() * pool.length)
      const removed = pool.splice(idx, 1) as IconName[]
      const icon = (removed[0] ?? ICONS[0]) as IconName
      result[v.id] = icon
    }

    return result
  })

  const acceptingId = ref<number | null>(null)

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function otherResearchersLabel(visit: AdvertisedVisitRow): string {
    const names = (visit.researchers || []).map((r) => r.full_name || `Gebruiker #${r.id}`)
    if (names.length === 0) return '-'
    return names.join(', ')
  }

  async function onAccept(visit: AdvertisedVisitRow): Promise<void> {
    acceptingId.value = visit.id
    try {
      const query: Record<string, string> = {}
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }

      await $api(`/visits/${visit.id}/accept-advertised`, { method: 'POST', query })
      toast.add({ title: 'Dit onderzoek is nu aan je toegewezen.', color: 'success' })
      await refresh()
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string }; response?: { status?: number } }
      const detail = err?.data?.detail

      let title = 'Kon dit bezoek niet toewijzen'
      if (detail === 'Visit is not advertised for takeover') {
        title = 'Dit bezoek is niet meer geadverteerd of al door iemand anders overgenomen.'
      } else if (detail === 'Visit is not in a state that allows takeover') {
        title = 'Dit bezoek is niet meer in een toestand waarin het kan worden overgenomen.'
      } else if (err?.response?.status === 403) {
        title = 'Je voldoet niet aan de vereisten om dit bezoek over te nemen.'
      }

      toast.add({ title, color: 'error' })

      try {
        await refresh()
      } catch {
        void 0
      }
    } finally {
      acceptingId.value = null
    }
  }
</script>
