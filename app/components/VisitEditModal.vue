<template>
  <UModal
    :open="open"
    title="Bezoek bewerken"
    fullscreen
    :ui="{ footer: 'justify-end' }"
    @update:open="(value) => emit('update:open', value)"
  >
    <template #body>
      <div v-if="loading" class="text-sm text-gray-700 dark:text-gray-300">
        Bezoek wordt geladen...
      </div>
      <div v-else-if="error" class="text-sm text-red-500">
        Kon dit bezoek niet laden.
      </div>
      <div v-else-if="visit" class="space-y-4">
        <div class="text-xs text-gray-500 mb-2">
          Project {{ visit.project_code }} · Cluster {{ visit.cluster_number }} ·
          {{ visit.cluster_address }}
          <span v-if="visit.project_customer"> · Klant: {{ visit.project_customer }}</span>
        </div>

        <div v-if="visit.project_google_drive_folder" class="my-2">
          <a
            :href="visit.project_google_drive_folder"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary-600 underline"
          >
            Project folder
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs mb-1">Project</label>
            <USelectMenu
              :model-value="projectOptions.find((o) => o.value === visit!.project_id)"
              :items="projectOptions"
              searchable
              searchable-placeholder="Zoek projectcode"
              placeholder="Project"
              class="w-2xs"
              @update:model-value="onProjectChange"
            />
          </div>
          <div>
            <label class="block text-xs mb-1">Cluster</label>
            <USelectMenu
              :model-value="getClusterOption()"
              :items="clusterOptions"
              placeholder="Cluster"
              class="w-64"
              @update:model-value="onClusterChange"
            />
            <p v-if="clusterAddress" class="mt-1 text-xs text-gray-500">
              {{ clusterAddress }}
            </p>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs">Functies</label>
            </div>
            <UInput
              v-if="visit?.custom_function_name !== null && !isConfiguredCustomName(visit?.custom_function_name)"
              v-model="visit!.custom_function_name"
              placeholder="Maatwerk functie"
            />
            <UInputMenu
              v-else
              :model-value="getFunctionOptions()"
              :items="combinedFunctionOptions"
              multiple
              class="w-2xs"
              @update:model-value="onFunctionSelect"
            />
          </div>
          <div>
            <label class="block text-xs mb-1">Soorten</label>
            <UInput
              v-if="visit?.custom_species_name !== null"
              v-model="visit!.custom_species_name"
              placeholder="Maatwerk soort"
            />
            <UInputMenu
              v-else
              :model-value="mapIdsToOptions(visit?.species_ids ?? [], speciesOptions)"
              :items="speciesOptions"
              multiple
              :filter-fields="['label', 'abbreviation']"
              class="w-3xs"
              @update:model-value="(sel) => { visit!.species_ids = sel.map((o) => o.value as number) }"
            />
            <div class="mt-1">
              <UCheckbox
                :model-value="!!((visit?.custom_function_name && !isConfiguredCustomName(visit?.custom_function_name)) || visit?.custom_species_name)"
                label="Andere soort"
                class="text-xs"
                @update:model-value="(val: boolean | 'indeterminate') => onToggleCustomVisit(val === true)"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs mb-1">Van</label>
            <UInput v-model="visit.from_date" type="date" />
          </div>
          <div>
            <label class="block text-xs mb-1">Tot</label>
            <UInput v-model="visit.to_date" type="date" />
          </div>

          <div>
            <label class="block text-xs mb-1">Voorlopige week</label>
            <UInput
              v-model.number="visit.provisional_week"
              type="number"
              min="1"
              max="53"
            />
            <div class="mt-1">
              <UTooltip text="Seizoensplanning behoudt deze week (tenzij leeg)">
                <UCheckbox
                  v-model="visit.provisional_locked"
                  label="Voorlopige week vastzetten"
                  class="text-xs"
                />
              </UTooltip>
            </div>
          </div>

          <div>
            <label class="block text-xs mb-1">{{ featureDailyPlanning ? 'Geplande datum' : 'Gepland voor week' }}</label>
            <UInput v-if="featureDailyPlanning" v-model="visit.planned_date" type="date" />
            <UInput
              v-else
              v-model.number="visit.planned_week"
              type="number"
              min="1"
              max="53"
            />
            <div class="mt-1">
              <UCheckbox
                v-model="visit.planning_locked"
                label="Planning vastzetten"
                class="text-xs"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs mb-1">Onderzoekers</label>
            <UInputMenu
              :model-value="mapIdsToOptions(visit.researcher_ids ?? [], researcherOptions)"
              :items="researcherOptions"
              multiple
              class="w-3xs"
              @update:model-value="onResearchersChange"
            />
            <div class="mt-1">
              <UTooltip text="Weekplanner gebruikt exact deze onderzoekers (hard constraint) en verwijdert ze niet bij reset">
                <UCheckbox
                  v-model="visit.researchers_locked"
                  label="Onderzoekers vastzetten"
                  class="text-xs"
                />
              </UTooltip>
            </div>
          </div>

          <div>
            <label class="block text-xs mb-1">Aantal onderzoekers</label>
            <UInput v-model.number="visit.required_researchers" type="number" />
          </div>

          <div>
            <label class="block text-xs mb-1">Bezoek nr</label>
            <UInput v-model.number="visit.visit_nr" type="number" />
          </div>

          <div>
            <label class="block text-xs mb-1">Starttijd</label>
            <UInput v-model="visit.start_time_text" />
          </div>

          <div>
            <label class="block text-xs mb-1">Dagdeel</label>
            <USelectMenu
              :model-value="visit!.part_of_day === null ? undefined : partOfDayOptions.find((o) => o.value === visit!.part_of_day)"
              :items="partOfDayOptions"
              placeholder="Kies dagdeel"
              class="w-3xs"
              @update:model-value="(opt) => { visit!.part_of_day = opt?.value ?? null }"
            />
          </div>
          <div>
            <label class="block text-xs mb-1">Duur (uur)</label>
            <UInput
              :model-value="durationHours(visit!.duration)"
              type="number"
              step="0.5"
              @update:model-value="(h: number | null) => { visit!.duration = h == null ? null : Math.round(h * 60) }"
            />
          </div>

          <div>
            <label class="block text-xs mb-1">Min temp (°C)</label>
            <UInput v-model.number="visit.min_temperature_celsius" type="number" />
          </div>
          <div>
            <label class="block text-xs mb-1">Max wind (Bft)</label>
            <UInput v-model.number="visit.max_wind_force_bft" type="number" />
          </div>
          <div>
            <label class="block text-xs mb-1">Max neerslag</label>
            <UInput v-model="visit.max_precipitation" />
          </div>
          <div v-if="showExpertise">
            <label class="block text-xs mb-1">Vleermuis ervaring</label>
            <USelectMenu
              :model-value="selectedExperienceOption(visit!.expertise_level)"
              :items="experienceLevelOptionsArr"
              placeholder="Kies niveau"
              @update:model-value="(opt) => { visit!.expertise_level = opt?.value ?? null }"
            />
          </div>

          <div class="col-span-1 md:col-span-2">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
              <UCheckbox v-model="visit.wbc" label="WBC" />
              <UCheckbox v-model="visit.fiets" label="Fiets" />
              <UCheckbox v-model="visit.vog" label="VOG" />
              <UCheckbox v-model="visit.hub" label="HUB" />
              <UCheckbox v-model="visit.dvp" label="DVP" />
              <UCheckbox v-model="visit.sleutel" label="Sleutel" />
              <UCheckbox v-model="visit.priority" label="Prioriteit" />
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs mb-1">Opmerkingen planning</label>
            <UTextarea v-model="visit.remarks_planning" class="w-xl" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs mb-1">Opmerkingen veld</label>
            <UTextarea v-model="visit.remarks_field" class="w-xl" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="onCancel">Annuleren</UButton>
      <UButton :loading="saving" @click="onSave">Opslaan</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { validateIsoWeekWithinDateWindow } from '#imports'

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
  | 'needs_action'
  | 'provisional'

