<template>
  <div>
    <UPageHeader title="Controle" />

    <UCard class="mt-6">
      <div v-if="pending" class="p-4 text-sm text-gray-500">Bezoeken worden geladen</div>
      <div v-else-if="error" class="p-4 text-sm text-red-500">Kon bezoeken niet laden.</div>
      <div v-else-if="rows.length === 0" class="p-4 text-sm text-gray-500">
        Geen uitgevoerde bezoeken om te controleren.
      </div>

      <div v-else>
        <UTable
          :data="rows"
          :columns="columns"
          :loading="pending"
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
        >
          <template #expand-cell="{ row }">
            <UButton
              variant="outline"
              color="neutral"
              size="xs"
              :icon="row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus'"
              @click.stop="row.toggleExpanded()"
            />
          </template>

          <template #pcb-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ pcbLabel(row.original) }}
            </span>
          </template>

          <template #researchers-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{
                row.original.researchers
                  .map((r) => r.full_name || `Gebruiker #${r.id}`)
                  .join(', ')
              }}
            </span>
          </template>

          <template #start_time-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ row.original.start_time_text || '-' }}
            </span>
          </template>

          <template #duration-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ durationHours(row.original.duration) ?? '-' }} uur
            </span>
          </template>

          <template #weather-cell="{ row }">
            <span class="text-[11px] text-gray-700 dark:text-gray-200">
              Min {{ row.original.min_temperature_celsius ?? '-' }},
              max wind {{ row.original.max_wind_force_bft ?? '-' }}, max neerslag
              {{ row.original.max_precipitation || '-' }}
            </span>
          </template>

          <template #period-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ formatDate(row.original.from_date) }}
              {{ formatDate(row.original.to_date) }}
            </span>
          </template>

          <template #execution_date-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ formatDate(row.original.execution_date) }}
            </span>
          </template>

          <template #deviation-cell="{ row }">
            <span class="inline-flex items-center">
              <UIcon
                v-if="row.original.status === 'executed'"
                name="i-lucide-check"
                class="text-green-600 size-4"
              />
              <UIcon
                v-else-if="row.original.status === 'executed_with_deviation'"
                name="i-lucide-x"
                class="text-red-500 size-4"
              />
            </span>
          </template>

          <template #species-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ row.original.species.map((s) => s.abbreviation || s.name).join(', ') }}
            </span>
          </template>

          <template #functions-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ row.original.functions.map((f) => f.name).join(', ') }}
            </span>
          </template>

          <template #expanded="{ row }">
            <div class="px-3 pb-3 space-y-4">
              <div class="text-xs text-gray-500">
                Project {{ row.original.project_code }} Cluster
                {{ row.original.cluster_number }}
                {{ row.original.cluster_address }}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div class="font-medium mb-1">Periode</div>
                  <div>
                    {{ formatDate(row.original.from_date) }}
                    {{ formatDate(row.original.to_date) }}
                  </div>
                </div>
                <div>
                  <div class="font-medium mb-1">Duur</div>
                  <div>
                    {{ durationHours(row.original.duration) ?? '-' }} uur
                  </div>
                </div>
                <div>
                  <div class="font-medium mb-1">Weercondities</div>
                  <div>
                    Min {{ row.original.min_temperature_celsius ?? '-' }},
                    max wind {{ row.original.max_wind_force_bft ?? '-' }}, max neerslag
                    {{ row.original.max_precipitation || '-' }}
                  </div>
                  <div v-if="row.original.project_google_drive_folder" class="mt-2">
                    <a
                      :href="row.original.project_google_drive_folder"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-primary-600 underline"
                    >
                      Project Google drive
                    </a>
                  </div>
                </div>
                <div>
                  <div class="font-medium mb-1">Status</div>
                  <UBadge
                    :label="statusLabel(row.original.status)"
                    variant="subtle"
                    color="neutral"
                    class="text-gray-600 dark:text-gray-200"
                  />
                </div>
              </div>

              <VisitActivityLog :visit-id="row.original.id" />

              <div class="border-t pt-3">
                <h4 class="text-xs font-semibold text-gray-700 mb-2">Auditformulier</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label class="block text-[11px] mb-1">Gemaakte fout</label>
                    <USelectMenu
                      :model-value="auditForm(row.original.id).errors"
                      :items="errorOptions"
                      multiple
                      class="w-sm"
                      value-key="value"
                      @update:model-value="(vals: AuditErrorCode[]) =>
                        updateAudit(row.original.id, { errors: vals })"
                    />
                  </div>

                  <div>
                    <label class="block text-[12px] mb-1">Opmerking fouten</label>
                    <UTextarea
                      :model-value="auditForm(row.original.id).errorsComment"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { errorsComment: val })"
                    />
                  </div>

                  <div>
                    <UCheckbox
                      :model-value="auditForm(row.original.id).errorsFixed"
                      label="Fouten hersteld"
                      @update:model-value="val =>
                        updateAudit(row.original.id, { errorsFixed: val === true })"
                    />
                  </div>

                  <div />

                  <div>
                    <label class="block text-[11px] mb-1">PG: HM-functie</label>
                    <UInput
                      :model-value="auditForm(row.original.id).pgHmFunction"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { pgHmFunction: val })"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] mb-1">PG: VM-functie</label>
                    <UInput
                      :model-value="auditForm(row.original.id).pgVmFunction"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { pgVmFunction: val })"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] mb-1">PG: GZ-functie</label>
                    <UInput
                      :model-value="auditForm(row.original.id).pgGzFunction"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { pgGzFunction: val })"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] mb-1">PG: andere soort</label>
                    <UInput
                      :model-value="auditForm(row.original.id).pgOtherSpecies"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { pgOtherSpecies: val })"
                    />
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-[11px] mb-1">Bijzonderheden buiten PG</label>
                    <UTextarea
                      :model-value="auditForm(row.original.id).remarksOutsidePg"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { remarksOutsidePg: val })"
                    />
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-[11px] mb-1">Opmerkingen</label>
                    <UTextarea
                      :model-value="auditForm(row.original.id).remarks"
                      class="w-md"
                      @update:model-value="(val: string) =>
                        updateAudit(row.original.id, { remarks: val })"
                    />
                  </div>
                </div>

                <div class="my-4 flex gap-2">
                  <UButton
                    size="xs"
                    color="success"
                    :loading="submittingId === row.original.id && submittingAction === 'approve'"
                    @click="onApprove(row.original.id)"
                  >
                    Goedgekeurd
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    :loading="submittingId === row.original.id && submittingAction === 'reject'"
                    @click="onReject(row.original.id)"
                  >
                    Afgekeurd
                  </UButton>
                </div>
              </div>

            </div>
          </template>
        </UTable>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import type { TableColumn } from '#ui/types'

  definePageMeta({ middleware: 'admin' })

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

  type VisitAuditRow = {
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
    execution_date: string | null
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

  type AuditErrorCode =
    | 'visit_not_uploaded'
    | 'visit_started_too_late'
    | 'visit_stopped_too_early'
    | 'no_encounter_photo'
    | 'no_recordings'
    | 'no_visit_summary'
    | 'forgot_initials'
    | 'outside_date_window'
    | 'tracks_not_uploaded'
    | 'wrong_cluster'
    | 'weather_not_according_to_protocol'
    | 'other'

  type AuditFormState = {
    errors: AuditErrorCode[]
    errorsComment: string
    errorsFixed: boolean
    pgHmFunction: string
    pgVmFunction: string
    pgGzFunction: string
    pgOtherSpecies: string
    remarksOutsidePg: string
    remarks: string
  }

  type AuditFormPatch = Partial<AuditFormState>

  type ErrorOption = { label: string; value: AuditErrorCode }

  const errorOptions: ErrorOption[] = [
    { label: 'Bezoek niet geüpload', value: 'visit_not_uploaded' },
    { label: 'Bezoek te laat begonnen', value: 'visit_started_too_late' },
    { label: 'Bezoek te vroeg gestopt', value: 'visit_stopped_too_early' },
    { label: 'Geen foto geüpload van aangetroffen verblijfplaats/nest', value: 'no_encounter_photo' },
    { label: 'Geen opnamen geüpload', value: 'no_recordings' },
    { label: 'Geen samenvatting bezoek', value: 'no_visit_summary' },
    { label: 'Initialen vergeten', value: 'forgot_initials' },
    { label: 'Niet binnen datumgrenzen', value: 'outside_date_window' },
    { label: 'Tracks niet geüpload', value: 'tracks_not_uploaded' },
    { label: 'Verkeerde cluster onderzocht', value: 'wrong_cluster' },
    { label: 'Weer voldeed niet aan protocol', value: 'weather_not_according_to_protocol' },
    { label: 'Overig, zie opmerkingen', value: 'other' }
  ]

  const { $api } = useNuxtApp()
  const toast = useToast()

  const { data, pending, error, refresh } = useAsyncData(
    'audit-visits',
    () => $api<VisitAuditRow[]>('/visits/audit/list'),
    { default: () => [] }
  )

  const rows = computed(() => data.value ?? [])

  const columns: TableColumn<VisitAuditRow>[] = [
    { id: 'expand', header: '', enableSorting: false, cell: 'expand' },
    { id: 'pcb', header: 'PCB' },
    { id: 'researchers', header: 'Onderzoekers' },
    { id: 'start_time', header: 'Starttijd' },
    { id: 'duration', header: 'Duur' },
    { id: 'weather', header: 'Weercondities' },
    { id: 'period', header: 'Periode' },
    { id: 'execution_date', header: 'Uitvoerdatum' },
    { id: 'deviation', header: 'Geen afwijking' },
    { id: 'species', header: 'Soorten' },
    { id: 'functions', header: 'Functies' }
  ]

  function statusLabel(code: VisitStatusCode): string {
    const map: Record<VisitStatusCode, string> = {
      created: 'Aangemaakt',
      open: 'Open',
      planned: 'Gepland',
      overdue: 'Verlopen',
      executed: 'Uitgevoerd',
      executed_with_deviation: 'Uitgevoerd (afwijking)',
      not_executed: 'Niet uitgevoerd',
      approved: 'Goedgekeurd',
      rejected: 'Afgekeurd',
      cancelled: 'Geannuleerd',
      missed: 'Gemist'
    }
    return map[code]
  }

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    }).format(dt)
  }

  function durationHours(minutes: number | null | undefined): number | null {
    if (minutes == null) return null
    return Math.round((minutes / 60) * 10) / 10
  }

  function pcbLabel(row: VisitAuditRow): string {
    const parts = [row.project_code, String(row.cluster_number)]
    if (row.visit_nr != null) parts.push(String(row.visit_nr))
    return parts.join('-')
  }

  const auditState = ref<Record<number, AuditFormState>>({})

  function ensureAudit(id: number): AuditFormState {
    if (!auditState.value[id]) {
      auditState.value[id] = {
        errors: [],
        errorsComment: '',
        errorsFixed: false,
        pgHmFunction: '',
        pgVmFunction: '',
        pgGzFunction: '',
        pgOtherSpecies: '',
        remarksOutsidePg: '',
        remarks: ''
      }
    }
    return auditState.value[id]
  }

  function auditForm(id: number): AuditFormState {
    return ensureAudit(id)
  }

  function updateAudit(id: number, patch: AuditFormPatch): void {
    const current = ensureAudit(id)
    auditState.value[id] = { ...current, ...patch }
  }

  function toNullable(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  const submittingId = ref<number | null>(null)
  const submittingAction = ref<'approve' | 'reject' | null>(null)

  async function onApprove(id: number): Promise<void> {
    const form = auditForm(id)
    submittingId.value = id
    submittingAction.value = 'approve'
    try {
      const auditPayload = {
        errors: form.errors,
        errors_comment: toNullable(form.errorsComment),
        errors_fixed: form.errorsFixed,
        pg_hm_function: toNullable(form.pgHmFunction),
        pg_vm_function: toNullable(form.pgVmFunction),
        pg_gz_function: toNullable(form.pgGzFunction),
        pg_other_species: toNullable(form.pgOtherSpecies),
        remarks_outside_pg: toNullable(form.remarksOutsidePg),
        remarks: toNullable(form.remarks)
      }

      await $api(`/visits/${id}/approve`, {
        method: 'POST',
        body: {
          comment: form.remarks || 'Goedgekeurd',
          audit: auditPayload
        }
      })

      toast.add({ title: 'Bezoek goedgekeurd', color: 'success' })
      await refreshNuxtData(`visit-activity-${id}`)
      await refresh()
    } catch {
      toast.add({ title: 'Kon bezoek niet goedkeuren', color: 'error' })
    } finally {
      submittingId.value = null
      submittingAction.value = null
    }
  }

  async function onReject(id: number): Promise<void> {
    const form = auditForm(id)
    submittingId.value = id
    submittingAction.value = 'reject'
    try {
      const auditPayload = {
        errors: form.errors,
        errors_comment: toNullable(form.errorsComment),
        errors_fixed: form.errorsFixed,
        pg_hm_function: toNullable(form.pgHmFunction),
        pg_vm_function: toNullable(form.pgVmFunction),
        pg_gz_function: toNullable(form.pgGzFunction),
        pg_other_species: toNullable(form.pgOtherSpecies),
        remarks_outside_pg: toNullable(form.remarksOutsidePg),
        remarks: toNullable(form.remarks)
      }

      const reason = form.errorsComment || form.remarks || 'Afgekeurd'

      await $api(`/visits/${id}/reject`, {
        method: 'POST',
        body: {
          reason,
          audit: auditPayload
        }
      })

      toast.add({ title: 'Bezoek afgekeurd', color: 'success' })
      await refreshNuxtData(`visit-activity-${id}`)
      await refresh()
    } catch {
      toast.add({ title: 'Kon bezoek niet afkeuren', color: 'error' })
    } finally {
      submittingId.value = null
      submittingAction.value = null
    }
  }
</script>
