<template>
  <UContainer>
    <UPageHeader title="Cluster SFC" />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="flex items-center gap-1">
          <USelectMenu
            :model-value="selectedProject"
            :items="projectOptions"
            searchable
            searchable-placeholder="Zoek projectcode"
            placeholder="Project"
            class="flex-1 min-w-0"
            @update:model-value="(opt) => (selectedProject = opt?.value === null ? undefined : opt)"
          />
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="sm"
            @click="openProjectModal('create')"
          />
          <UButton
            v-if="selectedProject"
            icon="i-lucide-pencil"
            color="neutral"
            variant="soft"
            size="sm"
            @click="openProjectModal('edit')"
          />
        </div>
        <UInput v-model="address" placeholder="Adres" />
        <UInput v-model="clusterLocation" placeholder="Locatie" />
        <UInput v-model="clusterNumber" placeholder="Cluster code" />
        <!-- empty grid cell reserved for layout symmetry -->
        <div />
      </div>
      <USeparator class="mt-4" />
      <div class="mt-4">
        <div
          v-for="(row, idx) in comboRows"
          :key="idx"
          class="flex items-center gap-3 flex-wrap md:flex-nowrap"
        >
          <div class="flex gap-3 my-2">
            <UInputMenu
              :model-value="row.functions"
              :items="functionOptions"
              multiple
              searchable
              placeholder="Functies"
              class="w-xs"
              @update:model-value="(sel) => (row.functions = sel as Option[])"
            />

            <UInputMenu
              :model-value="row.species"
              :items="speciesOptions"
              multiple
              searchable
              :filter-fields="['label', 'abbreviation']"
              placeholder="Soorten"
              @update:model-value="(sel) => (row.species = sel as Option[])"
            />
          </div>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-trash"
            class="md:ml-auto"
            @click="removeCombo(idx)"
          >
            Verwijder
          </UButton>
        </div>

        <div class="flex gap-2 mt-4">
          <UButton icon="i-lucide-plus" variant="soft" @click="addCombo">SFC toevoegen</UButton>
          <div v-if="comboRows.length === 0" class="text-xs text-gray-500 self-center">
            Voeg minimaal één combinatie toe
          </div>
        </div>
      </div>

      <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div class="text-sm font-medium mb-3">Standaard waarden voor nieuwe bezoeken</div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UInput
            v-model.number="defaultRequiredResearchers"
            type="number"
            placeholder="Aantal onderzoekers"
          />
          <USelectMenu
            :model-value="selectedExperienceOption(defaultExpertiseLevel)"
            :items="experienceLevelOptionsArr"
            placeholder="Vleermuis ervaring"
            @update:model-value="
              (opt: StringOption | undefined) => (defaultExpertiseLevel = opt?.value ?? null)
            "
          />
        </div>
        <div class="flex gap-8 items-center flex-wrap my-4">
          <UCheckbox v-model="defaultWbc" label="WBC" />
          <UCheckbox v-model="defaultFiets" label="Fiets" />
          <UCheckbox v-model="defaultHub" label="HUB" />
          <UCheckbox v-model="defaultDvp" label="DVP" />
          <UCheckbox v-model="defaultSleutel" label="Sleutel" />
        </div>
        <div class="mt-2">
          <UTextarea
            v-model="defaultRemarksField"
            placeholder="Extra opmerkingen veld (wordt toegevoegd aan gegenereerde opmerkingen)"
            :rows="2"
            class="w-xl"
          />
        </div>
      </div>
      <div class="mt-4">
        <UButton :loading="creating" :disabled="!canCreate" @click="onCreate">Toevoegen</UButton>
      </div>
    </UCard>

    <UCard>
      <UModal
        v-model:open="showProjectModal"
        :title="projectModalMode === 'create' ? 'Project toevoegen' : 'Project bewerken'"
      >
        <template #content>
          <UCard>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Projectcode" required>
                <UInput v-model="projectForm.code" placeholder="Bijv. P-001" />
              </UFormField>
              <UFormField label="Locatie" required>
                <UInput v-model="projectForm.location" placeholder="Bijv. Utrecht" />
              </UFormField>
              <UFormField label="Klant">
                <UInput v-model="projectForm.customer" placeholder="Optioneel" />
              </UFormField>
              <UFormField label="Google Drive folder">
                <UInput v-model="projectForm.google_drive_folder" placeholder="Optioneel" />
              </UFormField>
              <UFormField label="Offerte">
                <UCheckbox v-model="projectForm.quote" />
              </UFormField>
            </div>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="ghost" @click="showProjectModal = false"
                  >Annuleren</UButton
                >
                <UButton color="primary" :loading="projectModalSaving" @click="saveProject">
                  {{ projectModalMode === 'create' ? 'Toevoegen' : 'Opslaan' }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <UModal v-model:open="showDeleteClusterConfirm" title="Cluster verwijderen">
        <template #content>
          <UCard>
            <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Weet je zeker dat je dit cluster en alle bezoeken wilt verwijderen?
            </div>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" @click="showDeleteClusterConfirm = false"
                  >Annuleren</UButton
                >
                <UButton
                  color="error"
                  :loading="deletingCluster"
                  @click="onConfirmDeleteClusterAction"
                  >Verwijder</UButton
                >
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
      <UModal v-model:open="showMergeConfirm" title="Dit cluster bestaat al">
        <template #content>
          <UCard>
            <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Cluster {{ clusterNumber }} bestaat al. Weet je zeker dat je er nieuwe bezoeken aan
              wilt toevoegen?
            </div>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" @click="onCancelMergeConfirm"
                  >Annuleren</UButton
                >
                <UButton color="primary" :loading="creating" @click="onConfirmMerge"
                  >Bevestigen</UButton
                >
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
      <template #header>
        <div v-if="selectedProject && currentProject">
          <div class="text-base font-semibold">
            Project {{ currentProject.code }}
            <span v-if="currentProject.location" class="text-gray-500"
              >· {{ currentProject.location }}</span
            >
          </div>
        </div>
      </template>
      <div v-if="!selectedProject" class="p-4 text-sm text-gray-500">
        Selecteer een project om de clusters te bekijken.
      </div>
      <div v-else-if="clusters.length === 0" class="p-4 text-sm text-gray-500">
        Geen clusters om te tonen
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="cluster in clusters"
          :id="'cluster-' + cluster.id"
          :key="cluster.id"
          class="border rounded-md border-gray-300"
        >
          <div class="flex items-center justify-between px-3 py-2">
            <div class="flex items-center gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="xs"
                :icon="expanded.has(cluster.id) ? 'i-lucide-minus' : 'i-lucide-plus'"
                @click="toggleCluster(cluster.id)"
              />
              <span
                class="text-sm text-gray-700 dark:text-gray-400"
                @click="toggleCluster(cluster.id)"
              >
                Cluster {{ cluster.cluster_number }}, {{ cluster.address }}
                <span v-if="cluster.location" class="text-gray-500">· {{ cluster.location }}</span>
                ({{ cluster.visits.length }} bezoeken)
              </span>
            </div>
            <div class="flex items-center gap-1">
              <UModal>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-document-duplicate"
                  @click="openDuplicate(cluster)"
                />
                <template #content>
                  <UCard>
                    <template #header
                      >Dupliceer cluster {{ duplicateSource?.cluster_number }}</template
                    >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UInput
                        v-model="duplicateClusterNumber"
                        label="Nieuw cluster nummer"
                      />
                      <UInput v-model="duplicateAddress" label="Adres" />
                    </div>
                    <template #footer>
                      <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost">Annuleer</UButton>
                        <UButton :loading="duplicating" @click="confirmDuplicate"
                          >Dupliceer</UButton
                        >
                      </div>
                    </template>
                  </UCard>
                </template>
              </UModal>

              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="onOpenDeleteCluster(cluster)"
              />
            </div>
          </div>

          <div v-if="expanded.has(cluster.id)" class="px-3 pb-3">
            <div class="flex items-center gap-2 py-2">
              <UInput v-model="tempAddresses[cluster.id]" placeholder="Adres" class="flex-1" />
              <UInput
                v-model="tempLocations[cluster.id]"
                :placeholder="currentProject?.location ?? 'Locatie'"
                class="flex-1"
              />
              <UButton
                :loading="savingClusterId === cluster.id"
                color="primary"
                variant="soft"
                icon="i-lucide-save"
                @click="onSaveClusterAddress(cluster)"
              />
            </div>

            <div class="grid grid-cols-1 gap-3">
              <UCard v-for="visit in cluster.visits" :key="visit.id" class="my-3">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-700 dark:text-gray-400 font-semibold">
                      Bezoek #{{ visit.visit_nr }} · {{ formatDate(visit.from_date) }} –
                      {{ formatDate(visit.to_date) }}
                      <span v-if="visit.planning_locked" class="ml-2 text-gray-500">
                        · Vastgezet
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UModal title="Bezoek verwijderen">
                        <UButton size="xs" variant="soft" color="error">Verwijder</UButton>
                        <template #content>
                          <UCard>
                            <div>Weet je zeker dat je dit bezoek wilt verwijderen?</div>
                            <template #footer>
                              <div class="flex justify-end gap-2">
                                <UButton color="neutral" variant="ghost">Annuleer</UButton>
                                <UButton
                                  color="error"
                                  :loading="deletingVisit"
                                  @click="confirmDeleteVisit(visit.id)"
                                  >Verwijder</UButton
                                >
                              </div>
                            </template>
                          </UCard>
                        </template>
                      </UModal>
                      <UButton size="xs" @click="onSaveVisit(cluster.id, visit)">Opslaan</UButton>
                    </div>
                  </div>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs mb-1">Functies</label>
                    <UInputMenu
                      :model-value="mapIdsToOptions(visit.function_ids, functionOptions)"
                      :items="functionOptions"
                      multiple
                      class="w-2xs"
                      @update:model-value="
                        (sel) => (visit.function_ids = sel.map((o) => o.value as number))
                      "
                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Soorten</label>
                    <UInputMenu
                      :model-value="mapIdsToOptions(visit.species_ids, speciesOptions)"
                      :items="speciesOptions"
                      multiple
                      :filter-fields="['label', 'abbreviation']"
                      class="w-3xs"
                      @update:model-value="
                        (sel) => (visit.species_ids = sel.map((o) => o.value as number))
                      "
                    />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">{{ featureDailyPlanning ? 'Geplande datum' : 'Gepland voor week' }}</label>
                    <UInput v-if="featureDailyPlanning" v-model="visit.planned_date" type="date" />
                    <UInput v-else v-model.number="visit.planned_week" type="number" min="1" max="53" />
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
                      :model-value="mapIdsToOptions(visit.researcher_ids, researcherOptions)"
                      :items="researcherOptions.filter((o) => o.value !== null)"
                      multiple
                      searchable
                      class="w-3xs"
                      @update:model-value="
                        (sel) => (visit.researcher_ids = sel.map((o) => o.value as number))
                      "
                    />
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
                    <label class="block text-xs mb-1">Van</label>
                    <UInput v-model="visit.from_date" type="date" />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Tot</label>
                    <UInput v-model="visit.to_date" type="date" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Starttijd</label>
                    <UInput v-model="visit.start_time_text" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Dagdeel</label>
                    <USelectMenu
                      :model-value="
                        visit.part_of_day === null
                          ? undefined
                          : partOfDayOptions.find((o) => o.value === visit.part_of_day)
                      "
                      :items="partOfDayOptions"
                      placeholder="Kies dagdeel"
                      @update:model-value="(opt) => (visit.part_of_day = opt?.value)"
                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Duur (uur)</label>
                    <UInput
                      :model-value="durationHours(visit.duration)"
                      type="number"
                      step="0.5"
                      @update:model-value="
                        (h: number | null) =>
                          (visit.duration = h == null ? null : Math.round(h * 60))
                      "
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
                  <div>
                    <label class="block text-xs mb-1">Ervaring</label>
                    <USelectMenu
                      :model-value="selectedExperienceOption(visit.expertise_level)"
                      :items="experienceLevelOptionsArr"
                      placeholder="Kies niveau"
                      @update:model-value="
                        (opt: StringOption | undefined) =>
                          (visit.expertise_level = opt?.value ?? null)
                      "
                    />
                  </div>

                  <div class="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <UCheckbox v-model="visit.wbc" label="WBC" />
                    <UCheckbox v-model="visit.fiets" label="Fiets" />
                    <UCheckbox v-model="visit.hub" label="HUB" />
                    <UCheckbox v-model="visit.dvp" label="DVP" />
                    <UCheckbox v-model="visit.sleutel" label="Sleutel" />
                    <UCheckbox v-model="visit.priority" label="Prioriteit" />
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
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
  import { validateIsoWeekWithinDateWindow } from '../../utils/visitWeekWindow'

  type Option = { label: string; value: number | null; abbreviation?: string | null }
  type StringOption = { label: string; value: string | null }

  const { $api } = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()

  const featureDailyPlanning = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureDailyPlanning
    if (typeof raw === 'string') {
      return raw === 'true' || raw === '1'
    }
    return Boolean(raw)
  })

  const selectedProject = ref<Option | undefined>(undefined)
  const address = ref('')
  const clusterLocation = ref('')
  const clusterNumber = ref('')
  type ComboRow = { functions: Option[]; species: Option[] }
  const comboRows = ref<ComboRow[]>([])

  // Defaults
  const defaultRequiredResearchers = ref<number | null>(null)
  const defaultExpertiseLevel = ref<string | null>(null)
  const defaultWbc = ref(false)
  const defaultFiets = ref(false)
  const defaultHub = ref(false)
  const defaultDvp = ref(false)
  const defaultSleutel = ref(false)
  const defaultRemarksField = ref('')

  const creating = ref(false)
  const loading = ref(false)
  const showMergeConfirm = ref(false)
  const pendingCreatePayload = ref<null | {
    project_id: number
    address: string
    location?: string | null
    cluster_number: string
    combos: { function_ids: number[]; species_ids: number[] }[]
    default_required_researchers?: number | null
    default_expertise_level?: string | null
    default_wbc?: boolean
    default_fiets?: boolean
    default_hub?: boolean
    default_dvp?: boolean
    default_sleutel?: boolean
    default_remarks_field?: string | null
  }>(null)

  watch(showMergeConfirm, (isOpen) => {
    if (isOpen) return
    if (!pendingCreatePayload.value) return
    onCancelMergeConfirm()
  })

  type ProjectData = {
    id: number
    code: string
    location: string
    customer?: string | null
    google_drive_folder?: string | null
    quote?: boolean
  }

  const projectOptions = ref<Option[]>([])
  const projectsList = ref<ProjectData[]>([])
  const functionOptions = ref<Option[]>([])
  const speciesOptions = ref<Option[]>([])
  const researcherOptions = ref<Option[]>([])

  const experienceLevelOptionsArr: StringOption[] = [
    { label: '\u00A0', value: null },
    { label: 'Medior', value: 'Medior' },
    { label: 'Senior', value: 'Senior' },
  ]

  function selectedExperienceOption(v: string | null | undefined): StringOption | undefined {
    if (v === null) return undefined
    return experienceLevelOptionsArr.find((o) => o.value === v)
  }

  type CompactVisit = {
    id: number
    cluster_id: number
    function_ids: number[]
    species_ids: number[]
    functions: Array<{ id: number; name: string }>
    species: Array<{ id: number; name: string; abbreviation?: string | null }>
    required_researchers: number | null
    from_date: string | null
    to_date: string | null
    duration: number | null
    visit_nr: number | null
    min_temperature_celsius?: number | null
    max_wind_force_bft?: number | null
    max_precipitation?: string | null
    expertise_level?: string | null
    wbc?: boolean
    fiets?: boolean
    hub?: boolean
    dvp?: boolean
    sleutel?: boolean
    remarks_planning?: string | null
    remarks_field?: string | null
    start_time_text?: string | null
    part_of_day?: string | null
    start_time?: number | null
    priority?: boolean
    planned_week?: number | null
    planned_date?: string | null
    planning_locked?: boolean
    researcher_ids: number[]
    researchers: Array<{ id: number; full_name?: string | null }>
    visit_code?: string | null
  }

  type ApiErrorShape = {
    data?: { detail?: unknown } | null
    response?: { _data?: { detail?: unknown } | null } | null
  }

  function errorDescription(error: unknown): string {
    const err = error as ApiErrorShape
    const detail = err?.data?.detail ?? err?.response?._data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (error instanceof Error && error.message) return error.message
    return 'Onbekende fout'
  }

  async function onConfirmMerge(): Promise<void> {
    if (!pendingCreatePayload.value) {
      showMergeConfirm.value = false
      return
    }
    creating.value = true
    try {
      const res = await $api<Cluster>('/clusters', {
        method: 'POST',
        body: pendingCreatePayload.value
      })
      toast.add({ title: 'Bezoeken toegevoegd aan cluster', color: 'success' })
      showMergeConfirm.value = false
      pendingCreatePayload.value = null
      await loadClusters()
      if (res?.id) {
        await expandAndScrollToCluster(res.id)
      }
      await validateAddressWarning(res.address, res.location)
    } catch (error: unknown) {
      const description = errorDescription(error)
      toast.add({
        title: 'Fout bij toevoegen bezoeken aan cluster',
        description,
        color: 'error'
      })
    } finally {
      creating.value = false
    }
  }

  function onCancelMergeConfirm(): void {
    showMergeConfirm.value = false
    pendingCreatePayload.value = null
  }

  type Cluster = {
    id: number
    project_id: number
    address: string
    location: string | null
    cluster_number: string
    visits: CompactVisit[]
  }

  const clusters = ref<Cluster[]>([])
  const expanded = ref<Set<number>>(new Set())
  const tempAddresses = reactive<Record<number, string>>({})
  const tempLocations = reactive<Record<number, string>>({})
  const savingClusterId = ref<number | null>(null)
  const currentProject = computed(() => {
    const sel = selectedProject.value
    if (!sel) return null
    return projectsList.value.find((p) => p.id === sel.value) || null
  })
  const partOfDayOptions = [
    { label: '\u00A0', value: null },
    { label: 'Ochtend', value: 'Ochtend' },
    { label: 'Dag', value: 'Dag' },
    { label: 'Avond', value: 'Avond' }
  ]

  function formatDate(d: string | null | undefined): string {
    if (!d) return ''
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(date)
  }

  function durationHours(minutes: number | null | undefined): number | null {
    if (minutes == null) return null
    return Math.round((minutes / 60) * 10) / 10
  }

  // no table columns needed

  const canCreate = computed(() => {
    if (selectedProject.value?.value == null || !address.value || !clusterNumber.value.trim())
      return false
    if (comboRows.value.length === 0) return false
    return comboRows.value.every((r) => r.functions.length > 0 && r.species.length > 0)
  })

  async function loadOptions(): Promise<void> {
    const [projects, functions, species, users] = await Promise.all([
      $api<ProjectData[]>('/projects'),
      $api<{ id: number; name: string }[]>('/admin/functions'),
      $api<{ id: number; name: string; abbreviation?: string | null }[]>('/admin/species'),
      $api<{ id: number; full_name: string | null }[]>('/admin/users')
    ])
    projectsList.value = projects
    projectOptions.value = [{ label: '—', value: null }, ...projects.map((p) => ({ label: p.code, value: p.id }))]
    functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
    speciesOptions.value = species.map((s) => ({ label: s.name || s.abbreviation || '', value: s.id, abbreviation: s.abbreviation }))
    const mappedUsers = users
      .map((u) => ({ label: u.full_name ?? `Gebruiker #${u.id}`, value: u.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
    researcherOptions.value = [{ label: '\u00A0', value: null }, ...mappedUsers]
  }

  // Project add/edit modal
  const showProjectModal = ref(false)
  const projectModalMode = ref<'create' | 'edit'>('create')
  const projectModalSaving = ref(false)
  const projectForm = reactive({
    code: '',
    location: '',
    customer: null as string | null,
    google_drive_folder: null as string | null,
    quote: false
  })

  function openProjectModal(mode: 'create' | 'edit'): void {
    projectModalMode.value = mode
    if (mode === 'edit' && selectedProject.value) {
      const proj = projectsList.value.find((p) => p.id === selectedProject.value!.value)
      if (proj) {
        Object.assign(projectForm, {
          code: proj.code,
          location: proj.location ?? '',
          customer: proj.customer ?? null,
          google_drive_folder: proj.google_drive_folder ?? null,
          quote: proj.quote ?? false
        })
      }
    } else {
      Object.assign(projectForm, {
        code: '',
        location: '',
        customer: null,
        google_drive_folder: null,
        quote: false
      })
    }
    showProjectModal.value = true
  }

  async function reloadProjects(): Promise<void> {
    const projects = await $api<ProjectData[]>('/projects')
    projectsList.value = projects
    projectOptions.value = [{ label: '—', value: null }, ...projects.map((p) => ({ label: p.code, value: p.id }))]
  }

  async function saveProject(): Promise<void> {
    if (!projectForm.code.trim() || !projectForm.location.trim()) return
    projectModalSaving.value = true
    try {
      const payload = {
        code: projectForm.code.trim(),
        location: projectForm.location.trim(),
        customer: projectForm.customer?.trim() || null,
        google_drive_folder: projectForm.google_drive_folder?.trim() || null,
        quote: projectForm.quote
      }
      if (projectModalMode.value === 'edit' && selectedProject.value) {
        const projectId = selectedProject.value.value as number
        await $api(`/projects/${projectId}`, { method: 'PUT', body: payload })
        toast.add({ title: 'Project bijgewerkt', color: 'success' })
        showProjectModal.value = false
        await reloadProjects()
        // Refresh selected option in case code changed
        const updatedOption = projectOptions.value.find((o) => o.value === projectId)
        if (updatedOption) selectedProject.value = updatedOption
      } else {
        const created = await $api<{ id: number }>('/projects', { method: 'POST', body: payload })
        toast.add({ title: 'Project aangemaakt', color: 'success' })
        showProjectModal.value = false
        await reloadProjects()
        // Auto-select the newly created project
        if (created?.id) {
          const newOption = projectOptions.value.find((o) => o.value === created.id)
          if (newOption) selectedProject.value = newOption
        }
      }
    } catch (error: unknown) {
      const description = errorDescription(error)
      toast.add({ title: 'Fout bij opslaan project', description, color: 'error' })
    } finally {
      projectModalSaving.value = false
    }
  }

  watch(selectedProject, async (opt) => {
    if (opt === undefined) {
      address.value = ''
      clusterLocation.value = ''
      clusterNumber.value = ''
      await loadClusters()
      return
    }
    address.value = ''
    clusterNumber.value = ''
    // Auto-populate location from project location as default
    const proj = projectsList.value.find((p) => p.id === opt.value)
    clusterLocation.value = proj?.location ?? ''
    await loadClusters()
  })

  async function loadClusters(): Promise<void> {
    loading.value = true
    try {
      if (!selectedProject.value || selectedProject.value.value === null) {
        clusters.value = []
        return
      }
      const data = await $api<Cluster[]>(`/clusters`, {
        query: { project_id: selectedProject.value.value }
      })
      clusters.value = data
      // initialize temp addresses/locations for inline editing
      for (const c of data) {
        tempAddresses[c.id] = c.address
        tempLocations[c.id] = c.location ?? ''
      }
    } finally {
      loading.value = false
    }
  }
  function cleanInt(val: number | string | null | undefined): number | null {
    if (val === '' || val === null || val === undefined) return null
    return Number(val)
  }

  async function onCreate(): Promise<void> {
    if (!canCreate.value) return

    const exists = !!clusters.value.find(
      (c) =>
        c.project_id === selectedProject.value!.value && c.cluster_number === clusterNumber.value
    )
    if (exists) {
      pendingCreatePayload.value = {
        project_id: selectedProject.value!.value as number,
        address: address.value,
        location: clusterLocation.value.trim() || null,
        cluster_number: clusterNumber.value!,
        combos: comboRows.value.map((r) => ({
          function_ids: r.functions.map((o) => o.value as number),
          species_ids: r.species.map((o) => o.value as number)
        })),
        default_required_researchers: cleanInt(defaultRequiredResearchers.value),
        default_expertise_level: defaultExpertiseLevel.value,
        default_wbc: defaultWbc.value,
        default_fiets: defaultFiets.value,
        default_hub: defaultHub.value,
        default_dvp: defaultDvp.value,
        default_sleutel: defaultSleutel.value,
        default_remarks_field: defaultRemarksField.value || null
      }
      showMergeConfirm.value = true
      return
    }
    creating.value = true
    try {
      const res = await $api<Cluster>('/clusters', {
        method: 'POST',
        body: {
          project_id: selectedProject.value!.value as number,
          address: address.value,
          location: clusterLocation.value.trim() || null,
          cluster_number: clusterNumber.value!,
          combos: comboRows.value.map((r) => ({
            function_ids: r.functions.map((o) => o.value as number),
            species_ids: r.species.map((o) => o.value as number)
          })),
          default_required_researchers: cleanInt(defaultRequiredResearchers.value),
          default_expertise_level: defaultExpertiseLevel.value,
          default_wbc: defaultWbc.value,
          default_fiets: defaultFiets.value,
          default_hub: defaultHub.value,
          default_dvp: defaultDvp.value,
          default_sleutel: defaultSleutel.value,
          default_remarks_field: defaultRemarksField.value || null
        }
      })
      toast.add({ title: 'Cluster aangemaakt', color: 'success' })
      clusterNumber.value = ''
      await loadClusters()
      if (res?.id) {
        await expandAndScrollToCluster(res.id)
      }
      validateAddressWarning(res.address, res.location)
    } catch (error: unknown) {
      const description = errorDescription(error)
      toast.add({
        title: 'Fout bij aanmaken cluster',
        description,
        color: 'error'
      })
    } finally {
      creating.value = false
    }
  }

  function addCombo(): void {
    comboRows.value.push({ functions: [], species: [] })
  }

  function removeCombo(idx: number): void {
    comboRows.value.splice(idx, 1)
  }

  // Helpers to map between Option[] and id arrays for per-row multiselects
  function mapIdsToOptions(ids: number[] | undefined, options: Option[]): Option[] {
    if (!ids || ids.length === 0) return []
    const idSet = new Set(ids)
    return options.filter((o) => o.value !== null && idSet.has(o.value))
  }

  function toggleCluster(id: number): void {
    if (expanded.value.has(id)) expanded.value.delete(id)
    else expanded.value.add(id)
  }

  async function expandAndScrollToCluster(id: number): Promise<void> {
    expanded.value = new Set([id])
    await nextTick()
    const el = document.getElementById(`cluster-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const toast = useToast()

  async function onSaveClusterAddress(cluster: Cluster): Promise<void> {
    const newAddress = tempAddresses[cluster.id]?.trim() ?? ''
    if (!newAddress) return
    const newLocation = tempLocations[cluster.id]?.trim() || null
    savingClusterId.value = cluster.id
    try {
      await $api(`/clusters/${cluster.id}`, {
        method: 'PATCH',
        body: { address: newAddress, location: newLocation }
      })
      toast.add({ title: 'Cluster bijgewerkt', color: 'success' })
      await loadClusters()
      expanded.value.add(cluster.id)
      await validateAddressWarning(newAddress, newLocation)
    } finally {
      savingClusterId.value = null
    }
  }

  async function onSaveVisit(clusterId: number, visit: CompactVisit): Promise<void> {
    if (!featureDailyPlanning.value && visit.planned_week != null) {
      const plannedWeekError = validateIsoWeekWithinDateWindow({
        week: visit.planned_week,
        fromDate: visit.from_date,
        toDate: visit.to_date,
        label: 'Gepland voor week'
      })
      if (plannedWeekError) {
        toast.add({
          title: 'Fout bij opslaan bezoek',
          description: plannedWeekError,
          color: 'error'
        })
        return
      }
    }

    if (visit.planning_locked) {
      if (featureDailyPlanning.value) {
        if (!visit.planned_date) {
          toast.add({
            title: 'Fout bij opslaan bezoek',
            description: 'Als planning is vastgezet, moet "Geplande datum" ingevuld zijn.',
            color: 'error'
          })
          return
        }
      } else if (visit.planned_week == null) {
        toast.add({
          title: 'Fout bij opslaan bezoek',
          description: 'Als planning is vastgezet, moet "Gepland voor week" ingevuld zijn.',
          color: 'error'
        })
        return
      }

      if (!visit.researcher_ids || visit.researcher_ids.length === 0) {
        toast.add({
          title: 'Fout bij opslaan bezoek',
          description: 'Als planning is vastgezet, moet je minimaal één onderzoeker kiezen.',
          color: 'error'
        })
        return
      }
    }

    const payload = {
      required_researchers: cleanInt(visit.required_researchers),
      visit_nr: cleanInt(visit.visit_nr),
      from_date: visit.from_date,
      to_date: visit.to_date,
      duration: visit.duration,
      min_temperature_celsius: cleanInt(visit.min_temperature_celsius),
      max_wind_force_bft: cleanInt(visit.max_wind_force_bft),
      max_precipitation: visit.max_precipitation,
      expertise_level: visit.expertise_level ?? null,
      wbc: visit.wbc,
      fiets: visit.fiets,
      hub: visit.hub,
      dvp: visit.dvp,
      sleutel: visit.sleutel,
      remarks_planning: visit.remarks_planning,
      remarks_field: visit.remarks_field,
      function_ids: visit.function_ids,
      species_ids: visit.species_ids,
      part_of_day: visit.part_of_day,
      start_time_text: visit.start_time_text,
      priority: visit.priority,
      planned_week: cleanInt(visit.planned_week),
      planned_date: visit.planned_date || null,
      planning_locked: !!visit.planning_locked,
      researcher_ids: visit.researcher_ids
      // no start_time minutes in UI
    }
    await $api(`/visits/${visit.id}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Bezoek opgeslagen', color: 'success' })
    await loadClusters()
    expanded.value.add(clusterId)
  }

  // Duplicate modal
  const duplicating = ref(false)
  const duplicateSource = ref<{ id: number; cluster_number: string } | null>(null)
  const duplicateClusterNumber = ref('')
  const duplicateAddress = ref('')

  function openDuplicate(cluster: Cluster): void {
    duplicateSource.value = { id: cluster.id, cluster_number: cluster.cluster_number }
    duplicateClusterNumber.value = cluster.cluster_number ?? ''
    duplicateAddress.value = cluster.address
  }

  // Cluster delete
  const deletingCluster = ref(false)
  const showDeleteClusterConfirm = ref(false)
  const clusterIdToDelete = ref<number | null>(null)

  function onOpenDeleteCluster(cluster: Cluster) {
    clusterIdToDelete.value = cluster.id
    showDeleteClusterConfirm.value = true
  }

  async function onConfirmDeleteClusterAction() {
    if (clusterIdToDelete.value === null) return
    await confirmDeleteCluster(clusterIdToDelete.value)
    showDeleteClusterConfirm.value = false
    clusterIdToDelete.value = null
  }

  async function confirmDeleteCluster(id: number): Promise<void> {
    deletingCluster.value = true
    try {
      await $api(`/clusters/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Cluster verwijderd', color: 'success' })
      await loadClusters()
    } finally {
      deletingCluster.value = false
    }
  }

  async function confirmDuplicate(): Promise<void> {
    if (!duplicateSource.value || !duplicateClusterNumber.value) return
    duplicating.value = true
    try {
      await $api(`/clusters/${duplicateSource.value.id}/duplicate`, {
        method: 'POST',
        body: { cluster_number: duplicateClusterNumber.value!, address: duplicateAddress.value }
      })
      toast.add({ title: 'Cluster gedupliceerd', color: 'success' })
      await loadClusters()
      await validateAddressWarning(duplicateAddress.value, null)
    } finally {
      duplicating.value = false
    }
  }

  // Visit delete
  const deletingVisit = ref(false)

  async function confirmDeleteVisit(id: number): Promise<void> {
    deletingVisit.value = true
    try {
      await $api(`/visits/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Bezoek verwijderd', color: 'success' })
      await loadClusters()
    } finally {
      deletingVisit.value = false
    }
  }

  async function validateAddressWarning(address: string | null | undefined, location: string | null | undefined) {
    const combined = [address, location].filter(s => s && s.trim()).join(', ')
    if (!combined) return
    try {
      const res = await $api<{ valid: boolean | null }>('/admin/utils/validate-address', {
        query: { address: combined }
      })
      if (res.valid === false) {
        toast.add({
          title: 'Adres niet herkend',
          description: `Google Maps kon het adres '${combined}' niet vinden.`,
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle'
        })
      } else if (res.valid === null) {
        toast.add({
          title: 'Adres validatie mislukt',
          description: `Er trad een fout op bij het controleren van '${combined}' (bijv. Google Maps API fout).`,
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle'
        })
      }
    } catch (e) {
      console.error('Failed to validate address', e)
    }
  }

  onMounted(async () => {
    await loadOptions()
    await loadClusters()
    // Debug render aid
    console.debug('Cluster SFC mounted: clusters', clusters.value)
  })
</script>
