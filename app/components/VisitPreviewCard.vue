<template>
  <UCard
    class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all dark:hover:ring-primary-400"
    @click="emit('open')"
  >
    <div class="flex items-start justify-between mb-2">
      <div>
        <div class="font-bold text-gray-900 dark:text-white">
          <span v-if="visit.project_location" class="mr-1">{{ visit.project_location }} -</span>
          {{ visit.project_code }}
          <span class="text-gray-500 font-normal ml-1">
            Cluster {{ visit.cluster_number }} - {{ visit.visit_nr }}
            <span v-if="visit.cluster_address">({{ visit.cluster_address }})</span>
          </span>
        </div>
      </div>
    </div>

    <div
      class="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-1"
    >
      <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 font-semibold">
        <div v-if="featureDailyPlanning && visit.planned_date" class="mb-1 text-primary-600 dark:text-primary-400 font-bold">
          {{ formatDate(visit.planned_date) }}
          <span v-if="visit.part_of_day"> · {{ visit.part_of_day }}</span>
        </div>
        <div v-else-if="visit.from_date || visit.to_date" class="mb-1">
          {{ formatDate(visit.from_date) }} - {{ formatDate(visit.to_date) }}
          <span v-if="visit.part_of_day"> · {{ visit.part_of_day }}</span>
        </div>
        <div class="pt-1 mb-2">
          <span v-if="weekDisplay">{{ weekDisplay }}</span>
        </div>
        <UBadge size="md" variant="subtle" color="neutral">
          {{ statusLabel(visit.status) }}
        </UBadge>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 mt-2">
        <div>
          <span class="font-semibold text-gray-700 dark:text-gray-300">Functies: </span>
          {{
            visit.functions.length
              ? visit.functions.map((f) => f.name).join(', ')
              : visit.custom_function_name || '-'
          }}
        </div>
        <div>
          <span class="font-semibold text-gray-700 dark:text-gray-300">Soorten: </span>
          {{
            visit.species.length
              ? visit.species.map((s) => s.abbreviation || s.name).join(', ')
              : visit.custom_species_name || '-'
          }}
        </div>
      </div>

      <div>
        <span class="font-semibold text-gray-700 dark:text-gray-300">Onderzoekers: </span>
        {{
          visit.researchers.length
            ? visit.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ')
            : '-'
        }}
      </div>

      <div v-if="hasFlags" class="mt-1 flex flex-wrap gap-1 mt-2">
        <UBadge v-if="visit.wbc" class="bg-gray-400 mr-1">WBC</UBadge>
        <UBadge v-if="visit.fiets" class="bg-gray-400 mr-1">Fiets</UBadge>
        <UBadge v-if="visit.hub" class="bg-gray-400 mr-1">HUB</UBadge>
        <UBadge v-if="visit.dvp" class="bg-gray-400 mr-1">DVP</UBadge>
        <UBadge v-if="visit.sleutel" class="bg-gray-400 mr-1">Sleutel</UBadge>
        <UBadge v-if="visit.priority" class="bg-gray-400 mr-1">Prioriteit</UBadge>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
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

  type VisitPreview = {
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

  const props = defineProps<{ visit: VisitPreview }>()

  const emit = defineEmits<{ open: [] }>()

  const hasFlags = computed<boolean>(
    () =>
      props.visit.wbc ||
      props.visit.fiets ||
      props.visit.hub ||
      props.visit.dvp ||
      props.visit.sleutel ||
      props.visit.priority
  )

  const weekDisplay = computed<string>(() => {
    if (featureDailyPlanning.value) {
      if (props.visit.provisional_week != null) {
        return `Voorlopige week: ${props.visit.provisional_week}`
      }
      return ''
    }

    if (props.visit.planned_week != null) {
      return `Geplande week: ${props.visit.planned_week}`
    }
    if (props.visit.provisional_week != null) {
      return `Voorlopige week: ${props.visit.provisional_week}`
    }
    return 'Week: onbekend'
  })

  const runtimeConfig = useRuntimeConfig()

  const featureDailyPlanning = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureDailyPlanning
    if (typeof raw === 'string') {
      return raw === 'true' || raw === '1'
    }
    return Boolean(raw)
  })

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

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }
</script>
