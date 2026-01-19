<template>
  <UModal
    :open="open"
    title="Status aanpassen"
    :ui="{ footer: 'justify-end' }"
    @update:open="(value) => emit('update:open', value)"
  >
    <template #body>
      <div class="space-y-4 text-sm">
        <div>
          <label class="block text-xs mb-1">Nieuwe status</label>
          <USelectMenu
            :model-value="selectedStatusOption"
            :items="statusOptions"
            placeholder="Kies status"
            class="w-xs"
            @update:model-value="onStatusOptionSelect"
          />
        </div>

        <!-- Planned Mode (Admin Only) -->
        <div v-if="localStatus === 'planned'" class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-xs mb-1">Weeknummer</label>
            <UInput v-model.number="plannedWeek" type="number" min="1" max="53" />
          </div>
          <div>
            <label class="block text-xs mb-1">Onderzoekers</label>
            <UInputMenu
              :model-value="selectedResearcherOptions"
              :items="researcherOptions"
              multiple
              class="w-full"
              @update:model-value="onResearchersChange"
            />
          </div>
        </div>

        <!-- Execution Modes -->
        <div v-if="localStatus === 'executed'" class="space-y-2">
          <div>
            <label class="block text-xs mb-1">Datum uitvoering</label>
            <UInput v-model="executionDate" type="date" />
            <div v-if="dateError" class="text-xs text-red-500 mt-1">
              {{ dateError }}
            </div>
          </div>
        </div>

        <div v-else-if="localStatus === 'executed_with_deviation'" class="space-y-2">
          <div>
            <label class="block text-xs mb-1">Datum uitvoering</label>
            <UInput v-model="executionDate" type="date" />
            <div v-if="dateError" class="text-xs text-red-500 mt-1">
              {{ dateError }}
            </div>
          </div>
          <div>
            <label class="block text-xs mb-1">Beschrijf de afwijking</label>
            <UTextarea v-model="deviationReason" :rows="3" class="w-full" />
          </div>
        </div>

        <!-- Not Executed Mode -->
        <div v-else-if="localStatus === 'not_executed'" class="space-y-2">
          <!-- Some logic might require a date even for not_executed, but usually just reason. 
               The original code sent 'date': todayIso() for not_executed. 
               Let's keep it simple for now or expose date if needed. 
               The original code hardcoded `todayIso()` for not_executed. 
          -->
          <div>
             <label class="block text-xs mb-1">Reden</label>
             <UTextarea v-model="notExecutedReason" :rows="3" class="w-full" />
          </div>
        </div>
        
        <!-- Cancelled Mode (Admin Only) -->
        <div v-else-if="localStatus === 'cancelled'" class="space-y-2">
           <label class="block text-xs mb-1">Reden annuleren</label>
           <UTextarea v-model="comment" :rows="3" class="w-full" />
        </div>

        <!-- Generic Comment (Open/Planned) -->
        <div v-if="(localStatus === 'open' || localStatus === 'planned') && isAdmin" class="space-y-2">
           <label class="block text-xs mb-1">Opmerking (optioneel)</label>
           <UTextarea v-model="comment" :rows="3" class="w-full" />
        </div>

        <p class="text-xs text-gray-500 mt-2">
           <span v-if="visit.from_date && visit.to_date">
             Geplande periode: {{ formatDate(visit.from_date) }} - {{ formatDate(visit.to_date) }}
           </span>
        </p>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="onCancel"> Annuleren </UButton>
      <UButton :loading="submitting" @click="onSubmit"> Opslaan </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useTestModeStore } from '~~/stores/testMode'
import { storeToRefs } from 'pinia'

// Re-defining basic types if not imported, 
// though typically you might have them in a shared types file.
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

type VisitDetail = {
  id: number
  status: VisitStatusCode
  from_date: string | null
  to_date: string | null
  planned_week: number | null
  researchers: { id: number; full_name: string | null }[]
}

type StatusOption = { label: string; value: VisitStatusCode }
type ResearcherOption = { label: string; value: number | null }