type CompactFunction = { id: number; name: string }
type CompactSpecies = { id: number; name: string; abbreviation?: string | null; family_name?: string | null }
type UserName = { id: number; full_name: string | null }

type VisitEditRow = {
  id: number
  project_id: number
  project_code: string
  project_location: string
  project_customer: string | null
  project_google_drive_folder: string | null
  cluster_id: number
  cluster_number: string
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
  planned_date: string | null
  provisional_week: number | null
  provisional_locked: boolean
  from_date: string | null
  to_date: string | null
  duration: number | null
  min_temperature_celsius: number | null
  max_wind_force_bft: number | null
  max_precipitation: string | null
  expertise_level: string | null
  wbc: boolean
  fiets: boolean
  vog: boolean
  hub: boolean
  dvp: boolean
  sleutel: boolean
  remarks_planning: string | null
  remarks_field: string | null
  priority: boolean
  part_of_day: string | null
  start_time_text: string | null
  planning_locked: boolean
  researchers_locked: boolean
  researchers: UserName[]
  researcher_ids: number[]
}

type Option = { label: string; value: number | null; abbreviation?: string | null }
type StringOption = { label: string; value: string | null }
type ProjectOption = Option
type ClusterOption = Option & { address?: string }

const props = defineProps<{
  visitId: number | null
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const { $api } = useNuxtApp()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()

const featureDailyPlanning = computed<boolean>(() => {
  const raw = runtimeConfig.public.featureDailyPlanning
  if (typeof raw === 'string') {
    return raw === 'true' || raw === '1'
  }
  return Boolean(raw)
})

const configuredCustomFunctionNames = computed<string[]>(() => {
  const raw = (runtimeConfig.public as Record<string, unknown>).customFunctionNames
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
})

function apiErrorMessage(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const detail = (e as { response?: { _data?: { detail?: unknown } } }).response?._data?.detail
    if (typeof detail === 'string') return detail
  }
}

