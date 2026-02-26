<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-sm text-gray-500">Laden...</div>
    <div v-else-if="error" class="text-sm text-red-500">Fout bij laden.</div>
    <div v-else class="space-y-3">
      <!-- List Unavailabilities -->
      <div v-if="unavailabilities.length === 0" class="text-sm text-gray-500 italic">
        Geen uitzonderingen / verlof geregistreerd.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="u in unavailabilities"
          :key="u.id"
          class="flex items-center justify-between border rounded p-2 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div>
            <div class="font-medium">
              {{ formatDate(u.start_date) }} - {{ formatDate(u.end_date) }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Afwezig: {{ describeParts(u) }}
            </div>
          </div>
          <div v-if="!readonly" class="flex gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="editUnavailability(u)"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="xs"
              :loading="deleting === u.id"
              @click="deleteUnavailability(u.id)"
            />
          </div>
        </li>
      </ul>

      <!-- Add New -->
      <div v-if="!readonly" class="pt-2 border-t mt-4">
        <div v-if="!showForm" class="flex justify-end">
          <UButton size="xs" icon="i-heroicons-plus" @click="openForm">Nieuw verlof / uitzondering</UButton>
        </div>
        <div v-else class="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 space-y-3">
          <div class="font-medium text-sm">
            {{ editingId ? 'Verlof bewerken' : 'Nieuw verlof toevoegen' }}
          </div>
          
          <div class="grid grid-cols-2 gap-2">
             <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Startdatum</label>
                <UInput v-model="form.start_date" type="date"></UInput>
             </div>
             <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Einddatum</label>
                <UInput v-model="form.end_date" type="date"></UInput>
             </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium">Betreft welke dagdelen?</label>
            <div class="flex gap-4 items-center">
              <UCheckbox v-model="form.morning" label="Ochtend"></UCheckbox>
              <UCheckbox v-model="form.daytime" label="Overdag"></UCheckbox>
              <UCheckbox v-model="form.nighttime" label="Avond"></UCheckbox>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
             <UButton color="neutral" variant="ghost" size="xs" @click="cancelForm">Annuleren</UButton>
             <UButton color="primary" size="xs" :loading="saving" @click="saveUnavailability">
               {{ editingId ? 'Opslaan' : 'Toevoegen' }}
             </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  userId: number
  readonly?: boolean
}>(), { readonly: false })

const { $api } = useNuxtApp()
const toast = useToast()

type Unavailability = {
  id: number
  start_date: string
  end_date: string
  morning: boolean
  daytime: boolean
  nighttime: boolean
}

type UnavailabilityCreate = {
  start_date: string
  end_date: string
  morning: boolean
  daytime: boolean
  nighttime: boolean
}

const loading = ref(false)
const error = ref(false)
const unavailabilities = ref<Unavailability[]>([])
const showForm = ref(false)
const saving = ref(false)
const deleting = ref<number | null>(null)
const editingId = ref<number | null>(null)

const form = reactive<UnavailabilityCreate>({
  start_date: '',
  end_date: '',
  morning: true,
  daytime: true,
  nighttime: true,
})

async function loadUnavailabilities() {
  loading.value = true
  error.value = false
  try {
    unavailabilities.value = await $api<Unavailability[]>(`/api/users/${props.userId}/unavailabilities`)
  } catch (e) {
    console.error(e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL')
}

function describeParts(u: Unavailability) {
  const parts = []
  if (u.morning) parts.push('Ochtend')
  if (u.daytime) parts.push('Overdag')
  if (u.nighttime) parts.push('Avond')
  return parts.length ? parts.join(', ') : 'Niets geselecteerd'
}

function openForm() {
    editingId.value = null
    form.start_date = ''
    form.end_date = ''
    form.morning = true
    form.daytime = true
    form.nighttime = true
    showForm.value = true
}

function editUnavailability(u: Unavailability) {
  editingId.value = u.id
  form.start_date = u.start_date
  form.end_date = u.end_date
  form.morning = u.morning
  form.daytime = u.daytime
  form.nighttime = u.nighttime
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

async function saveUnavailability() {
    if (!form.start_date || !form.end_date) {
        toast.add({ title: 'Vul start- en einddatum in', color: 'error' })
        return
    }
    saving.value = true
    try {
        if (editingId.value) {
            await $api(`/api/unavailabilities/${editingId.value}`, {
                method: 'PATCH',
                body: form
            })
            toast.add({ title: 'Aangepast', color: 'success' })
        } else {
            await $api(`/api/users/${props.userId}/unavailabilities`, {
                method: 'POST',
                body: form
            })
            toast.add({ title: 'Opgeslagen', color: 'success' })
        }
        await loadUnavailabilities()
        showForm.value = false
        editingId.value = null
    } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (e as any)?.response?._data?.detail || String(e)
        console.error(msg)
        toast.add({ title: 'Fout bij opslaan', description: msg, color: 'error' })
    } finally {
        saving.value = false
    }
}

async function deleteUnavailability(id: number) {
    if (!confirm('Zeker weten?')) return
    deleting.value = id
    try {
        await $api(`/api/unavailabilities/${id}`, { method: 'DELETE' })
        await loadUnavailabilities()
        toast.add({ title: 'Verwijderd', color: 'success' })
    } catch {
        toast.add({ title: 'Kon niet verwijderen', color: 'error' })
    } finally {
        deleting.value = null
    }
}

onMounted(() => {
    loadUnavailabilities()
})

watch(() => props.userId, () => {
    loadUnavailabilities()
})
</script>