const props = defineProps<{
  visit: VisitDetail
  open: boolean
  isAdmin?: boolean
  // Optional, for admin planning features
  researcherOptions?: ResearcherOption[] 
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const { $api } = useNuxtApp()
const toast = useToast()

const testModeStore = useTestModeStore()
const { simulatedDate } = storeToRefs(testModeStore)
const runtimeConfig = useRuntimeConfig()

// -- Helpers --

const testModeEnabled = computed<boolean>(() => {
  const raw = runtimeConfig.public.testModeEnabled
  if (typeof raw === 'string') {
    return raw === 'true' || raw === '1'
  }
  return Boolean(raw)
})

const effectiveToday = computed<Date>(() => {
  if (testModeEnabled.value && simulatedDate.value) {
    const dt = new Date(simulatedDate.value)
    if (!Number.isNaN(dt.getTime())) return dt
  }
  return new Date()
})

function todayIso(): string {
  const base = effectiveToday.value
  const m = `${base.getMonth() + 1}`.padStart(2, '0')
  const d = `${base.getDate()}`.padStart(2, '0')
  return `${base.getFullYear()}-${m}-${d}`
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
}

// -- State --

const localStatus = ref<VisitStatusCode>('open')
// Execution fields
const executionDate = ref('')
const deviationReason = ref('')
const notExecutedReason = ref('')
// Admin planning fields
const plannedWeek = ref<number | null>(null)
const selectedResearcherIds = ref<number[]>([])
const comment = ref('')

const submitting = ref(false)
const dateError = ref<string | null>(null)

// -- Computed --

const statusOptions = computed<StatusOption[]>(() => {
  const opts: StatusOption[] = []
  
  if (props.isAdmin) {
    opts.push({ label: 'Open', value: 'open' })
    opts.push({ label: 'Gepland', value: 'planned' })
  }
  
  // Researcher accessible statuses (also admin accessible)
  opts.push({ label: 'Uitgevoerd', value: 'executed' })
  opts.push({ label: 'Afwijking protocol', value: 'executed_with_deviation' })
  opts.push({ label: 'Niet uitgevoerd', value: 'not_executed' })

  if (props.isAdmin) {
    opts.push({ label: 'Geannuleerd', value: 'cancelled' })
  }

  return opts
})

const selectedStatusOption = computed(() => 
  statusOptions.value.find((o) => o.value === localStatus.value) ?? 
  // Fallback to avoid empty select if current status isn't in options
  { label: localStatus.value, value: localStatus.value } 
)

const selectedResearcherOptions = computed<ResearcherOption[]>(() => {
  if (!props.researcherOptions) return []
  const idSet = new Set(selectedResearcherIds.value)
  return props.researcherOptions.filter(
    (o) => o.value !== null && idSet.has(o.value)
  )
})

// -- Watchers --

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetState()
  }
})

watch(executionDate, (newVal) => {
  validateDate(newVal)
})

// -- Methods --

function resetState() {
  // Determine initial status mode.
  // If we are admin, we start with the visit's current status if it's one we support editing,
  // otherwise default to 'open' or 'executed'.
  // Reuse logic from original modals.
  
  const s = props.visit.status
  if (['executed', 'executed_with_deviation', 'not_executed', 'planned', 'open', 'cancelled'].includes(s)) {
      localStatus.value = s
  } else {
      // For statuses like 'created', 'created' isn't usually an edit target state, 
      // but 'open' is.
      localStatus.value = 'executed' // Default action for researchers usually
  }

  // However, if admin opens it, we might want to default to 'open' if status is created/open?
  // Let's stick to: if it's planned, show planned. If executed, show executed.
                 
  executionDate.value = todayIso()
  deviationReason.value = ''
  notExecutedReason.value = ''
  comment.value = ''
  dateError.value = null
  
  // Admin fields
  plannedWeek.value = props.visit.planned_week
  selectedResearcherIds.value = props.visit.researchers.map(r => r.id)
}

function onStatusOptionSelect(opt: StatusOption) {
  localStatus.value = opt.value
  dateError.value = null
}

function onResearchersChange(options: ResearcherOption[]) {
  selectedResearcherIds.value = options
    .map((o) => o.value)
    .filter((v): v is number => v !== null)
}

