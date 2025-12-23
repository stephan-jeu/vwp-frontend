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
            :model-value="selectedModeOption"
            :items="modeOptions"
            placeholder="Kies status"
            class="w-xs"
            @update:model-value="onModeChange"
          />
        </div>

        <div v-if="mode === 'planned'" class="grid grid-cols-1 gap-3">
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

        <div v-if="mode === 'executed'" class="space-y-2">
          <div>
            <label class="block text-xs mb-1">Datum uitvoering</label>
            <UInput v-model="executionDate" type="date" />
          </div>
        </div>

        <div v-if="mode === 'open' || mode === 'planned'" class="space-y-2">
          <label class="block text-xs mb-1">Opmerking (optioneel)</label>
          <UTextarea v-model="comment" :rows="3" class="w-full" />
        </div>

        <div v-else-if="mode === 'cancelled'" class="space-y-2">
          <label class="block text-xs mb-1">Reden annuleren</label>
          <UTextarea v-model="comment" :rows="3" class="w-full" />
        </div>

        <p class="text-xs text-gray-500">
          Deze wijziging past de planning of status van het bezoek aan. Eerdere
          uitvoerings- en beoordelingslogs blijven bewaard.
        </p>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="onCancel">
        Annuleren
      </UButton>
      <UButton :loading="submitting" @click="onSubmit">
        Opslaan
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
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

  type ModeValue = 'open' | 'planned' | 'executed' | 'cancelled'

  type ModeOption = { label: string; value: ModeValue }
  type ResearcherOption = { label: string; value: number | null }

  const props = defineProps<{
    visitId: number
    initialStatus: VisitStatusCode
    initialPlannedWeek: number | null
    initialResearcherIds: number[]
    researcherOptions: ResearcherOption[]
    open: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'saved'): void
  }>()

  const { $api } = useNuxtApp()
  const toast = useToast()

  const modeOptions: ModeOption[] = [
    { label: 'Open', value: 'open' },
    { label: 'Gepland', value: 'planned' },
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Geannuleerd', value: 'cancelled' }
  ]

  const mode = ref<ModeValue>('open')
  const plannedWeek = ref<number | null>(null)
  const selectedResearcherIds = ref<number[]>([])
  const executionDate = ref('')
  const comment = ref('')
  const submitting = ref(false)

  const selectedModeOption = computed<ModeOption | undefined>(() =>
    modeOptions.find((o) => o.value === mode.value)
  )

  const selectedResearcherOptions = computed<ResearcherOption[]>(() => {
    const idSet = new Set(selectedResearcherIds.value)
    return props.researcherOptions.filter(
      (o) => o.value !== null && idSet.has(o.value)
    )
  })

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        resetFromProps()
      }
    }
  )

  function resetFromProps(): void {
    if (props.initialStatus === 'planned') {
      mode.value = 'planned'
    } else {
      mode.value = 'open'
    }

    plannedWeek.value = props.initialPlannedWeek
    selectedResearcherIds.value = [...props.initialResearcherIds]
    comment.value = ''
    executionDate.value = ''
  }

  function onModeChange(option: ModeOption | null | undefined): void {
    const next = option?.value ?? 'open'
    mode.value = next
  }

  function onResearchersChange(options: ResearcherOption[]): void {
    selectedResearcherIds.value = options
      .map((o) => o.value)
      .filter((v): v is number => v !== null)
  }

  function onCancel(): void {
    emit('update:open', false)
  }

  async function onSubmit(): Promise<void> {
    submitting.value = true
    try {
      if (mode.value === 'open') {
        await $api(`/visits/${props.visitId}/admin-planning-status`, {
          method: 'POST',
          body: {
            mode: 'open',
            comment: comment.value || null
          }
        })
      } else if (mode.value === 'planned') {
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

        await $api(`/visits/${props.visitId}/admin-planning-status`, {
          method: 'POST',
          body: {
            mode: 'planned',
            planned_week: plannedWeek.value,
            researcher_ids: selectedResearcherIds.value,
            comment: comment.value || null
          }
        })
      } else if (mode.value === 'executed') {
        if (!executionDate.value) {
          toast.add({
            title: 'Kies een datum van uitvoering',
            color: 'error'
          })
          submitting.value = false
          return
        }

        await $api(`/visits/${props.visitId}/execute`, {
          method: 'POST',
          body: {
            execution_date: executionDate.value,
            comment: comment.value || null
          }
        })
      } else if (mode.value === 'cancelled') {
        if (!comment.value.trim()) {
          toast.add({
            title: 'Reden voor annuleren is verplicht',
            color: 'error'
          })
          submitting.value = false
          return
        }

        await $api(`/visits/${props.visitId}/cancel`, {
          method: 'POST',
          body: {
            reason: comment.value
          }
        })
      }

      toast.add({ title: 'Planningstatus bijgewerkt', color: 'success' })
      emit('saved')
      emit('update:open', false)
    } catch {
      toast.add({ title: 'Kon planningstatus niet bijwerken', color: 'error' })
    } finally {
      submitting.value = false
    }
  }
</script>