function isConfiguredCustomName(name: string | null | undefined): boolean {
  if (!name) return false
  return configuredCustomFunctionNames.value.includes(name)
}

// State
const visit = ref<VisitEditRow | null>(null)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

// Options
const projectOptions = ref<ProjectOption[]>([])
const clusterOptions = ref<ClusterOption[]>([])
const functionOptions = ref<Option[]>([])
const speciesOptions = ref<Option[]>([])
const speciesMeta = ref<CompactSpecies[]>([])
const researcherOptions = ref<Option[]>([])

const clusterAddress = computed(() => {
  if (!visit.value) return ''
  const opt = clusterOptions.value.find(o => o.value === visit.value?.cluster_id)
  return opt?.address ?? visit.value.cluster_address
})

const customFunctionOptions = computed<Option[]>(() =>
  configuredCustomFunctionNames.value.map((name, index) => ({
    label: name,
    value: -(index + 1)
  }))
)

const combinedFunctionOptions = computed<Option[]>(() => [
  ...functionOptions.value,
  ...customFunctionOptions.value
])

const partOfDayOptions: StringOption[] = [
  { label: '\u00A0', value: null },
  { label: 'Ochtend', value: 'Ochtend' },
  { label: 'Dag', value: 'Dag' },
  { label: 'Avond', value: 'Avond' }
]

const experienceLevelOptionsArr: StringOption[] = [
  { label: '\u00A0', value: null },
  { label: 'Medior', value: 'Medior' },
  { label: 'Senior', value: 'Senior' }
]

function selectedExperienceOption(v: string | null | undefined): StringOption | undefined {
  if (v === null) return undefined
  return experienceLevelOptionsArr.find((o) => o.value === v)
}

function isVleermuisLabel(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'vleermuis'
}

