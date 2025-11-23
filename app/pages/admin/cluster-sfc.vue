<template>
  <UContainer>
    <UPageHeader title="Cluster SFC" />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <USelectMenu
          v-model="selectedProject"
          :items="projectOptions"
          searchable
          searchable-placeholder="Zoek projectcode"
          placeholder="Project"
        />
        <UInput v-model="address" placeholder="Adres" />
        <UInput v-model.number="clusterNumber" type="number" placeholder="Cluster nummer" />
        <!-- empty grid cells reserved for layout symmetry -->
        <div />
        <div />
      </div>
      <USeparator class="mt-4" />
      <div class="mt-4">
        <div v-for="(row, idx) in comboRows" :key="idx">
          <div>
            <UInputMenu
              :model-value="row.functions"
              :items="functionOptions"
              multiple
              searchable
              placeholder="Functies"
              class="w-xs mr-8"
              @update:model-value="(sel) => (row.functions = sel as Option[])"
            />

            <UInputMenu
              :model-value="row.species"
              :items="speciesOptions"
              multiple
              searchable
              placeholder="Soorten"
              @update:model-value="(sel) => (row.species = sel as Option[])"
            />
          </div>
          <div class="md:col-span-1 flex justify-end">
            <UButton color="neutral" variant="soft" icon="i-lucide-trash" @click="removeCombo(idx)">
              Verwijder
            </UButton>
          </div>
        </div>

        <div class="flex gap-2">
          <UButton icon="i-lucide-plus" variant="soft" @click="addCombo">SFC toevoegen</UButton>
          <div v-if="comboRows.length === 0" class="text-xs text-gray-500 self-center">
            Voeg minimaal één combinatie toe
          </div>
        </div>
      </div>
      <div class="mt-8">
        <UButton :loading="creating" :disabled="!canCreate" @click="onCreate">Toevoegen</UButton>
      </div>
    </UCard>

    <UCard>
      <UCard v-if="showMergeConfirm" class="my-4">
        <div class="text-base font-medium">Dit cluster bestaat al</div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Weet je zeker dat je bezoeken wilt toevoegen?
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="showMergeConfirm = false"
            >Annuleren</UButton
          >
          <UButton color="primary" :loading="creating" @click="onConfirmMerge">Bevestigen</UButton>
        </div>
      </UCard>
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
                Cluster {{ cluster.cluster_number }}, {{ cluster.address }} ({{
                  cluster.visits.length
                }}
                bezoeken)
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
                        v-model.number="duplicateClusterNumber"
                        type="number"
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

              <UModal title="Cluster verwijderen">
                <UButton color="error" variant="ghost" icon="i-heroicons-trash" />
                <template #content>
                  <UCard>
                    <div>Weet je zeker dat je dit cluster en alle bezoeken wilt verwijderen?</div>
                    <template #footer>
                      <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost">Annuleer</UButton>
                        <UButton
                          color="error"
                          :loading="deletingCluster"
                          @click="confirmDeleteCluster(cluster.id)"
                          >Verwijder</UButton
                        >
                      </div>
                    </template>
                  </UCard>
                </template>
              </UModal>
            </div>
          </div>

          <div v-if="expanded.has(cluster.id)" class="px-3 pb-3">
            <div class="flex items-center gap-2 py-2">
              <UInput v-model="tempAddresses[cluster.id]" placeholder="Adres" class="flex-1" />
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
                      <span v-if="visit.preferred_researcher?.full_name" class="ml-2 text-gray-500">
                        · Voorkeur: {{ visit.preferred_researcher.full_name }}
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
                      @update:model-value="(sel) => (visit.function_ids = sel.map((o) => o.value))"
                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Soorten</label>
                    <UInputMenu
                      :model-value="mapIdsToOptions(visit.species_ids, speciesOptions)"
                      :items="speciesOptions"
                      multiple
                      class="w-3xs"
                      @update:model-value="(sel) => (visit.species_ids = sel.map((o) => o.value))"
                    />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Aantal onderzoekers</label>
                    <UInput v-model.number="visit.required_researchers" type="number" />
                  </div>
                  <div class="md:col-start-2">
                    <label class="block text-xs mb-1">Voorkeursonderzoeker</label>
                    <USelectMenu
                      :model-value="
                        researcherOptions.find((o) => o.value === visit.preferred_researcher_id)
                      "
                      :items="researcherOptions"
                      searchable
                      placeholder="Kies onderzoeker"
                      @update:model-value="
                        (opt) => (visit.preferred_researcher_id = opt?.value ?? null)
                      "
                    />
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
                      :model-value="partOfDayOptions.find((o) => o.value === visit.part_of_day)"
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
                    <UCheckbox v-model="visit.dvp" label="DvP" />
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
  type Option = { label: string; value: number }
  type StringOption = { label: string; value: string }

  const { $api } = useNuxtApp()

  const selectedProject = ref<Option | undefined>(undefined)
  const address = ref('')
  const clusterNumber = ref<number | null>(null)
  type ComboRow = { functions: Option[]; species: Option[] }
  const comboRows = ref<ComboRow[]>([])

  const creating = ref(false)
  const loading = ref(false)
  const showMergeConfirm = ref(false)
  const pendingCreatePayload = ref<null | {
    project_id: number
    address: string
    cluster_number: number
    combos: { function_ids: number[]; species_ids: number[] }[]
  }>(null)

  const projectOptions = ref<Option[]>([])
  const projectsList = ref<Array<{ id: number; code: string; location?: string | null }>>([])
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
    preferred_researcher_id?: number | null
    preferred_researcher?: { id: number; full_name?: string | null } | null
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
      showMergeConfirm.value = false
      pendingCreatePayload.value = null
      await loadClusters()
      if (res?.id) {
        expanded.value = new Set([res.id])
      }
    } finally {
      creating.value = false
    }
  }

  type Cluster = {
    id: number
    project_id: number
    address: string
    cluster_number: number
    visits: CompactVisit[]
  }

  const clusters = ref<Cluster[]>([])
  const expanded = ref<Set<number>>(new Set())
  const tempAddresses = reactive<Record<number, string>>({})
  const savingClusterId = ref<number | null>(null)
  const currentProject = computed(() => {
    const sel = selectedProject.value
    if (!sel) return null
    return projectsList.value.find((p) => p.id === sel.value) || null
  })
  const partOfDayOptions = [
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
    if (selectedProject.value === undefined || !address.value || clusterNumber.value === null)
      return false
    if (comboRows.value.length === 0) return false
    return comboRows.value.every((r) => r.functions.length > 0 && r.species.length > 0)
  })

  async function loadOptions(): Promise<void> {
    const [projects, functions, species, users] = await Promise.all([
      $api<{ id: number; code: string; location?: string | null }[]>('/projects'),
      $api<{ id: number; name: string }[]>('/admin/functions'),
      $api<{ id: number; name: string; abbreviation?: string | null }[]>('/admin/species'),
      $api<{ id: number; full_name: string | null }[]>('/admin/users')
    ])
    projectsList.value = projects
    projectOptions.value = projects.map((p) => ({ label: p.code, value: p.id }))
    functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
    speciesOptions.value = species.map((s) => ({ label: s.abbreviation ?? s.name, value: s.id }))
    researcherOptions.value = users
      .map((u) => ({ label: u.full_name ?? `Gebruiker #${u.id}`, value: u.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  watch(selectedProject, async (opt) => {
    if (opt === undefined) return
    await loadClusters()
  })

  async function loadClusters(): Promise<void> {
    loading.value = true
    try {
      if (!selectedProject.value) {
        clusters.value = []
        return
      }
      const data = await $api<Cluster[]>(`/clusters`, {
        query: { project_id: selectedProject.value.value }
      })
      clusters.value = data
      // initialize temp addresses for inline editing
      for (const c of data) {
        tempAddresses[c.id] = c.address
      }
    } finally {
      loading.value = false
    }
  }
  async function onCreate(): Promise<void> {
    if (!canCreate.value) return
    const exists = !!clusters.value.find(
      (c) =>
        c.project_id === selectedProject.value!.value && c.cluster_number === clusterNumber.value
    )
    if (exists) {
      pendingCreatePayload.value = {
        project_id: selectedProject.value!.value,
        address: address.value,
        cluster_number: clusterNumber.value!,
        combos: comboRows.value.map((r) => ({
          function_ids: r.functions.map((o) => o.value as number),
          species_ids: r.species.map((o) => o.value as number)
        }))
      }
      showMergeConfirm.value = true
      return
    }
    creating.value = true
    try {
      const res = await $api<Cluster>('/clusters', {
        method: 'POST',
        body: {
          project_id: selectedProject.value!.value,
          address: address.value,
          cluster_number: clusterNumber.value!,
          combos: comboRows.value.map((r) => ({
            function_ids: r.functions.map((o) => o.value as number),
            species_ids: r.species.map((o) => o.value as number)
          }))
        }
      })
      clusterNumber.value = null
      await loadClusters()
      if (res?.id) {
        expanded.value = new Set([res.id])
      }
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
    return options.filter((o) => idSet.has(o.value))
  }

  function toggleCluster(id: number): void {
    if (expanded.value.has(id)) expanded.value.delete(id)
    else expanded.value.add(id)
  }

  const toast = useToast()

  async function onSaveClusterAddress(cluster: Cluster): Promise<void> {
    const newAddress = tempAddresses[cluster.id]?.trim() ?? ''
    if (!newAddress) return
    savingClusterId.value = cluster.id
    try {
      await $api(`/clusters/${cluster.id}`, { method: 'PATCH', body: { address: newAddress } })
      toast.add({ title: 'Adres bijgewerkt', color: 'success' })
      await loadClusters()
      expanded.value.add(cluster.id)
    } finally {
      savingClusterId.value = null
    }
  }

  async function onSaveVisit(clusterId: number, visit: CompactVisit): Promise<void> {
    const payload = {
      required_researchers: visit.required_researchers,
      visit_nr: visit.visit_nr,
      from_date: visit.from_date,
      to_date: visit.to_date,
      duration: visit.duration,
      min_temperature_celsius: visit.min_temperature_celsius,
      max_wind_force_bft: visit.max_wind_force_bft,
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
      preferred_researcher_id: visit.preferred_researcher_id
      // no start_time minutes in UI
    }
    await $api(`/visits/${visit.id}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Bezoek opgeslagen', color: 'success' })
    await loadClusters()
    expanded.value.add(clusterId)
  }

  // Duplicate modal
  const duplicating = ref(false)
  const duplicateSource = ref<{ id: number; cluster_number: number } | null>(null)
  const duplicateClusterNumber = ref<number | null>(null)
  const duplicateAddress = ref('')

  function openDuplicate(cluster: Cluster): void {
    duplicateSource.value = { id: cluster.id, cluster_number: cluster.cluster_number }
    duplicateClusterNumber.value = cluster.cluster_number
    duplicateAddress.value = cluster.address
  }

  // Cluster delete
  const deletingCluster = ref(false)

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
    if (!duplicateSource.value || duplicateClusterNumber.value === null) return
    duplicating.value = true
    try {
      await $api(`/clusters/${duplicateSource.value.id}/duplicate`, {
        method: 'POST',
        body: { cluster_number: duplicateClusterNumber.value, address: duplicateAddress.value }
      })
      toast.add({ title: 'Cluster gedupliceerd', color: 'success' })
      await loadClusters()
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

  onMounted(async () => {
    await loadOptions()
    await loadClusters()
    // Debug render aid
    console.debug('Cluster SFC mounted: clusters', clusters.value)
  })
</script>
