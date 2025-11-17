<template>
  <div>
    <UPageHeader title="Alle bezoeken" />

    <div class="mt-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 flex-1">
        <UInput
          v-model="search"
          placeholder="Zoek op project, locatie, cluster, functies, soorten, onderzoekers"
          class="w-full"
        />
        <USelectMenu
          v-model="selectedStatuses"
          :items="statusOptions"
          multiple
          placeholder="Status"
          class="w-56"
        />
      </div>

      <div class="flex items-center gap-2">
        <UButton
          v-if="isAdmin && !showCreate"
          color="primary"
          icon="i-heroicons-plus"
          @click="onStartCreate"
        >
          Toevoegen
        </UButton>
      </div>
    </div>

    <UCard v-if="isAdmin && showCreate" class="mt-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-xs mb-1">Project</label>
          <USelectMenu
            v-model="selectedProject"
            :items="projectOptions"
            searchable
            searchable-placeholder="Zoek projectcode"
            placeholder="Project"
            @update:model-value="onProjectChange"
          />
          <p v-if="selectedProjectDetails" class="mt-1 text-xs text-gray-500">
            {{ selectedProjectDetails.location }}
          </p>
        </div>
        <div>
          <label class="block text-xs mb-1">Cluster</label>
          <USelectMenu
            v-model="selectedCluster"
            :items="clusterOptions"
            placeholder="Cluster"
            :disabled="!selectedProject"
          />
          <p v-if="selectedClusterDetails" class="mt-1 text-xs text-gray-500">
            {{ selectedClusterDetails.address }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs mb-1">Functies</label>
          <USelectMenu
            :model-value="createFunctions"
            :items="functionOptions"
            multiple
            class="w-2xs"
            @update:model-value="(sel) => (createFunctionIds = sel.map((o) => o.value))"
          />
        </div>
        <div>
          <label class="block text-xs mb-1">Soorten</label>
          <USelectMenu
            :model-value="createSpecies"
            :items="speciesOptions"
            multiple
            class="w-3xs"
            @update:model-value="(sel) => (createSpeciesIds = sel.map((o) => o.value))"
          />
        </div>

        <div>
          <label class="block text-xs mb-1">Aantal onderzoekers</label>
          <UInput v-model.number="createRequiredResearchers" type="number" />
        </div>
        <div>
          <label class="block text-xs mb-1">Voorkeursonderzoeker</label>
          <USelectMenu
            :model-value="preferredResearcherOption"
            :items="researcherOptions"
            searchable
            placeholder="Kies onderzoeker"
            @update:model-value="(opt) => (createPreferredResearcherId = opt?.value ?? null)"
          />
        </div>

        <div>
          <label class="block text-xs mb-1">Van</label>
          <UInput v-model="createFromDate" type="date" />
        </div>
        <div>
          <label class="block text-xs mb-1">Tot</label>
          <UInput v-model="createToDate" type="date" />
        </div>

        <div>
          <label class="block text-xs mb-1">Bezoek nr</label>
          <UInput v-model.number="createVisitNr" type="number" />
        </div>

        <div>
          <label class="block text-xs mb-1">Starttijd</label>
          <UInput v-model="createStartTimeText" />
        </div>

        <div>
          <label class="block text-xs mb-1">Dagdeel</label>
          <USelectMenu
            :model-value="partOfDayOptions.find((o) => o.value === createPartOfDay)"
            :items="partOfDayOptions"
            placeholder="Kies dagdeel"
            @update:model-value="(opt) => (createPartOfDay = opt?.value ?? null)"
          />
        </div>
        <div>
          <label class="block text-xs mb-1">Duur (uur)</label>
          <UInput v-model.number="createDurationHours" type="number" step="0.5" />
        </div>

        <div>
          <label class="block text-xs mb-1">Min temp (°C)</label>
          <UInput v-model.number="createMinTemperature" type="number" />
        </div>
        <div>
          <label class="block text-xs mb-1">Max wind (Bft)</label>
          <UInput v-model.number="createMaxWind" type="number" />
        </div>
        <div>
          <label class="block text-xs mb-1">Max neerslag</label>
          <UInput v-model="createMaxPrecipitation" />
        </div>
        <div>
          <label class="block text-xs mb-1">Ervaring</label>
          <USelectMenu
            :model-value="selectedExperienceOption(createExpertiseLevel)"
            :items="experienceLevelOptionsArr"
            placeholder="Kies niveau"
            @update:model-value="(opt) => (createExpertiseLevel = opt?.value ?? null)"
          />
        </div>

        <div class="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
          <UCheckbox v-model="createWbc" label="WBC" />
          <UCheckbox v-model="createFiets" label="Fiets" />
          <UCheckbox v-model="createHub" label="HUB" />
          <UCheckbox v-model="createDvp" label="DvP" />
          <UCheckbox v-model="createSleutel" label="Sleutel" />
          <UCheckbox v-model="createPriority" label="Prioriteit" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs mb-1">Opmerkingen planning</label>
          <UTextarea v-model="createRemarksPlanning" class="w-xl" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs mb-1">Opmerkingen veld</label>
          <UTextarea v-model="createRemarksField" class="w-xl" />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <UButton color="neutral" variant="soft" @click="onCancelCreate">Annuleren</UButton>
        <UButton :loading="creating" @click="onCreateVisit">Opslaan</UButton>
      </div>
    </UCard>

    <UCard class="mt-6">
      <div v-if="rows.length === 0 && !loading" class="p-4 text-sm text-gray-500">
        Geen bezoeken om te tonen.
      </div>

      <div v-else class="flex flex-col gap-4">
        <UTable
          :data="rows"
          :columns="columns"
          :loading="loading"
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
          class="flex-1"
        >
          <template #status-cell="{ row }">
            <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
              {{ statusLabel(row.original.status) }}
            </span>
          </template>

          <template #functions-cell="{ row }">
            <span
              class="text-xs text-gray-700 dark:text-gray-300 max-w-xs whitespace-normal break-words block"
            >
              {{ row.original.functions.map((f) => f.name).join(', ') }}
            </span>
          </template>

          <template #species-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{ row.original.species.map((s) => s.abbreviation || s.name).join(', ') }}
            </span>
          </template>

          <template #period-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{ formatDate(row.original.from_date) }} – {{ formatDate(row.original.to_date) }}
            </span>
          </template>

          <template #researchers-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{
                row.original.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ')
              }}
            </span>
          </template>

          <template #expand-cell="{ row }">
            <UButton
              variant="outline"
              color="neutral"
              size="xs"
              :icon="row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus'"
              @click.stop="row.toggleExpanded()"
            />
          </template>

          <template #expanded="{ row }">
            <div v-if="!isAdmin" class="px-3 pb-3 text-sm space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span v-if="row.original.wbc" class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                    >WBC</span
                  >
                  <span v-if="row.original.fiets" class="px-2 mx-1  py-0.5 rounded-full bg-gray-200"
                    >Fiets</span
                  >
                  <span v-if="row.original.hub" class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                    >HUB</span
                  >
                  <span v-if="row.original.dvp" class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                    >DvP</span
                  >
                  <span v-if="row.original.sleutel" class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                    >Sleutel</span
                  >
                  <span v-if="row.original.priority" class="px-2 mx-1 py-0.5 rounded-full bg-amber-200"
                    >Prioriteit</span
                  >
                </div>
                <div>
                  <span class="font-medium">Duur:</span>
                  {{ durationHours(row.original.duration) ?? '-' }} uur
                </div>
                <div>
                  <span class="font-medium">Weercondities:</span>
                  Min {{ row.original.min_temperature_celsius ?? '-' }} °C, max wind
                  {{ row.original.max_wind_force_bft ?? '-' }}, max neerslag
                  {{ row.original.max_precipitation || '-' }}
                </div>
                <div>
                  <span class="font-medium">Bezoek nr:</span> {{ row.original.visit_nr || '-' }}
                </div>

              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div class="font-medium mb-1">Opmerkingen planning</div>
                  <p class="text-xs whitespace-pre-line">
                    {{ row.original.remarks_planning || 'Geen opmerkingen' }}
                  </p>
                </div>
                <div>
                  <div class="font-medium mb-1">Opmerkingen veld</div>
                  <p class="text-xs whitespace-pre-line">
                    {{ row.original.remarks_field || 'Geen opmerkingen' }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="px-3 pb-3">
              <div class="text-xs mb-2 text-gray-500">
                Project {{ row.original.project_code }} · Cluster
                {{ row.original.cluster_number }} ·
                {{ row.original.cluster_address }}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs mb-1">Functies</label>
                  <USelectMenu
                    :model-value="mapIdsToOptions(row.original.function_ids, functionOptions)"
                    :items="functionOptions"
                    multiple
                    class="w-2xs"
                    @update:model-value="
                      (sel) => (row.original.function_ids = sel.map((o) => o.value))
                    "
                  />
                </div>
                <div>
                  <label class="block text-xs mb-1">Soorten</label>
                  <USelectMenu
                    :model-value="mapIdsToOptions(row.original.species_ids, speciesOptions)"
                    :items="speciesOptions"
                    multiple
                    class="w-3xs"
                    @update:model-value="
                      (sel) => (row.original.species_ids = sel.map((o) => o.value))
                    "
                  />
                </div>

                <div>
                  <label class="block text-xs mb-1">Aantal onderzoekers</label>
                  <UInput v-model.number="row.original.required_researchers" type="number" />
                </div>
                <div>
                  <label class="block text-xs mb-1">Voorkeursonderzoeker</label>
                  <USelectMenu
                    :model-value="
                      researcherOptions.find(
                        (o) => o.value === row.original.preferred_researcher_id
                      )
                    "
                    :items="researcherOptions"
                    searchable
                    placeholder="Kies onderzoeker"
                    @update:model-value="
                      (opt) => (row.original.preferred_researcher_id = opt?.value ?? null)
                    "
                  />
                </div>

                <div>
                  <label class="block text-xs mb-1">Van</label>
                  <UInput v-model="row.original.from_date" type="date" />
                </div>
                <div>
                  <label class="block text-xs mb-1">Tot</label>
                  <UInput v-model="row.original.to_date" type="date" />
                </div>

                <div>
                  <label class="block text-xs mb-1">Bezoek nr</label>
                  <UInput v-model.number="row.original.visit_nr" type="number" />
                </div>

                <div>
                  <label class="block text-xs mb-1">Starttijd</label>
                  <UInput v-model="row.original.start_time_text" />
                </div>

                <div>
                  <label class="block text-xs mb-1">Dagdeel</label>
                  <USelectMenu
                    :model-value="
                      partOfDayOptions.find((o) => o.value === row.original.part_of_day)
                    "
                    :items="partOfDayOptions"
                    placeholder="Kies dagdeel"
                    @update:model-value="(opt) => (row.original.part_of_day = opt?.value ?? null)"
                  />
                </div>
                <div>
                  <label class="block text-xs mb-1">Duur (uur)</label>
                  <UInput
                    :model-value="durationHours(row.original.duration)"
                    type="number"
                    step="0.5"
                    @update:model-value="
                      (h: number | null) =>
                        (row.original.duration = h == null ? null : Math.round(h * 60))
                    "
                  />
                </div>

                <div>
                  <label class="block text-xs mb-1">Min temp (°C)</label>
                  <UInput v-model.number="row.original.min_temperature_celsius" type="number" />
                </div>
                <div>
                  <label class="block text-xs mb-1">Max wind (Bft)</label>
                  <UInput v-model.number="row.original.max_wind_force_bft" type="number" />
                </div>
                <div>
                  <label class="block text-xs mb-1">Max neerslag</label>
                  <UInput v-model="row.original.max_precipitation" />
                </div>
                <div>
                  <label class="block text-xs mb-1">Ervaring</label>
                  <USelectMenu
                    :model-value="selectedExperienceOption(row.original.expertise_level)"
                    :items="experienceLevelOptionsArr"
                    placeholder="Kies niveau"
                    @update:model-value="
                      (opt) => (row.original.expertise_level = opt?.value ?? null)
                    "
                  />
                </div>

                <div class="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <UCheckbox v-model="row.original.wbc" label="WBC" />
                  <UCheckbox v-model="row.original.fiets" label="Fiets" />
                  <UCheckbox v-model="row.original.hub" label="HUB" />
                  <UCheckbox v-model="row.original.dvp" label="DvP" />
                  <UCheckbox v-model="row.original.sleutel" label="Sleutel" />
                  <UCheckbox v-model="row.original.priority" label="Prioriteit" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-xs mb-1">Opmerkingen planning</label>
                  <UTextarea v-model="row.original.remarks_planning" class="w-xl" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs mb-1">Opmerkingen veld</label>
                  <UTextarea v-model="row.original.remarks_field" class="w-xl" />
                </div>
              </div>

              <div class="mt-3 flex justify-end gap-2">
                <UModal title="Bezoek verwijderen">
                  <UButton color="error" variant="soft" size="xs">Verwijder</UButton>
                  <template #content>
                    <UCard>
                      <div>Weet je zeker dat je dit bezoek wilt verwijderen?</div>
                      <template #footer>
                        <div class="flex justify-end gap-2">
                          <UButton color="neutral" variant="ghost">Annuleer</UButton>
                          <UButton
                            color="error"
                            :loading="deletingId === row.original.id"
                            @click="onDeleteVisit(row.original.id)"
                          >
                            Verwijder
                          </UButton>
                        </div>
                      </template>
                    </UCard>
                  </template>
                </UModal>

                <UButton
                  size="xs"
                  color="primary"
                  :loading="savingId === row.original.id"
                  @click="onSaveVisit(row.original)"
                >
                  Opslaan
                </UButton>
              </div>
            </div>
          </template>
        </UTable>

        <div class="flex items-center justify-between mt-2">
          <div class="text-xs text-gray-500">Pagina {{ page }} · {{ total }} bezoeken</div>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="ghost" :disabled="page <= 1 || loading" @click="onPrevPage">
              Vorige
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              :disabled="page >= maxPage || loading"
              @click="onNextPage"
            >
              Volgende
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import type { TableColumn } from '#ui/types'
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'

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

  type Option = { label: string; value: number }
  type StringOption = { label: string; value: string }

  type ProjectOption = Option
  type ClusterOption = Option & { address?: string }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  const { $api } = useNuxtApp()
  const toast = useToast()

  const auth = useAuthStore()
  const { isAdmin } = storeToRefs(auth)

  const rows = ref<VisitListRow[]>([])
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(25)
  const total = ref(0)

  const search = ref('')

  type VisitStatusOption = { label: string; value: VisitStatusCode }

  const selectedStatuses = ref<VisitStatusOption[]>([])

  const statusOptions: VisitStatusOption[] = [
    { label: 'Aangemaakt', value: 'created' },
    { label: 'Open', value: 'open' },
    { label: 'Gepland', value: 'planned' },
    { label: 'Verlopen', value: 'overdue' },
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Uitgevoerd (afwijking)', value: 'executed_with_deviation' },
    { label: 'Niet uitgevoerd', value: 'not_executed' },
    { label: 'Goedgekeurd', value: 'approved' },
    { label: 'Afgekeurd', value: 'rejected' },
    { label: 'Geannuleerd', value: 'cancelled' }
  ] satisfies { label: string; value: VisitStatusCode }[]

  const columns: TableColumn<VisitListRow>[] = [
    { id: 'expand', header: '', enableSorting: false, cell: 'expand' },
    { accessorKey: 'project_code', header: 'Projectcode' },
    { accessorKey: 'project_location', header: 'Locatie' },
    { accessorKey: 'cluster_number', header: 'Cluster' },
    { id: 'status', header: 'Status' },
    { id: 'functions', header: 'Functies' },
    { id: 'species', header: 'Soorten' },
    { id: 'period', header: 'Periode' },
    { accessorKey: 'start_time_text', header: 'Starttijd' },
    { id: 'researchers', header: 'Onderzoekers' }
  ]

  const maxPage = computed(() => {
    if (total.value === 0) return 1
    return Math.max(1, Math.ceil(total.value / pageSize.value))
  })

  function statusLabel(code: VisitStatusCode): string {
    const found = statusOptions.find((s) => s.value === code)
    return found?.label ?? code
  }

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function durationHours(minutes: number | null | undefined): number | null {
    if (minutes == null) return null
    return Math.round((minutes / 60) * 10) / 10
  }

  async function loadVisits(): Promise<void> {
    loading.value = true
    try {
      const query: Record<string, unknown> = {
        page: page.value,
        page_size: pageSize.value
      }
      const term = search.value.trim()
      if (term) query.search = term
      if (selectedStatuses.value.length > 0)
        query.statuses = selectedStatuses.value.map((s) => s.value)

      const data = await $api<VisitListResponse>('/visits', { query })
      rows.value = data.items
      total.value = data.total
      page.value = data.page
      pageSize.value = data.page_size
    } finally {
      loading.value = false
    }
  }

  function onPrevPage(): void {
    if (page.value <= 1) return
    page.value -= 1
    void loadVisits()
  }

  function onNextPage(): void {
    if (page.value >= maxPage.value) return
    page.value += 1
    void loadVisits()
  }

  let searchTimer: ReturnType<typeof setTimeout> | null = null
  watch(search, () => {
    if (searchTimer) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      page.value = 1
      void loadVisits()
    }, 300)
  })

  watch(
    () => selectedStatuses.value.map((s) => s.value),
    () => {
      page.value = 1
      void loadVisits()
    }
  )

  // --- Options for admin form ---

  const projectOptions = ref<ProjectOption[]>([])
  const projectDetails = ref<Array<{ id: number; code: string; location: string }>>([])
  const clusterOptions = ref<ClusterOption[]>([])
  const functionOptions = ref<Option[]>([])
  const speciesOptions = ref<Option[]>([])
  const researcherOptions = ref<Option[]>([])

  const experienceLevelOptionsArr: StringOption[] = [
    { label: 'Nieuw', value: 'Nieuw' },
    { label: 'Junior', value: 'Junior' },
    { label: 'Senior', value: 'Senior' },
    { label: 'GZ', value: 'GZ' }
  ]

  function selectedExperienceOption(v: string | null | undefined): StringOption | undefined {
    return experienceLevelOptionsArr.find((o) => o.value === v)
  }

  const partOfDayOptions: StringOption[] = [
    { label: 'Ochtend', value: 'Ochtend' },
    { label: 'Dag', value: 'Dag' },
    { label: 'Avond', value: 'Avond' }
  ]

  function mapIdsToOptions(ids: number[] | undefined, options: Option[]): Option[] {
    if (!ids || ids.length === 0) return []
    const idSet = new Set(ids)
    return options.filter((o) => idSet.has(o.value))
  }

  async function loadStaticOptions(): Promise<void> {
    const [projects, functions, species, users] = await Promise.all([
      $api<Array<{ id: number; code: string; location: string }>>('/projects'),
      $api<Array<{ id: number; name: string }>>('/admin/functions'),
      $api<Array<{ id: number; name: string; abbreviation?: string | null }>>('/admin/species'),
      $api<Array<{ id: number; full_name: string | null }>>('/admin/users')
    ])
    projectDetails.value = projects
    projectOptions.value = projects.map((p) => ({ label: p.code, value: p.id }))
    functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
    speciesOptions.value = species.map((s) => ({ label: s.abbreviation ?? s.name, value: s.id }))
    researcherOptions.value = users
      .map((u) => ({ label: u.full_name ?? `Gebruiker #${u.id}`, value: u.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const selectedProject = ref<ProjectOption | undefined>(undefined)
  const selectedCluster = ref<ClusterOption | undefined>(undefined)

  const selectedProjectDetails = computed(() => {
    if (!selectedProject.value) return null
    return projectDetails.value.find((p) => p.id === selectedProject.value?.value) || null
  })

  const selectedClusterDetails = computed(() => {
    if (!selectedCluster.value) return null
    return { address: selectedCluster.value.address ?? '' }
  })

  async function onProjectChange(opt: ProjectOption | undefined): Promise<void> {
    selectedCluster.value = undefined
    clusterOptions.value = []
    if (!opt) return
    const clusters = await $api<Array<{ id: number; cluster_number: number; address: string }>>(
      '/clusters',
      { query: { project_id: opt.value } }
    )
    clusterOptions.value = clusters.map((c) => ({
      label: `Cluster ${c.cluster_number}`,
      value: c.id,
      address: c.address
    }))
  }

  // --- Create visit form state ---

  const showCreate = ref(false)
  const creating = ref(false)

  const createFunctionIds = ref<number[]>([])
  const createSpeciesIds = ref<number[]>([])
  const createRequiredResearchers = ref<number | null>(null)
  const createPreferredResearcherId = ref<number | null>(null)
  const createFromDate = ref('')
  const createToDate = ref('')
  const createVisitNr = ref<number | null>(null)
  const createStartTimeText = ref('')
  const createPartOfDay = ref<string | null>(null)
  const createDurationHours = ref<number | null>(null)
  const createMinTemperature = ref<number | null>(null)
  const createMaxWind = ref<number | null>(null)
  const createMaxPrecipitation = ref<string | null>(null)
  const createExpertiseLevel = ref<string | null>(null)
  const createWbc = ref(false)
  const createFiets = ref(false)
  const createHub = ref(false)
  const createDvp = ref(false)
  const createSleutel = ref(false)
  const createPriority = ref(false)
  const createRemarksPlanning = ref<string | null>(null)
  const createRemarksField = ref<string | null>(null)

  const createFunctions = computed(() =>
    mapIdsToOptions(createFunctionIds.value, functionOptions.value)
  )
  const createSpecies = computed(() =>
    mapIdsToOptions(createSpeciesIds.value, speciesOptions.value)
  )
  const preferredResearcherOption = computed(() =>
    createPreferredResearcherId.value == null
      ? undefined
      : researcherOptions.value.find((o) => o.value === createPreferredResearcherId.value)
  )

  function resetCreateForm(): void {
    selectedProject.value = undefined
    selectedCluster.value = undefined
    clusterOptions.value = []
    createFunctionIds.value = []
    createSpeciesIds.value = []
    createRequiredResearchers.value = null
    createPreferredResearcherId.value = null
    createFromDate.value = ''
    createToDate.value = ''
    createVisitNr.value = null
    createStartTimeText.value = ''
    createPartOfDay.value = null
    createDurationHours.value = null
    createMinTemperature.value = null
    createMaxWind.value = null
    createMaxPrecipitation.value = null
    createExpertiseLevel.value = null
    createWbc.value = false
    createFiets.value = false
    createHub.value = false
    createDvp.value = false
    createSleutel.value = false
    createPriority.value = false
    createRemarksPlanning.value = null
    createRemarksField.value = null
  }

  function onStartCreate(): void {
    showCreate.value = true
  }

  function onCancelCreate(): void {
    showCreate.value = false
    resetCreateForm()
  }

  async function onCreateVisit(): Promise<void> {
    if (!selectedCluster.value) {
      toast.add({ title: 'Kies eerst een project en cluster', color: 'error' })
      return
    }
    creating.value = true
    try {
      const durationMinutes =
        createDurationHours.value == null ? null : Math.round(createDurationHours.value * 60)

      const payload = {
        cluster_id: selectedCluster.value.value,
        required_researchers: createRequiredResearchers.value,
        visit_nr: createVisitNr.value,
        from_date: createFromDate.value || null,
        to_date: createToDate.value || null,
        duration: durationMinutes,
        min_temperature_celsius: createMinTemperature.value,
        max_wind_force_bft: createMaxWind.value,
        max_precipitation: createMaxPrecipitation.value,
        expertise_level: createExpertiseLevel.value,
        wbc: createWbc.value,
        fiets: createFiets.value,
        hub: createHub.value,
        dvp: createDvp.value,
        sleutel: createSleutel.value,
        remarks_planning: createRemarksPlanning.value,
        remarks_field: createRemarksField.value,
        priority: createPriority.value,
        part_of_day: createPartOfDay.value,
        start_time_text: createStartTimeText.value || null,
        preferred_researcher_id: createPreferredResearcherId.value,
        function_ids: [...createFunctionIds.value],
        species_ids: [...createSpeciesIds.value],
        researcher_ids: null
      }

      await $api('/visits', { method: 'POST', body: payload })
      toast.add({ title: 'Bezoek toegevoegd', color: 'success' })
      onCancelCreate()
      page.value = 1
      await loadVisits()
    } catch {
      toast.add({ title: 'Bezoek kon niet worden toegevoegd', color: 'error' })
    } finally {
      creating.value = false
    }
  }

  // --- Admin inline save/delete ---

  const savingId = ref<number | null>(null)
  const deletingId = ref<number | null>(null)

  async function onSaveVisit(row: VisitListRow): Promise<void> {
    savingId.value = row.id
    try {
      const payload = {
        required_researchers: row.required_researchers,
        visit_nr: row.visit_nr,
        from_date: row.from_date,
        to_date: row.to_date,
        duration: row.duration,
        min_temperature_celsius: row.min_temperature_celsius,
        max_wind_force_bft: row.max_wind_force_bft,
        max_precipitation: row.max_precipitation,
        expertise_level: row.expertise_level,
        wbc: row.wbc,
        fiets: row.fiets,
        hub: row.hub,
        dvp: row.dvp,
        sleutel: row.sleutel,
        remarks_planning: row.remarks_planning,
        remarks_field: row.remarks_field,
        priority: row.priority,
        part_of_day: row.part_of_day,
        start_time_text: row.start_time_text,
        preferred_researcher_id: row.preferred_researcher_id,
        function_ids: row.function_ids,
        species_ids: row.species_ids
      }
      await $api(`/visits/${row.id}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Bezoek opgeslagen', color: 'success' })
      await loadVisits()
    } catch {
      toast.add({ title: 'Opslaan mislukt', color: 'error' })
    } finally {
      savingId.value = null
    }
  }

  async function onDeleteVisit(id: number): Promise<void> {
    deletingId.value = id
    try {
      await $api(`/visits/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Bezoek verwijderd', color: 'success' })
      await loadVisits()
    } catch {
      toast.add({ title: 'Verwijderen mislukt', color: 'error' })
    } finally {
      deletingId.value = null
    }
  }

  onMounted(async () => {
    await auth.ensureLoaded()

    // Default: show all visits except approved/cancelled.
    // Users can clear this filter to see truly all visits.
    selectedStatuses.value = statusOptions.filter(
      (s) => s.value !== 'approved' && s.value !== 'cancelled'
    )

    await loadVisits()
    if (isAdmin.value) {
      await loadStaticOptions()
    }
  })
</script>