function hasVleermuisSpecies(species: CompactSpecies[]): boolean {
  return species.some(
    (sp) => isVleermuisLabel(sp.family_name) || isVleermuisLabel(sp.name)
  )
}

function hasVleermuisSpeciesIds(ids: number[]): boolean {
  if (ids.length === 0) return false
  const speciesById = new Map(speciesMeta.value.map((sp) => [sp.id, sp]))
  return ids.some((id) => {
    const sp = speciesById.get(id)
    if (!sp) return false
    return isVleermuisLabel(sp.family_name) || isVleermuisLabel(sp.name)
  })
}

function hasVleermuisCustomName(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase().includes('vleermuis')
}

const showExpertise = computed(() => {
  if (!visit.value) return false
  if (visit.value.custom_species_name) {
    return hasVleermuisCustomName(visit.value.custom_species_name)
  }
  return hasVleermuisSpecies(visit.value.species) || hasVleermuisSpeciesIds(visit.value.species_ids)
})

function durationHours(minutes: number | null | undefined): number | null {
  if (minutes == null) return null
  return Math.round((minutes / 60) * 100) / 100
}

function mapIdsToOptions(ids: number[] | undefined, options: Option[]): Option[] {
  if (!ids || ids.length === 0) return []
  const idSet = new Set(ids)
  return options.filter((o) => o.value !== null && idSet.has(o.value))
}

