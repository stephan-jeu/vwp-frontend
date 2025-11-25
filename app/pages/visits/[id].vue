<template>
  <div>
    <UPageHeader :title="pageTitle" />

    <UCard class="mt-4">
      <div v-if="pending" class="text-sm text-gray-700 dark:text-gray-300">Bezoek wordt geladen…</div>
      <div v-else-if="error || !visit" class="text-sm text-red-500">
        Kon dit bezoek niet laden.
      </div>

      <div v-else class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="text-xs text-gray-700 dark:text-gray-300">Project</div>
              <div class="text-sm font-semibold text-gray-800">
                {{ visit.project_code }} · {{ visit.project_location }}
              </div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                Cluster {{ visit.cluster_number }} · {{ visit.cluster_address }}
              </div>
              <div class="mt-1 text-xs text-gray-700 dark:text-gray-300">
                Bezoek nr {{ visit.visit_nr ?? '-' }}
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <div v-if="canEditStatus">
                <UButton size="sm" icon="i-lucide-shield-check" class="dark:text-gray-300" @click="openStatusModal">
                  {{ statusLabel(visit.status) }}
                </UButton>
              </div>
              <div v-else>
                <UBadge>{{ statusLabel(visit.status) }}</UBadge>
              </div>
              <UBadge v-if="weekBadge(visit)" color="warning">
                {{ weekBadge(visit) }}
              </UBadge>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <USwitch
              v-model="advertizedLocal"
              :disabled="advertizedUpdating || !canEditAdvertised"
              @update:model-value="onToggleAdvertized"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Vraag iemand anders</span>
            <UPopover>
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-circle-question-mark"
              />
              <template #content>
                <div class="p-3 text-xs text-gray-700 dark:text-gray-300 max-w-xs">
                  Zet dit aan als je graag wilt dat iemand anders dit bezoek overneemt. Dit verzoek
                  komt dan terecht in 'Hulp gevraagd'.
                </div>
              </template>
            </UPopover>
          </div>
        </div>

        <div class="border-t pt-3 flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
          <div v-if="visit.part_of_day">
            <span class="font-medium">Dagdeel:</span>
            <span class="ml-1">{{ visit.part_of_day }}</span>
          </div>
          <div v-if="visit.start_time_text">
            <span class="font-medium">Starttijd:</span>
            <span class="ml-1">{{ visit.start_time_text }}</span>
          </div>
          <div>
            <span class="font-medium">Periode:</span>
            <span class="ml-1">
              {{ formatDate(visit.from_date) }} – {{ formatDate(visit.to_date) }}
            </span>
          </div>

          <div>
            <span class="font-medium">Functies:</span>
            <span class="ml-1">
              {{ visit.functions.map((f) => f.name).join(', ') || '-' }}
            </span>
          </div>
          <div>
            <span class="font-medium">Soorten:</span>
            <span class="ml-1">
              {{ visit.species.map((s) => s.abbreviation || s.name).join(', ') || '-' }}
            </span>
          </div>
          <div>
            <span class="font-medium">Onderzoekers:</span>
            <span class="ml-1">
              {{
                visit.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ') ||
                '-'
              }}
            </span>
          </div>

          <div class="mt-2">
            <span class="font-medium">Weercondities:</span>
            <span class="ml-1">
              Min {{ visit.min_temperature_celsius ?? '-' }} °C, max wind
              {{ visit.max_wind_force_bft ?? '-' }}, max neerslag
              {{ visit.max_precipitation || '-' }}
            </span>
          </div>

          <div
            v-if="visit.project_google_drive_folder"
            class="mt-1 text-sm text-primary-600"
          >
            <a
              :href="visit.project_google_drive_folder"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              Project Google drive
            </a>
          </div>

          <div class="mt-2">
            <span class="font-medium">Bijzonderheden:</span>
            <span class="ml-1">
              <span v-if="!hasFlags">-</span>
            </span>
          </div>
          <div v-if="hasFlags" class="mt-1 flex flex-wrap gap-1">
            <UBadge v-if="visit.wbc" class="bg-amber-600 mr-1">WBC</UBadge>
            <UBadge v-if="visit.fiets" class="bg-amber-600 mr-1">Fiets</UBadge>
            <UBadge v-if="visit.hub" class="bg-amber-600 mr-1">HUB</UBadge>
            <UBadge v-if="visit.dvp" class="bg-amber-600 mr-1">DvP</UBadge>
            <UBadge v-if="visit.sleutel" class="bg-amber-600 mr-1">Sleutel</UBadge>
            <UBadge v-if="visit.priority" class="bg-amber-600 mr-1">Prioriteit</UBadge>
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="font-medium mb-1 text-sm">Opmerkingen veld</div>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {{ visit.remarks_field || 'Geen opmerkingen' }}
          </p>
        </div>

        <VisitActivityLog :visit-id="visit.id" />
      </div>
    </UCard>

    <UModal
      v-model:open="statusModalOpen"
      title="Status bewerken"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4 text-sm">
          <div>
            <label class="block text-xs mb-1">Nieuwe status</label>
            <USelectMenu
              :model-value="selectedStatusActionOption"
              :items="statusActionOptions"
              placeholder="Kies status"
              @update:model-value="onStatusActionSelect"
            />
          </div>

          <div v-if="statusAction === 'executed'">
            <label class="block text-xs mb-1">Datum uitvoering</label>
            <UInput v-model="statusDate" type="date" />
          </div>

          <div v-else-if="statusAction === 'executed_with_deviation'">
            <label class="block text-xs mb-1">Datum uitvoering</label>
            <UInput v-model="statusDate" type="date" class="mb-3" />
            <label class="block text-xs mb-1">Beschrijf de afwijking</label>
            <UTextarea v-model="deviationReason" :rows="3" class="w-full" />
          </div>

          <div v-else-if="statusAction === 'not_executed'">
            <label class="block text-xs mb-1">Reden</label>
            <UTextarea v-model="notExecutedReason" :rows="3" class="w-full"/>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="onCancelStatus">
          Annuleren
        </UButton>
        <UButton :loading="statusSubmitting" @click="onSubmitStatus">
          Opslaan
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'

  definePageMeta({ layout: 'default' })

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

  type CompactFunction = { id: number; name: string }
  type CompactSpecies = { id: number; name: string; abbreviation?: string | null }
  type UserName = { id: number; full_name: string | null }

  type VisitDetailRow = {
    id: number
    project_code: string
    project_location: string
    project_google_drive_folder: string | null
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
    advertized: boolean
    quote: boolean
  }

  type StatusAction = 'executed' | 'executed_with_deviation' | 'not_executed' | null
  type StatusActionOption = { label: string; value: Exclude<StatusAction, null> }

  const route = useRoute()
  const { $api } = useNuxtApp()
  const toast = useToast()

  const auth = useAuthStore()
  const { isAdmin, identity } = storeToRefs(auth)

  const visitId = computed(() => Number(route.params.id))

  const {
    data,
    pending,
    error,
    refresh
  } = useAsyncData('visit-detail', () => $api<VisitDetailRow>(`/visits/${visitId.value}`), {
    watch: [visitId]
  })

  const visit = computed<VisitDetailRow | null>(() => data.value ?? null)

  const pageTitle = computed(() => {
    if (!visit.value) return 'Bezoekdetails'
    if (visit.value.visit_nr != null) return `Bezoek ${visit.value.visit_nr}`
    return `Bezoek #${visit.value.id}`
  })

  const hasFlags = computed(
    () =>
      !!visit.value &&
      (visit.value.wbc ||
        visit.value.fiets ||
        visit.value.hub ||
        visit.value.dvp ||
        visit.value.sleutel ||
        visit.value.priority)
  )

  const canEditAdvertised = computed(() => {
    if (!visit.value) return isAdmin.value
    const userId = identity.value?.id
    if (!userId) return isAdmin.value
    return (
      isAdmin.value ||
      visit.value.researchers.some((r) => r.id === userId)
    )
  })

  const canEditStatus = computed(() => {
    if (!visit.value) return isAdmin.value
    const userId = identity.value?.id
    if (!userId) return isAdmin.value
    return (
      isAdmin.value ||
      visit.value.researchers.some((r) => r.id === userId)
    )
  })

  const statusActionOptions: StatusActionOption[] = [
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Afwijking protocol', value: 'executed_with_deviation' },
    { label: 'Niet uitgevoerd', value: 'not_executed' }
  ]

  const selectedStatusActionOption = computed<StatusActionOption | undefined>(() => {
    if (!statusAction.value) return undefined
    return statusActionOptions.find((o) => o.value === statusAction.value)
  })

  function statusLabel(code: VisitStatusCode): string {
    switch (code) {
      case 'created':
        return 'Aangemaakt'
      case 'open':
        return 'Open'
      case 'planned':
        return 'Gepland'
      case 'overdue':
        return 'Verlopen'
      case 'missed':
        return 'Gemist'
      case 'executed':
        return 'Uitgevoerd'
      case 'executed_with_deviation':
        return 'Uitgevoerd (afwijking)'
      case 'not_executed':
        return 'Niet uitgevoerd'
      case 'approved':
        return 'Goedgekeurd'
      case 'rejected':
        return 'Afgekeurd'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return code
    }
  }

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function isThisWeek(dateStr: string | null): boolean {
    if (!dateStr) return false
    const dt = new Date(dateStr)
    if (Number.isNaN(dt.getTime())) return false

    const now = new Date()
    const monday = new Date(now)
    const day = now.getDay() || 7 // Monday=1..Sunday=7
    monday.setDate(now.getDate() - (day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return dt >= monday && dt <= sunday
  }

  function weekBadge(v: VisitDetailRow): string | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (v.from_date && isThisWeek(v.from_date)) {
      const from = new Date(v.from_date)
      const fromDateOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      if (fromDateOnly > today) {
        return 'Na woensdag'
      }
    }

    if (v.to_date && isThisWeek(v.to_date)) {
      return 'Voor donderdag'
    }

    return null
  }

  const advertizedLocal = ref(false)
  const advertizedUpdating = ref(false)

  watch(
    () => visit.value?.advertized,
    (val) => {
      if (typeof val === 'boolean') advertizedLocal.value = val
    },
    { immediate: true }
  )

  async function onToggleAdvertized(val: boolean): Promise<void> {
    if (!visit.value || !canEditAdvertised.value) return
    advertizedUpdating.value = true
    const previous = !val
    try {
      await $api(`/visits/${visit.value.id}/advertised`, {
        method: 'POST',
        body: { advertized: val }
      })
      if (data.value) {
        data.value.advertized = val
      }
      toast.add({
        title: val
          ? 'Vraag iemand anders ingeschakeld'
          : 'Vraag iemand anders uitgeschakeld',
        color: 'success'
      })
    } catch {
      advertizedLocal.value = previous
      toast.add({ title: 'Kon advertentie-status niet bijwerken', color: 'error' })
    } finally {
      advertizedUpdating.value = false
    }
  }

  const statusModalOpen = ref(false)
  const statusAction = ref<StatusAction>(null)
  const statusDate = ref('')
  const deviationReason = ref('')
  const notExecutedReason = ref('')
  const statusSubmitting = ref(false)

  function todayIso(): string {
    const now = new Date()
    const m = `${now.getMonth() + 1}`.padStart(2, '0')
    const d = `${now.getDate()}`.padStart(2, '0')
    return `${now.getFullYear()}-${m}-${d}`
  }

  function openStatusModal(): void {
    if (!visit.value || !canEditStatus.value) return
    // Default selection based on current status if possible, otherwise "executed"
    if (visit.value.status === 'executed') {
      statusAction.value = 'executed'
    } else if (visit.value.status === 'executed_with_deviation') {
      statusAction.value = 'executed_with_deviation'
    } else if (visit.value.status === 'not_executed') {
      statusAction.value = 'not_executed'
    } else {
      statusAction.value = 'executed'
    }
    statusDate.value = todayIso()
    deviationReason.value = ''
    notExecutedReason.value = ''
    statusModalOpen.value = true
  }

  function onStatusActionSelect(option: StatusActionOption | null | undefined): void {
    statusAction.value = option?.value ?? null
    statusDate.value = todayIso()
    deviationReason.value = ''
    notExecutedReason.value = ''
  }

  function onCancelStatus(): void {
    statusModalOpen.value = false
    statusAction.value = null
  }

  async function onSubmitStatus(): Promise<void> {
    if (!visit.value || !statusAction.value || !canEditStatus.value) return

    statusSubmitting.value = true
    try {
      if (statusAction.value === 'executed') {
        if (!statusDate.value) {
          toast.add({ title: 'Kies een datum van uitvoering', color: 'error' })
          statusSubmitting.value = false
          return
        }
        await $api(`/visits/${visit.value.id}/execute`, {
          method: 'POST',
          body: {
            execution_date: statusDate.value,
            comment: null
          }
        })
        toast.add({ title: 'Bezoek gemarkeerd als uitgevoerd', color: 'success' })
      } else if (statusAction.value === 'executed_with_deviation') {
        if (!statusDate.value || !deviationReason.value.trim()) {
          toast.add({
            title: 'Datum en omschrijving van de afwijking zijn verplicht',
            color: 'error'
          })
          statusSubmitting.value = false
          return
        }
        await $api(`/visits/${visit.value.id}/execute-deviation`, {
          method: 'POST',
          body: {
            execution_date: statusDate.value,
            reason: deviationReason.value,
            comment: null
          }
        })
        toast.add({
          title: 'Bezoek gemarkeerd als uitgevoerd (met afwijking)',
          color: 'success'
        })
      } else if (statusAction.value === 'not_executed') {
        if (!notExecutedReason.value.trim()) {
          toast.add({ title: 'Reden is verplicht', color: 'error' })
          statusSubmitting.value = false
          return
        }
        await $api(`/visits/${visit.value.id}/not-executed`, {
          method: 'POST',
          body: {
            date: todayIso(),
            reason: notExecutedReason.value
          }
        })
        toast.add({ title: 'Bezoek gemarkeerd als niet uitgevoerd', color: 'success' })
      }

      statusModalOpen.value = false
      statusAction.value = null
      await refresh()
    } catch {
      toast.add({ title: 'Kon status niet bijwerken', color: 'error' })
    } finally {
      statusSubmitting.value = false
    }
  }
</script>
