<template>
  <UContainer>
    <div class="flex items-end justify-between mb-4">
      <h1 class="text-2xl font-semibold">Cluster SFC</h1>
    </div>

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
        <UInputMenu
          v-model="selectedFunctionItems"
          :items="functionOptions"
          multiple
          searchable
          placeholder="Functies"
        />
        <UInputMenu
          v-model="selectedSpeciesItems"
          :items="speciesOptions"
          multiple
          searchable
          placeholder="Soorten"
        />
      </div>
      <div class="mt-4">
        <UButton :loading="creating" :disabled="!canCreate" @click="onCreate">Toevoegen</UButton>
      </div>
    </UCard>

    <UCard>
      <div v-if="clusters.length === 0" class="p-4 text-sm text-gray-500">
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
              <span class="text-sm text-gray-700">
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
            <div class="grid grid-cols-1 gap-3">
              <UCard v-for="visit in cluster.visits" :key="visit.id" class="my-3">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-700 font-semibold">
                      Bezoek #{{ visit.visit_nr }} · {{ formatDate(visit.from_date) }} –
                      {{ formatDate(visit.to_date) }}
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
                    <USelectMenu
                      :model-value="mapIdsToOptions(visit.function_ids, functionOptions)"
                      :items="functionOptions"
                      multiple
                      @update:model-value="(sel) => (visit.function_ids = sel.map((o) => o.value))"
                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Soorten</label>
                    <USelectMenu
                      :model-value="mapIdsToOptions(visit.species_ids, speciesOptions)"
                      :items="speciesOptions"
                      multiple
                      @update:model-value="(sel) => (visit.species_ids = sel.map((o) => o.value))"
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
                    <label class="block text-xs mb-1">Starttijd (tekst)</label>
                    <UInput v-model="visit.start_time_text" disabled />
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

                  <div class="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-6 gap-3">
                    <UCheckbox v-model="visit.expertise_level" label="Expertise" />
                    <UCheckbox v-model="visit.wbc" label="WBC" />
                    <UCheckbox v-model="visit.fiets" label="Fiets" />
                    <UCheckbox v-model="visit.hup" label="HuP" />
                    <UCheckbox v-model="visit.dvp" label="DvP" />
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

    <UCard class="mt-4">
      <div class="text-xs text-gray-500">Clusters: {{ clusters.length }}</div>
      <pre class="text-xs overflow-auto max-h-64">{{
        JSON.stringify(clusters.slice(0, 1), null, 2)
      }}</pre>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
  type Option = { label: string; value: number }

  const { $api } = useNuxtApp()

  const selectedProject = ref<Option | undefined>(undefined)
  const address = ref('')
  const clusterNumber = ref<number | null>(null)
  const selectedFunctionItems = ref<Option[]>([])
  const selectedSpeciesItems = ref<Option[]>([])

  const creating = ref(false)
  const loading = ref(false)

  const projectOptions = ref<Option[]>([])
  const functionOptions = ref<Option[]>([])
  const speciesOptions = ref<Option[]>([])

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
    expertise_level?: boolean
    wbc?: boolean
    fiets?: boolean
    hup?: boolean
    dvp?: boolean
    remarks_planning?: string | null
    remarks_field?: string | null
    start_time_text?: string | null
    part_of_day?: string | null
    start_time?: number | null
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

  const canCreate = computed(
    () => selectedProject.value !== undefined && !!address.value && clusterNumber.value !== null
  )

  async function loadOptions(): Promise<void> {
    const [projects, functions, species] = await Promise.all([
      $api<{ id: number; code: string }[]>('/projects'),
      $api<{ id: number; name: string }[]>('/admin/functions'),
      $api<{ id: number; name: string; abbreviation?: string | null }[]>('/admin/species')
    ])
    projectOptions.value = projects.map((p) => ({ label: p.code, value: p.id }))
    functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
    speciesOptions.value = species.map((s) => ({ label: s.abbreviation ?? s.name, value: s.id }))
  }

  watch(selectedProject, async (opt) => {
    if (opt === undefined) return
    await loadClusters()
  })

  async function loadClusters(): Promise<void> {
    loading.value = true
    try {
      const data = selectedProject.value
        ? await $api<Cluster[]>(`/clusters`, {
            query: { project_id: selectedProject.value.value }
          })
        : await $api<Cluster[]>(`/clusters`)
      clusters.value = data
    } finally {
      loading.value = false
    }
  }

  async function onCreate(): Promise<void> {
    if (!canCreate.value) return
    creating.value = true
    try {
      await $api('/clusters', {
        method: 'POST',
        body: {
          project_id: selectedProject.value?.value,
          address: address.value,
          cluster_number: clusterNumber.value,
          function_ids: selectedFunctionItems.value.map((o) => o.value),
          species_ids: selectedSpeciesItems.value.map((o) => o.value)
        }
      })
      clusterNumber.value = null
      await loadClusters()
    } finally {
      creating.value = false
    }
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
      expertise_level: visit.expertise_level,
      wbc: visit.wbc,
      fiets: visit.fiets,
      hup: visit.hup,
      dvp: visit.dvp,
      remarks_planning: visit.remarks_planning,
      remarks_field: visit.remarks_field,
      function_ids: visit.function_ids,
      species_ids: visit.species_ids,
      part_of_day: visit.part_of_day
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
