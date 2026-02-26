<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-sm text-gray-500">Laden...</div>
    <div v-else-if="error" class="text-sm text-red-500">Fout bij laden.</div>
    <div v-else class="space-y-3">
      <!-- List Patterns -->
      <div v-if="patterns.length === 0" class="text-sm text-gray-500 italic">
        Geen beschikbaarheidspatronen ingesteld.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="p in patterns"
          :key="p.id"
          class="flex items-center justify-between border rounded p-2 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div>
            <div class="font-medium">
              {{ formatDate(p.start_date) }} - {{ formatDate(p.end_date) }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Max ochtenden: {{ p.max_mornings_per_week }}, Max avonden: {{ p.max_evenings_per_week }} |
              {{ describeSchedule(p.schedule) }}
            </div>
          </div>
          <div v-if="!readonly" class="flex gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="editPattern(p)"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="xs"
              :loading="deleting === p.id"
              @click="deletePattern(p.id)"
            />
          </div>
        </li>
      </ul>

      <!-- Add New -->
      <div v-if="!readonly" class="pt-2 border-t mt-4">
        <div v-if="!showForm" class="flex justify-end">
          <UButton size="xs" icon="i-heroicons-plus" @click="openForm">Nieuwe periode</UButton>
        </div>
        <div v-else class="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 space-y-3">
          <div class="font-medium text-sm">
            {{ editingId ? 'Periode bewerken' : 'Nieuwe periode toevoegen' }}
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

          <div class="grid grid-cols-2 gap-2">
             <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Max ochtenden per week</label>
                <UInput v-model.number="form.max_mornings_per_week" type="number" min="0"></UInput>
             </div>
             <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">Max avonden per week</label>
                <UInput v-model.number="form.max_evenings_per_week" type="number" min="0"></UInput>
             </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium">Beschikbaarheid per dag</label>
            <div
              v-for="day in days" 
              :key="day.value"
              class="grid grid-cols-[100px_1fr] items-center gap-2 text-sm"
            >
              <span class="capitalize">{{ day.label }}</span>
              <div class="flex gap-2">
                 <UCheckbox 
                    label="Ochtend" 
                    :model-value="hasPart(day.value, 'morning')" 
                    @update:model-value="(v: any) => setPart(day.value, 'morning', v as boolean)"
                 ></UCheckbox>
                 <UCheckbox 
                    label="Dag" 
                    :model-value="hasPart(day.value, 'daytime')" 
                    @update:model-value="(v: any) => setPart(day.value, 'daytime', v as boolean)"
                 ></UCheckbox>
                 <UCheckbox 
                    label="Avond" 
                    :model-value="hasPart(day.value, 'nighttime')" 
                    @update:model-value="(v: any) => setPart(day.value, 'nighttime', v as boolean)"
                 ></UCheckbox>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
             <UButton color="neutral" variant="ghost" size="xs" @click="cancelForm">Annuleren</UButton>
             <UButton color="primary" size="xs" :loading="saving" @click="savePattern">
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

type PartOfDay = 'morning' | 'daytime' | 'nighttime'
type ScheduleMap = Record<string, PartOfDay[]>

type Pattern = {
  id: number
  start_date: string
  end_date: string
  max_mornings_per_week: number
  max_evenings_per_week: number
  schedule: ScheduleMap
}

type PatternCreate = {
  start_date: string
  end_date: string
  max_mornings_per_week: number
  max_evenings_per_week: number
  schedule: ScheduleMap
}

const loading = ref(false)
const error = ref(false)
const patterns = ref<Pattern[]>([])
const showForm = ref(false)
const saving = ref(false)
const deleting = ref<number | null>(null)
const editingId = ref<number | null>(null)

const form = reactive<PatternCreate>({
  start_date: '',
  end_date: '',
  max_mornings_per_week: 2,
  max_evenings_per_week: 5,
  schedule: {}
})

const days = [
  { label: 'Maandag', value: 'monday' },
  { label: 'Dinsdag', value: 'tuesday' },
  { label: 'Woensdag', value: 'wednesday' },
  { label: 'Donderdag', value: 'thursday' },
  { label: 'Vrijdag', value: 'friday' },
  { label: 'Zaterdag', value: 'saturday' },
  { label: 'Zondag', value: 'sunday' },
]

async function loadPatterns() {
  loading.value = true
  error.value = false
  try {
    patterns.value = await $api<Pattern[]>(`/api/users/${props.userId}/patterns`)
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

function describeSchedule(s: ScheduleMap) {
  const partNames: Record<string, string> = {
    morning: 'Ochtend', daytime: 'Dag', nighttime: 'Avond'
  }

  const entries = days
    .filter(day => (s[day.value] || []).length > 0)
    .map((day) => {
      const parts = s[day.value] || []
      const p = parts.map(part => partNames[part] || part).join(', ')
      return `${day.label.substring(0, 2)}: ${p}`
    })
    
  if (entries.length === 0) return 'Geen dagen geselecteerd'
  return entries.join(' | ')
}

function hasPart(day: string, part: PartOfDay) {
  return (form.schedule[day] || []).includes(part)
}

function setPart(day: string, part: PartOfDay, checked: boolean) {
  const current = form.schedule[day] || []
  if (checked) {
    if (!current.includes(part)) {
      form.schedule[day] = [...current, part]
    }
  } else {
    form.schedule[day] = current.filter(p => p !== part)
  }
}

function openForm() {
    editingId.value = null
    // Logic: Pre-fill with previous pattern if exists
    form.start_date = ''
    form.end_date = ''
    form.max_mornings_per_week = 2
    form.max_evenings_per_week = 5
    form.schedule = {}
    
    if (patterns.value.length > 0) {
        // Find latest end date
        const sorted = [...patterns.value].sort((a,b) => a.end_date > b.end_date ? -1 : 1)
        const last = sorted[0]
        
        if (last && last.end_date) {
            // Propose next day start
            const lastEnd = new Date(last.end_date)
            const nextStart = new Date(lastEnd)
            nextStart.setDate(lastEnd.getDate() + 1)
            form.start_date = nextStart.toISOString().slice(0, 10)
            
            // Copy schedule and max visits
            form.max_mornings_per_week = last.max_mornings_per_week
            form.max_evenings_per_week = last.max_evenings_per_week
            // deep copy schedule
            form.schedule = JSON.parse(JSON.stringify(last.schedule))
        }
    }
    
    showForm.value = true
}

function editPattern(p: Pattern) {
  editingId.value = p.id
  form.start_date = p.start_date
  form.end_date = p.end_date
  form.max_mornings_per_week = p.max_mornings_per_week
  form.max_evenings_per_week = p.max_evenings_per_week
  form.schedule = JSON.parse(JSON.stringify(p.schedule))
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

async function savePattern() {
    if (!form.start_date || !form.end_date) {
        toast.add({ title: 'Vul start- en einddatum in', color: 'error' })
        return
    }
    saving.value = true
    try {
        if (editingId.value) {
            await $api(`/api/patterns/${editingId.value}`, {
                method: 'PATCH',
                body: form
            })
            toast.add({ title: 'Aangepast', color: 'success' })
        } else {
            await $api(`/api/users/${props.userId}/patterns`, {
                method: 'POST',
                body: form
            })
            toast.add({ title: 'Opgeslagen', color: 'success' })
        }
        await loadPatterns()
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

async function deletePattern(id: number) {
    if (!confirm('Zeker weten?')) return
    deleting.value = id
    try {
        await $api(`/api/patterns/${id}`, { method: 'DELETE' })
        await loadPatterns()
        toast.add({ title: 'Verwijderd', color: 'success' })
    } catch {
        toast.add({ title: 'Kon niet verwijderen', color: 'error' })
    } finally {
        deleting.value = null
    }
}

onMounted(() => {
    loadPatterns()
})

watch(() => props.userId, () => {
    loadPatterns()
})
</script>
