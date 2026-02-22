<template>
  <UModal
    :open="open"
    title="Status aanpassen"
    :ui="{ footer: 'justify-end' }"
    @update:open="(value) => emit('update:open', value)"
  >
    <template #body>
      <div class="space-y-4 text-sm">
        <div v-if="isBulk" class="text-xs text-gray-500 font-medium">
          {{ visits.length }} bezoek(en) geselecteerd
        </div>

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

        <!-- Planned Mode (Admin Only, Single Visit) -->
        <div v-if="localStatus === 'planned'" class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-xs mb-1">{{ featureDailyPlanning ? 'Geplande datum' : 'Weeknummer' }}</label>
            <UInput v-if="featureDailyPlanning" v-model="plannedDate" type="date" />
            <UInput v-else v-model.number="plannedWeek" type="number" min="1" max="53" />
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

        <p v-if="!isBulk && singleVisit" class="text-xs text-gray-500 mt-2">
           <span v-if="singleVisit.from_date && singleVisit.to_date">
             Geplande periode: {{ formatDate(singleVisit.from_date) }} - {{ formatDate(singleVisit.to_date) }}
           </span>
        </p>

        <div v-if="bulkProgress" class="text-xs text-gray-500 mt-2">
          Bezig: {{ bulkProgress.done }}/{{ bulkProgress.total }}...
        </div>
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
  planned_date: string | null
  researchers: { id: number; full_name: string | null }[]
}

type StatusOption = { label: string; value: VisitStatusCode }
type ResearcherOption = { label: string; value: number | null }

