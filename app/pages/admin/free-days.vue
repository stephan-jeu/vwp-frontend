<template>
  <div>
    <UPageHeader title="Vrije dagen" />

    <div class="flex items-center justify-between my-6 gap-4">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium">Jaar</label>
        <UInput
          v-model.number="selectedYear"
          type="number"
          class="w-24"
          @change="loadEntries"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="!showCreate"
          icon="i-lucide-plus"
          @click="showCreate = true"
        >Toevoegen</UButton>
        <UModal title="Feestdagen inladen" :close="{ class: 'rounded-full' }">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-calendar-check"
          >Feestdagen inladen</UButton>
          <template #body>
            <div class="space-y-2">
              <div class="font-semibold">Feestdagen {{ selectedYear }} inladen</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Dit verwijdert <strong>alle</strong> bestaande vrije dagen en laadt de officiële
                Nederlandse feestdagen voor {{ selectedYear }}. Handmatig aangemaakte vrije dagen
                worden ook verwijderd.
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="error"
                :loading="seeding"
                icon="i-lucide-calendar-check"
                @click="onSeed"
              >Bevestigen</UButton>
            </div>
          </template>
        </UModal>
      </div>
    </div>

    <!-- Add form -->
    <UCard v-if="showCreate" class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="col-span-full">
          <label class="text-xs font-medium">Omschrijving</label>
          <UInput v-model="createForm.description" placeholder="bijv. Koningsdag, Bedrijfsuitje" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium">Startdatum</label>
          <UInput v-model="createForm.start_date" type="date" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium">Einddatum</label>
          <UInput v-model="createForm.end_date" type="date" />
        </div>
      </div>
      <div class="mt-3 flex gap-6">
        <UCheckbox v-model="createForm.morning" label="Ochtend" />
        <UCheckbox v-model="createForm.daytime" label="Dag" />
        <UCheckbox v-model="createForm.nighttime" label="Nacht" />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <UButton color="neutral" variant="soft" @click="onCancelCreate">Annuleren</UButton>
        <UButton :loading="creating" icon="i-lucide-check" @click="onCreate">Toevoegen</UButton>
      </div>
    </UCard>

    <!-- List -->
    <UCard>
      <div v-if="entries.length === 0" class="text-sm text-gray-500 py-4 text-center">
        Geen vrije dagen gevonden voor {{ selectedYear }}.
        Gebruik "Feestdagen inladen" om de standaard feestdagen toe te voegen.
      </div>

      <div class="space-y-3">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="border rounded-md border-gray-300 dark:border-gray-700"
        >
          <div class="flex items-center justify-between px-3 py-2">
            <div class="flex items-center gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="xs"
                :icon="expanded.has(entry.id) ? 'i-lucide-minus' : 'i-lucide-plus'"
                @click="toggle(entry.id)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300" @click="toggle(entry.id)">
                {{ entryLabel(entry) }}
              </span>
            </div>
            <UBadge
              :color="entry.is_default ? 'primary' : 'neutral'"
              variant="subtle"
              size="xs"
            >{{ entry.is_default ? 'Standaard' : 'Aangepast' }}</UBadge>
          </div>

          <div v-if="expanded.has(entry.id)" class="px-3 pb-3 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="col-span-full flex flex-col gap-1">
                <label class="text-xs font-medium">Omschrijving</label>
                <UInput v-model="entry.description" placeholder="bijv. Koningsdag" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Startdatum</label>
                <UInput v-model="entry.start_date" type="date" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Einddatum</label>
                <UInput v-model="entry.end_date" type="date" />
              </div>
            </div>
            <div class="flex gap-6">
              <UCheckbox v-model="entry.morning" label="Ochtend" />
              <UCheckbox v-model="entry.daytime" label="Dag" />
              <UCheckbox v-model="entry.nighttime" label="Nacht" />
            </div>
            <div class="flex gap-2 justify-end">
              <UButton
                color="primary"
                :loading="savingId === entry.id"
                icon="i-lucide-check"
                @click="onSave(entry)"
              >Opslaan</UButton>
              <UModal
                title="Verwijder vrije dag"
                :close="{ class: 'rounded-full' }"
              >
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  @click="toDelete = entry"
                >Verwijder</UButton>
                <template #body>
                  <div class="font-semibold">Bevestig verwijderen</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Weet je zeker dat je "{{ entry.description || formatDate(entry.start_date) }}" wilt verwijderen?
                  </div>
                </template>
                <template #footer>
                  <div class="flex justify-end gap-2">
                    <UButton
                      color="error"
                      :loading="deleting"
                      icon="i-lucide-trash-2"
                      @click="onDelete"
                    >Verwijderen</UButton>
                  </div>
                </template>
              </UModal>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'admin' })

  type OrgUnavailability = {
    id: number
    start_date: string
    end_date: string
    morning: boolean
    daytime: boolean
    nighttime: boolean
    description: string | null
    is_default: boolean
  }

  type OrgUnavailabilityCreate = Omit<OrgUnavailability, 'id' | 'is_default'>

  const { $api } = useNuxtApp()
  const toast = useToast()

  const selectedYear = ref(new Date().getFullYear())
  const entries = ref<OrgUnavailability[]>([])
  const expanded = ref<Set<number>>(new Set())
  const showCreate = ref(false)
  const creating = ref(false)
  const seeding = ref(false)
  const savingId = ref<number | null>(null)
  const deleting = ref(false)
  const toDelete = ref<OrgUnavailability | null>(null)

  const createForm = reactive<OrgUnavailabilityCreate>({
    description: '',
    start_date: '',
    end_date: '',
    morning: true,
    daytime: true,
    nighttime: true,
  })

  function toggle(id: number): void {
    const s = new Set(expanded.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    expanded.value = s
  }

  function formatDate(d: string): string {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}-${m}-${y}`
  }

  function entryLabel(entry: OrgUnavailability): string {
    const dateStr =
      entry.start_date === entry.end_date
        ? formatDate(entry.start_date)
        : `${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}`
    const parts: string[] = []
    if (entry.morning) parts.push('Ochtend')
    if (entry.daytime) parts.push('Dag')
    if (entry.nighttime) parts.push('Nacht')
    const partsStr = parts.length < 3 ? ` (${parts.join(', ')})` : ''
    const name = entry.description ? `${entry.description} — ` : ''
    return `${name}${dateStr}${partsStr}`
  }

  async function loadEntries(): Promise<void> {
    try {
      entries.value = await $api<OrgUnavailability[]>('/api/organization-unavailabilities', {
        query: { year: selectedYear.value },
      })
    } catch {
      toast.add({ title: 'Laden mislukt', color: 'error' })
    }
  }

  async function onCreate(): Promise<void> {
    creating.value = true
    try {
      const created = await $api<OrgUnavailability>('/api/organization-unavailabilities', {
        method: 'POST',
        body: { ...createForm, is_default: false },
      })
      entries.value.push(created)
      entries.value.sort((a, b) => a.start_date.localeCompare(b.start_date))
      Object.assign(createForm, {
        description: '',
        start_date: '',
        end_date: '',
        morning: true,
        daytime: true,
        nighttime: true,
      })
      showCreate.value = false
      toast.add({ title: 'Vrije dag toegevoegd', color: 'success' })
    } catch (e: unknown) {
      const msg = (e as any)?.response?._data?.detail || String(e)
      toast.add({ title: 'Toevoegen mislukt', description: msg, color: 'error' })
    } finally {
      creating.value = false
    }
  }

  function onCancelCreate(): void {
    showCreate.value = false
    Object.assign(createForm, {
      description: '',
      start_date: '',
      end_date: '',
      morning: true,
      daytime: true,
      nighttime: true,
    })
  }

  async function onSave(entry: OrgUnavailability): Promise<void> {
    savingId.value = entry.id
    try {
      const { id: _id, is_default: _def, ...payload } = entry
      const updated = await $api<OrgUnavailability>(
        `/api/organization-unavailabilities/${entry.id}`,
        { method: 'PATCH', body: payload }
      )
      const idx = entries.value.findIndex((x) => x.id === entry.id)
      if (idx >= 0) entries.value[idx] = updated
      entries.value.sort((a, b) => a.start_date.localeCompare(b.start_date))
      toggle(entry.id)
      toast.add({ title: 'Opgeslagen', color: 'success' })
    } catch (e: unknown) {
      const msg = (e as any)?.response?._data?.detail || String(e)
      toast.add({ title: 'Opslaan mislukt', description: msg, color: 'error' })
    } finally {
      savingId.value = null
    }
  }

  async function onDelete(): Promise<void> {
    if (!toDelete.value) return
    deleting.value = true
    try {
      await $api(`/api/organization-unavailabilities/${toDelete.value.id}`, { method: 'DELETE' })
      entries.value = entries.value.filter((x) => x.id !== toDelete.value!.id)
      toDelete.value = null
      toast.add({ title: 'Verwijderd', color: 'success' })
    } catch {
      toast.add({ title: 'Verwijderen mislukt', color: 'error' })
    } finally {
      deleting.value = false
    }
  }

  async function onSeed(): Promise<void> {
    seeding.value = true
    try {
      const seeded = await $api<OrgUnavailability[]>(
        `/api/organization-unavailabilities/seed/${selectedYear.value}`,
        { method: 'POST' }
      )
      entries.value = seeded
      toast.add({
        title: `${seeded.length} feestdagen ingeladen voor ${selectedYear.value}`,
        color: 'success',
      })
    } catch (e: unknown) {
      const msg = (e as any)?.response?._data?.detail || String(e)
      toast.add({ title: 'Inladen mislukt', description: msg, color: 'error' })
    } finally {
      seeding.value = false
    }
  }

  onMounted(loadEntries)
</script>