// Load visit data
async function loadVisit(): Promise<void> {
  if (!props.visitId) return

  loading.value = true
  error.value = false
  clusterOptions.value = []

  try {
    const [data] = await Promise.all([
      $api<VisitEditRow>(`/visits/${props.visitId}`),
      loadStaticOptions()
    ])
    visit.value = {
      ...data,
      researcher_ids: data.researchers.map(r => r.id)
    }

    // Load cluster options for current project
    if (data.project_id) {
      const clusters = await $api<Array<{ id: number; cluster_number: string; address: string }>>(
        '/clusters',
        { query: { project_id: data.project_id } }
      )
      clusterOptions.value = clusters.map((c) => ({
        label: c.cluster_number,
        value: c.id,
        address: c.address
      }))
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Load static options
async function loadStaticOptions(): Promise<void> {
  const [projects, functions, species, users] = await Promise.all([
    $api<Array<{ id: number; code: string; location: string }>>('/projects'),
    $api<Array<{ id: number; name: string }>>('/visits/options/functions'),
    $api<Array<{ id: number; name: string; abbreviation?: string | null; family_name?: string | null }>>('/visits/options/species'),
    $api<Array<{ id: number; full_name: string | null }>>('/admin/users')
  ])
  
  projectOptions.value = projects.map((p) => ({ label: p.code, value: p.id }))
  functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
  speciesMeta.value = species.map((s) => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation ?? null,
    family_name: s.family_name ?? null
  }))
  speciesOptions.value = speciesMeta.value.map((s) => ({
    label: s.name || s.abbreviation || '',
    value: s.id,
    abbreviation: s.abbreviation
  }))
  const mappedUsers = users
    .map((u) => ({ label: u.full_name ?? `Gebruiker #${u.id}`, value: u.id }))
    .sort((a, b) => a.label.localeCompare(b.label))
  researcherOptions.value = [{ label: '\u00A0', value: null }, ...mappedUsers]
}

// Event handlers
async function onProjectChange(opt: ProjectOption | undefined): Promise<void> {
  if (!opt || opt.value === null || !visit.value) return
  visit.value.project_id = opt.value
  visit.value.cluster_id = 0
  visit.value.cluster_number = ''
  visit.value.cluster_address = ''
  clusterOptions.value = []
  
  const clusters = await $api<Array<{ id: number; cluster_number: string; address: string }>>(
    '/clusters',
    { query: { project_id: opt.value } }
  )
  clusterOptions.value = clusters.map((c) => ({
    label: c.cluster_number,
    value: c.id,
    address: c.address
  }))
}

function onClusterChange(opt: ClusterOption | undefined): void {
  if (!opt || opt.value === null || !visit.value) return
  visit.value.cluster_id = opt.value
  visit.value.cluster_number = opt.label
  visit.value.cluster_address = opt.address ?? ''
}

function getClusterOption(): ClusterOption | undefined {
  if (!visit.value?.cluster_id) return undefined
  return { label: visit.value.cluster_number, value: visit.value.cluster_id, address: visit.value.cluster_address }
}

function getFunctionOptions(): Option[] {
  if (!visit.value) return []
  if (visit.value.custom_function_name && isConfiguredCustomName(visit.value.custom_function_name)) {
    const opt = customFunctionOptions.value.find(o => o.label === visit.value?.custom_function_name)
    return opt ? [opt] : []
  }
  return mapIdsToOptions(visit.value.function_ids, functionOptions.value)
}

function onFunctionSelect(sel: Option[]): void {
  if (!visit.value) return
  const customSel = sel.find(o => o.value !== null && (o.value as number) < 0)
  if (customSel) {
    visit.value.custom_function_name = customSel.label
    visit.value.function_ids = []
  } else {
    if (isConfiguredCustomName(visit.value.custom_function_name)) {
      visit.value.custom_function_name = null
    }
    visit.value.function_ids = sel.map(o => o.value as number)
  }
}

function onToggleCustomVisit(val: boolean): void {
  if (!visit.value) return
  if (val) {
    visit.value.custom_function_name = ''
    visit.value.custom_species_name = ''
    visit.value.function_ids = []
    visit.value.species_ids = []
  } else {
    visit.value.custom_function_name = null
    visit.value.custom_species_name = null
  }
}

function onResearchersChange(sel: Option[]): void {
  if (!visit.value) return
  const ids = sel.map((o) => o.value).filter((v): v is number => v !== null)
  visit.value.researcher_ids = ids
  visit.value.researchers = ids.map((id) => {
    const opt = researcherOptions.value.find((o) => o.value === id)
    return { id, full_name: opt?.label ?? null }
  })
}

function onCancel(): void {
  emit('update:open', false)
}

async function onSave(): Promise<void> {
  if (!visit.value) return

  const rawPlannedWeek = visit.value.planned_week as unknown
  const plannedWeek = rawPlannedWeek === '' || rawPlannedWeek == null ? null : (rawPlannedWeek as number)
  
  if (!featureDailyPlanning.value && plannedWeek != null) {
    const plannedWeekError = validateIsoWeekWithinDateWindow({
      week: plannedWeek,
      fromDate: visit.value.from_date,
      toDate: visit.value.to_date,
      label: 'Gepland voor week'
    })
    if (plannedWeekError) {
      toast.add({
        title: 'Opslaan mislukt',
        description: plannedWeekError,
        color: 'error'
      })
      return
    }
  }

  const rawProvisionalWeek = visit.value.provisional_week as unknown
  const provisionalWeek = rawProvisionalWeek === '' || rawProvisionalWeek == null ? null : (rawProvisionalWeek as number)
  
  if (provisionalWeek != null) {
    const provisionalWeekError = validateIsoWeekWithinDateWindow({
      week: provisionalWeek,
      fromDate: visit.value.from_date,
      toDate: visit.value.to_date,
      label: 'Voorlopige week'
    })
    if (provisionalWeekError) {
      toast.add({
        title: 'Opslaan mislukt',
        description: provisionalWeekError,
        color: 'error'
      })
      return
    }
  }

  if (visit.value.provisional_locked && provisionalWeek == null) {
    toast.add({
      title: 'Opslaan mislukt',
      description: 'Als voorlopige week is vastgezet, moet "Voorlopige week" ingevuld zijn.',
      color: 'error'
    })
    return
  }

  if (visit.value.planning_locked) {
    if (featureDailyPlanning.value) {
      if (!visit.value.planned_date) {
        toast.add({
          title: 'Opslaan mislukt',
          description: 'Als planning is vastgezet, moet "Geplande datum" ingevuld zijn.',
          color: 'error'
        })
        return
      }
    } else if (plannedWeek == null) {
      toast.add({
        title: 'Opslaan mislukt',
        description: 'Als planning is vastgezet, moet "Gepland voor week" ingevuld zijn.',
        color: 'error'
      })
      return
    }
    const researcherIds = visit.value.researcher_ids ?? visit.value.researchers.map((r) => r.id)
    if (researcherIds.length === 0) {
      toast.add({
        title: 'Opslaan mislukt',
        description: 'Als planning is vastgezet, moet je minimaal één onderzoeker kiezen.',
        color: 'error'
      })
      return
    }
  }

  if (visit.value.researchers_locked) {
    const researcherIds = visit.value.researcher_ids ?? visit.value.researchers.map((r) => r.id)
    if (researcherIds.length === 0) {
      toast.add({
        title: 'Opslaan mislukt',
        description: 'Als onderzoekers zijn vastgezet, moet je minimaal één onderzoeker kiezen.',
        color: 'error'
      })
      return
    }
  }

  saving.value = true
  try {
    const payload = {
      cluster_id: visit.value.cluster_id,
      required_researchers: visit.value.required_researchers,
      visit_nr: visit.value.visit_nr,
      planned_week: featureDailyPlanning.value ? null : plannedWeek,
      planned_date: visit.value.planned_date || null,
      planning_locked: visit.value.planning_locked,
      researchers_locked: visit.value.researchers_locked,
      provisional_week: provisionalWeek,
      provisional_locked: visit.value.provisional_locked,
      from_date: visit.value.from_date,
      to_date: visit.value.to_date,
      duration: visit.value.duration,
      min_temperature_celsius: visit.value.min_temperature_celsius,
      max_wind_force_bft: visit.value.max_wind_force_bft,
      max_precipitation: visit.value.max_precipitation,
      expertise_level: visit.value.expertise_level,
      wbc: visit.value.wbc,
      fiets: visit.value.fiets,
      vog: visit.value.vog,
      hub: visit.value.hub,
      dvp: visit.value.dvp,
      sleutel: visit.value.sleutel,
      remarks_planning: visit.value.remarks_planning,
      remarks_field: visit.value.remarks_field,
      priority: visit.value.priority,
      part_of_day: visit.value.part_of_day,
      start_time_text: visit.value.start_time_text,
      function_ids: visit.value.function_ids,
      species_ids: visit.value.species_ids,
      custom_function_name: visit.value.custom_function_name,
      custom_species_name: visit.value.custom_species_name,
      researcher_ids: visit.value.researcher_ids ?? visit.value.researchers.map((r) => r.id)
    }
    
    await $api(`/visits/${visit.value.id}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Bezoek opgeslagen', color: 'success' })

    if (visit.value.researchers_locked) {
      const researcherIds = visit.value.researcher_ids ?? visit.value.researchers.map((r) => r.id)
      if (researcherIds.length > 0) {
        const qualResult = await $api<{ unqualified: { id: number; full_name: string | null }[] }>(
          `/visits/${visit.value.id}/researcher-qualification`,
          { query: { researcher_ids: researcherIds } }
        )
        if (qualResult.unqualified.length > 0) {
          const names = qualResult.unqualified.map((r) => r.full_name ?? `#${r.id}`).join(', ')
          toast.add({
            title: 'Waarschuwing: onderzoeker niet gekwalificeerd',
            description: `Onderzoeker(s) ${names} zijn niet gekwalificeerd voor dit bezoek.`,
            color: 'warning'
          })
        }
      }
    }

    emit('saved')
    emit('update:open', false)
  } catch (e) {
    toast.add({ title: 'Opslaan mislukt', description: apiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

// Watch for modal open
watch(() => props.open, (isOpen) => {
  if (isOpen && props.visitId) {
    loadVisit()
  }
})

onMounted(() => {
  // Static options are loaded in loadVisit to guarantee they are ready before the form renders
})
</script>