const props = defineProps<{
  visits: VisitDetail[]
  open: boolean
  isAdmin?: boolean
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

// -- Computed helpers --

const isBulk = computed(() => props.visits.length > 1)
const singleVisit = computed(() => props.visits.length === 1 ? props.visits[0] : null)

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

const featureDailyPlanning = computed<boolean>(() => {
  const raw = runtimeConfig.public.featureDailyPlanning
  if (typeof raw === 'string') {
    return raw === 'true' || raw === '1'
  }
  return Boolean(raw)
})

// -- State --

const localStatus = ref<VisitStatusCode>('open')
const executionDate = ref('')
const deviationReason = ref('')
const notExecutedReason = ref('')
const plannedWeek = ref<number | null>(null)
const plannedDate = ref<string>('')
const selectedResearcherIds = ref<number[]>([])
const comment = ref('')

const submitting = ref(false)
const dateError = ref<string | null>(null)
const bulkProgress = ref<{ done: number; total: number } | null>(null)

// -- Computed --

const statusOptions = computed<StatusOption[]>(() => {
  const opts: StatusOption[] = []

  if (props.isAdmin) {
    opts.push({ label: 'Open', value: 'open' })
    if (!isBulk.value) {
      opts.push({ label: 'Gepland', value: 'planned' })
    }
  }

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
  if (!isBulk.value) {
    validateDate(newVal)
  }
})

// -- Methods --

function resetState() {
  if (isBulk.value) {
    localStatus.value = 'executed'
    plannedWeek.value = null
    plannedDate.value = ''
    selectedResearcherIds.value = []
  } else if (singleVisit.value) {
    const s = singleVisit.value.status
    if (!props.isAdmin && (s === 'planned' || s === 'open')) {
      localStatus.value = 'executed'
    } else if (['executed', 'executed_with_deviation', 'not_executed', 'planned', 'open', 'cancelled'].includes(s)) {
      localStatus.value = s
    } else {
      localStatus.value = 'executed'
    }
    plannedWeek.value = singleVisit.value.planned_week
    plannedDate.value = singleVisit.value.planned_date ?? ''
    selectedResearcherIds.value = singleVisit.value.researchers.map(r => r.id)
  }

  executionDate.value = todayIso()
  deviationReason.value = ''
  notExecutedReason.value = ''
  comment.value = ''
  dateError.value = null
  bulkProgress.value = null
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
  if (!dateStr) return true

  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false

  const visit = singleVisit.value
  if (!visit) return true

  if (visit.from_date) {
    const from = new Date(visit.from_date)
    if (d < from) {
       dateError.value = `Dit bezoek moet worden uitgevoerd tussen ${formatDate(visit.from_date)} - ${formatDate(visit.to_date)}`
       return false
    }
  }
  if (visit.to_date) {
    const to = new Date(visit.to_date)
    if (d > to) {
      dateError.value = `Dit bezoek moet worden uitgevoerd tussen ${formatDate(visit.from_date)} - ${formatDate(visit.to_date)}`
      return false
    }
  }
  return true
}

function onCancel() {
  emit('update:open', false)
}

async function submitForVisit(visitId: number): Promise<void> {
  if (localStatus.value === 'executed') {
    await $api(`/visits/${visitId}/execute`, {
      method: 'POST',
      body: {
        execution_date: executionDate.value,
        comment: comment.value || null
      }
    })
  } else if (localStatus.value === 'executed_with_deviation') {
    await $api(`/visits/${visitId}/execute-deviation`, {
      method: 'POST',
      body: {
        execution_date: executionDate.value,
        reason: deviationReason.value,
        comment: comment.value || null
      }
    })
  } else if (localStatus.value === 'not_executed') {
    await $api(`/visits/${visitId}/not-executed`, {
      method: 'POST',
      body: {
        date: todayIso(),
        reason: notExecutedReason.value
      }
    })
  } else if (localStatus.value === 'planned' && props.isAdmin) {
    await $api(`/visits/${visitId}/admin-planning-status`, {
      method: 'POST',
      body: {
        mode: 'planned',
        planned_week: featureDailyPlanning.value ? null : plannedWeek.value,
        planned_date: featureDailyPlanning.value ? (plannedDate.value || null) : null,
        researcher_ids: selectedResearcherIds.value,
        comment: comment.value || null
      }
    })
  } else if (localStatus.value === 'open' && props.isAdmin) {
    await $api(`/visits/${visitId}/admin-planning-status`, {
      method: 'POST',
      body: {
        mode: 'open',
        comment: comment.value || null
      }
    })
  } else if (localStatus.value === 'cancelled' && props.isAdmin) {
    await $api(`/visits/${visitId}/cancel`, {
      method: 'POST',
      body: {
        reason: comment.value
      }
    })
  }
}

async function onSubmit() {
  submitting.value = true
  try {
    // Validate common fields
    if (localStatus.value === 'executed') {
      if (!executionDate.value) {
        toast.add({ title: 'Kies een datum van uitvoering', color: 'error' })
        submitting.value = false
        return
      }
      if (!isBulk.value && !validateDate(executionDate.value)) {
        submitting.value = false
        return
      }
    } else if (localStatus.value === 'executed_with_deviation') {
      if (!executionDate.value || !deviationReason.value.trim()) {
        toast.add({
          title: 'Datum en omschrijving van de afwijking zijn verplicht',
          color: 'error'
        })
        submitting.value = false
        return
      }
      if (!isBulk.value && !validateDate(executionDate.value)) {
        submitting.value = false
        return
      }
    } else if (localStatus.value === 'not_executed') {
      if (!notExecutedReason.value.trim()) {
        toast.add({ title: 'Reden is verplicht', color: 'error' })
        submitting.value = false
        return
      }
    } else if (localStatus.value === 'planned' && props.isAdmin) {
      const hasPlanningField = featureDailyPlanning.value
        ? !!plannedDate.value
        : (plannedWeek.value != null && Number.isInteger(plannedWeek.value))
      if (!hasPlanningField || selectedResearcherIds.value.length === 0) {
        const fieldLabel = featureDailyPlanning.value ? 'Datum' : 'Weeknummer'
        toast.add({
          title: `${fieldLabel} en minstens één onderzoeker zijn verplicht voor Gepland`,
          color: 'error'
        })
        submitting.value = false
        return
      }
    } else if (localStatus.value === 'cancelled' && props.isAdmin) {
      if (!comment.value.trim()) {
        toast.add({ title: 'Reden voor annuleren is verplicht', color: 'error' })
        submitting.value = false
        return
      }
    }

    if (isBulk.value) {
      let succeeded = 0
      let failed = 0
      bulkProgress.value = { done: 0, total: props.visits.length }

      for (const visit of props.visits) {
        try {
          await submitForVisit(visit.id)
          succeeded++
        } catch (e) {
          console.error(`Failed to update visit ${visit.id}:`, e)
          failed++
        }
        bulkProgress.value = { done: succeeded + failed, total: props.visits.length }
      }

      if (failed === 0) {
        toast.add({ title: `${succeeded} bezoek(en) bijgewerkt`, color: 'success' })
      } else if (succeeded > 0) {
        toast.add({ title: `${succeeded} van ${props.visits.length} bezoeken bijgewerkt, ${failed} mislukt`, color: 'warning' })
      } else {
        toast.add({ title: 'Kon geen enkel bezoek bijwerken', color: 'error' })
      }

      emit('saved')
      emit('update:open', false)
    } else {
      if (!props.visits[0]) return
      await submitForVisit(props.visits[0].id)

      const statusMessages: Partial<Record<VisitStatusCode, string>> = {
        executed: 'Bezoek uitgevoerd',
        executed_with_deviation: 'Bezoek uitgevoerd (met afwijking)',
        not_executed: 'Bezoek gemarkeerd als niet uitgevoerd',
        planned: 'Planning bijgewerkt',
        open: 'Status op Open gezet',
        cancelled: 'Bezoek geannuleerd'
      }
      toast.add({ title: statusMessages[localStatus.value] ?? 'Status bijgewerkt', color: 'success' })

      emit('saved')
      emit('update:open', false)
    }

  } catch (e) {
    console.error(e)
    toast.add({ title: 'Kon status niet bijwerken', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
