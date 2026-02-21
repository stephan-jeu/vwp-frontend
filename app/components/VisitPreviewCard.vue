<template>
  <UCard
    :class="[
      'cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all dark:hover:ring-primary-400',
      selected
        ? 'ring-2 ring-primary-500 dark:ring-primary-400 bg-primary-50 dark:bg-primary-900/20'
        : ''
    ]"
    @click="emit('open')"
  >
    <div class="flex items-start justify-between mb-1">
      <div class="test-xs font-bold text-gray-900 dark:text-white leading-tight">
        <span v-if="visit.project_location" class="mr-1">{{ visit.project_location }} -</span>
        {{ visit.project_code }}
        <span class="text-gray-500 font-normal ml-1 text-xs">
          C{{ visit.cluster_number }} {{ visit.visit_nr ? `- ${visit.visit_nr}` : '' }}
          <span v-if="visit.cluster_address">({{ visit.cluster_address }})</span>
        </span>
      </div>
      <UCheckbox
        v-if="selectable"
        :model-value="selected"
        class="ml-2"
        @click.stop
        @update:model-value="emit('update:selected', $event as boolean)"
      />
    </div>

    <!-- Main Content Area -->
    <div
      class="mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-0.5"
    >
      <!-- Date & Status Row -->
      <div class="flex items-center justify-between">
        <div class="font-medium text-gray-800 dark:text-gray-200">
          <span
            v-if="featureDailyPlanning && visit.planned_date"
            class="text-primary-600 dark:text-primary-400 font-bold"
          >
            {{ formatDate(visit.planned_date) }}
            <span v-if="visit.part_of_day"> · {{ visit.part_of_day }}</span>
          </span>
          <span v-else-if="visit.from_date || visit.to_date">
            {{ formatDate(visit.from_date) }} - {{ formatDate(visit.to_date) }}
            <span v-if="visit.part_of_day"> · {{ visit.part_of_day }}</span>
          </span>
          <span v-if="weekDisplay" class="ml-1 text-gray-400 font-normal">
            ({{ weekDisplay }})
          </span>
        </div>
        <UBadge size="xs" variant="subtle" color="neutral" class="ml-2 whitespace-nowrap">
          {{ statusLabel(visit.status) }}
        </UBadge>
      </div>

      <!-- Functions / Species Combined -->
      <div class="flex flex-wrap gap-x-3 text-xs leading-snug">
        <div>
          <span class="font-semibold text-gray-700 dark:text-gray-300">F: </span>
          {{
            visit.functions.length
              ? visit.functions.map((f) => f.name).join(', ')
              : visit.custom_function_name || '-'
          }}
        </div>
        <div>
          <span class="font-semibold text-gray-700 dark:text-gray-300">S: </span>
          {{
            visit.species.length
              ? visit.species.map((s) => s.name || s.abbreviation).join(', ')
              : visit.custom_species_name || '-'
          }}
        </div>
      </div>

      <!-- Researchers -->
      <div class="truncate text-xs text-gray-500 dark:text-gray-400">
        <UIcon name="i-heroicons-user" class="w-3 h-3 inline-block -mt-0.5 mr-1" />
        {{
          visit.researchers.length
            ? visit.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ')
            : '-'
        }}
      </div>

      <!-- Flags -->
      <div v-if="hasFlags" class="flex flex-wrap gap-1 pt-1">
        <UBadge v-if="visit.wbc" size="xs" color="neutral" variant="soft">WBC</UBadge>
        <UBadge v-if="visit.fiets" size="xs" color="neutral" variant="soft">Fiets</UBadge>
        <UBadge v-if="visit.hub" size="xs" color="neutral" variant="soft">HUB</UBadge>
        <UBadge v-if="visit.dvp" size="xs" color="neutral" variant="soft">DVP</UBadge>
        <UBadge v-if="visit.sleutel" size="xs" color="neutral" variant="soft">Sleutel</UBadge>
        <UBadge v-if="visit.priority" size="xs" color="warning" variant="soft">Prioriteit</UBadge>
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
    hub: boolean
    dvp: boolean
    sleutel: boolean
    priority: boolean
    visit_code: string | null
  }

  const props = withDefaults(
    defineProps<{
      visit: VisitPreview
      selectable?: boolean
      selected?: boolean
    }>(),
    {
      selectable: false,
      selected: false
    }
  )

  const emit = defineEmits<{
    open: []
    'update:selected': [value: boolean]
  }>()

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