function validateDate(dateStr: string): boolean {
  dateError.value = null
  if (!dateStr) return true // handled by required check on submit if needed
  
  const d = new Date(dateStr)
  // Basic sanity
  if (Number.isNaN(d.getTime())) return false

  // Check bounds
  if (props.visit.from_date) {
    const from = new Date(props.visit.from_date)
    if (d < from) {
       dateError.value = `Dit bezoek moet worden uitgevoerd tussen ${formatDate(props.visit.from_date)} - ${formatDate(props.visit.to_date)}`
       return false
    }
  }
  if (props.visit.to_date) {
    const to = new Date(props.visit.to_date)
    if (d > to) {
      dateError.value = `Dit bezoek moet worden uitgevoerd tussen ${formatDate(props.visit.from_date)} - ${formatDate(props.visit.to_date)}`
      return false
    }
  }
  return true
}

function onCancel() {
  emit('update:open', false)
}

async function onSubmit() {
  submitting.value = true
  try {
    if (localStatus.value === 'executed') {
       if (!executionDate.value) {
         toast.add({ title: 'Kies een datum van uitvoering', color: 'error' })
         submitting.value = false
         return
       }
       if (!validateDate(executionDate.value)) {
         // Error already set
         submitting.value = false
         return
       }
       
       await $api(`/visits/${props.visit.id}/execute`, {
          method: 'POST',
          body: {
            execution_date: executionDate.value,
            comment: comment.value || null
          }
       })
       toast.add({ title: 'Bezoek uitgevoerd', color: 'success' })

    } else if (localStatus.value === 'executed_with_deviation') {
       if (!executionDate.value || !deviationReason.value.trim()) {
         toast.add({
            title: 'Datum en omschrijving van de afwijking zijn verplicht',
            color: 'error'
         })
         submitting.value = false
         return
       }
       if (!validateDate(executionDate.value)) {
         submitting.value = false
         return
       }

       await $api(`/visits/${props.visit.id}/execute-deviation`, {
          method: 'POST',
          body: {
            execution_date: executionDate.value,
            reason: deviationReason.value,
            comment: comment.value || null
          }
       })
       toast.add({ title: 'Bezoek uitgevoerd (met afwijking)', color: 'success' })

    } else if (localStatus.value === 'not_executed') {
       if (!notExecutedReason.value.trim()) {
         toast.add({ title: 'Reden is verplicht', color: 'error' })
         submitting.value = false
         return
       }
       // Original logic sent todayIso() as date.
       await $api(`/visits/${props.visit.id}/not-executed`, {
          method: 'POST',
          body: {
            date: todayIso(),
            reason: notExecutedReason.value
          }
       })
       toast.add({ title: 'Bezoek gemarkeerd als niet uitgevoerd', color: 'success' })

    } else if (localStatus.value === 'planned' && props.isAdmin) {
        if (
          plannedWeek.value == null ||
          !Number.isInteger(plannedWeek.value) ||
          selectedResearcherIds.value.length === 0
        ) {
          toast.add({
            title: 'Weeknummer en minstens één onderzoeker zijn verplicht voor Gepland',
            color: 'error'
          })
          submitting.value = false
          return
        }

        await $api(`/visits/${props.visit.id}/admin-planning-status`, {
          method: 'POST',
          body: {
            mode: 'planned',
            planned_week: plannedWeek.value,
            researcher_ids: selectedResearcherIds.value,
            comment: comment.value || null
          }
        })
        toast.add({ title: 'Planning bijgewerkt', color: 'success' })

    } else if (localStatus.value === 'open' && props.isAdmin) {
        await $api(`/visits/${props.visit.id}/admin-planning-status`, {
          method: 'POST',
          body: {
            mode: 'open',
            comment: comment.value || null
          }
        })
        toast.add({ title: 'Status op Open gezet', color: 'success' })

    } else if (localStatus.value === 'cancelled' && props.isAdmin) {
        if (!comment.value.trim()) {
          toast.add({ title: 'Reden voor annuleren is verplicht', color: 'error' })
          submitting.value = false
          return
        }
        await $api(`/visits/${props.visit.id}/cancel`, {
          method: 'POST',
          body: {
             reason: comment.value
          }
        })
        toast.add({ title: 'Bezoek geannuleerd', color: 'success' })
    }

    emit('saved')
    emit('update:open', false)

  } catch (e) {
    console.error(e)
    toast.add({ title: 'Kon status niet bijwerken', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
