<template>
  <div>
    <div v-if="rows.length === 0" class="p-4 text-sm text-gray-500">
      Geen bezoeken in deze categorie.
    </div>

    <UTable
      v-else
      :data="rows"
      :columns="columns"
      :sorting="[{ id: 'execution_date', desc: true }]"
      :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
    >
      <template #expand-cell="{ row }">
        <UButton
          variant="outline"
          color="neutral"
          size="xs"
          :icon="row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus'"
          @click.stop="handleToggle(row)"
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

      <template #status-cell="{ row }">
        <UBadge
          :label="statusLabel(row.original.status)"
          :color="row.original.status === 'needs_action' || row.original.status === 'provisional' ? 'warning' : row.original.status === 'approved' ? 'success' : 'error'"
          :variant="row.original.status === 'needs_action' ? 'outline' : 'subtle'"
        />
      </template>

      <template #encountered_functions-cell="{ row }">
        <span class="inline-flex items-center">
          <UIcon
            v-if="row.original.functions.length > 0"
            name="i-lucide-check"
            class="text-green-600 size-4"
          />
          <UIcon
            v-else
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
              <div>{{ durationHours(row.original.duration) ?? '-' }} uur</div>
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
                  Project folder
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

          <div class="border-t pt-3 space-y-4">
            <h4 class="text-xs font-semibold text-gray-700">Auditformulier</h4>

            <!-- Gemaakte fouten -->
            <div class="space-y-3">
              <div class="text-[11px] font-medium text-gray-600">Gemaakte fouten</div>

              <div
                v-for="(entry, idx) in auditForm(row.original.id).errors"
                :key="idx"
                class="border rounded p-3 space-y-2 text-xs bg-gray-50 dark:bg-gray-900 max-w-6xl"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] mb-1">Gemaakte fout</label>
                    <USelectMenu
                      :model-value="entry.code ?? undefined"
                      :items="errorOptions"
                      value-key="value"
                      placeholder="Kies een fout"
                      class="w-full"
                      @update:model-value="(val: AuditErrorCode) =>
                        updateError(row.original.id, idx, { code: val })"
                    />
                  </div>

                  <div>
                    <label class="block text-[11px] mb-1">Actie uitgezet</label>
                    <USelectMenu
                      :model-value="entry.action ?? undefined"
                      :items="actionOptions"
                      value-key="value"
                      class="w-full"
                      @update:model-value="(val: AuditAction | undefined) =>
                        updateError(row.original.id, idx, { action: val })"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <UCheckbox
                    :model-value="entry.fixed"
                    label="Fout hersteld"
                    @update:model-value="(val: boolean | 'indeterminate') =>
                      updateError(row.original.id, idx, { fixed: val === true })"
                  />
                </div>

                <div>
                  <label class="block text-[11px] mb-1">Opmerking</label>
                  <UTextarea
                    :model-value="entry.remarks"
                    class="w-full"
                    :rows="2"
                    @update:model-value="(val: string) =>
                      updateError(row.original.id, idx, { remarks: val })"
                  />
                </div>

                <div class="flex justify-end">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    @click="removeError(row.original.id, idx)"
                  >
                    Verwijder fout
                  </UButton>
                </div>
              </div>

              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                @click="addError(row.original.id)"
              >
                Fout toevoegen
              </UButton>
            </div>

            <!-- Soortgroepen -->
            <div class="space-y-2">
              <div class="text-[11px] font-medium text-gray-600">Soortgroepen</div>

              <div
                v-for="group in auditForm(row.original.id).speciesGroups"
                :key="group.key"
                class="border rounded p-3 space-y-2 text-xs bg-gray-50 dark:bg-gray-900 max-w-5xl"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-[11px]">{{ SPECIES_DEFS[group.key]!.label }}</span>
                  <UButton
                    v-if="!FIXED_SPECIES.includes(group.key)"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    @click="removeSpeciesGroup(row.original.id, group.key)"
                  />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] mb-1">Functies</label>
                    <USelectMenu
                      :model-value="group.functions"
                      :items="SPECIES_DEFS[group.key]!.functions"
                      value-key="value"
                      multiple
                      class="w-full"
                      @update:model-value="(val: string[]) =>
                        updateSpeciesGroup(row.original.id, group.key, { functions: val })"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] mb-1">Opmerking</label>
                    <UInput
                      :model-value="group.remarks"
                      class="w-full"
                      @update:model-value="(val: string) =>
                        updateSpeciesGroup(row.original.id, group.key, { remarks: val })"
                    />
                  </div>
                </div>
              </div>

              <USelectMenu
                v-if="availableOptionalSpeciesFor(row.original.id).length > 0"
                :model-value="undefined"
                :items="availableOptionalSpeciesFor(row.original.id)"
                value-key="value"
                placeholder="Soortgroep toevoegen"
                class="w-fit"
                @update:model-value="(val: string) => addSpeciesGroup(row.original.id, val)"
              />
            </div>

            <!-- Overige velden -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div class="md:col-span-2">
                <label class="block text-[11px] mb-1">Bijzonderheden buiten PG</label>
                <UTextarea
                  :model-value="auditForm(row.original.id).remarksOutsidePg"
                  class="w-full"
                  @update:model-value="(val: string) =>
                    updateAudit(row.original.id, { remarksOutsidePg: val })"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-[11px] mb-1">Opmerkingen</label>
                <UTextarea
                  :model-value="auditForm(row.original.id).remarks"
                  class="w-full"
                  @update:model-value="(val: string) =>
                    updateAudit(row.original.id, { remarks: val })"
                />
              </div>
            </div>

            <!-- Statusknopppen -->
            <div class="flex flex-wrap gap-2 pt-1">
              <UButton
                size="xs"
                color="success"
                :loading="submittingId === row.original.id && submittingStatus === 'approved'"
                @click="onSubmit(row.original.id, 'approved')"
              >
                Goedgekeurd
              </UButton>
              <UButton
                size="xs"
                color="warning"
                variant="outline"
                :loading="submittingId === row.original.id && submittingStatus === 'needs_action'"
                @click="onSubmit(row.original.id, 'needs_action')"
              >
                Actie nodig
              </UButton>
              <UButton
                size="xs"
                color="warning"
                :loading="submittingId === row.original.id && submittingStatus === 'provisional'"
                @click="onSubmit(row.original.id, 'provisional')"
              >
                Voorlopig afgekeurd
              </UButton>
              <UButton
                size="xs"
                color="error"
                :loading="submittingId === row.original.id && submittingStatus === 'rejected'"
                @click="onSubmit(row.original.id, 'rejected')"
              >
                Afgekeurd
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
  import type { TableColumn } from '#ui/types'
  import type { Row } from '@tanstack/vue-table'
  import type {
    VisitAuditRow,
    AuditStatus,
    AuditErrorCode,
    AuditAction,
    VisitAuditRecord,
    VisitStatusCode
  } from '~/types/audit'

  type AuditErrorEntry = {
    code: AuditErrorCode | null
    fixed: boolean
    action: AuditAction | null
    remarks: string
  }

  type SpeciesGroupEntry = {
    key: string
    functions: string[]
    remarks: string
  }

  type AuditFormState = {
    errors: AuditErrorEntry[]
    speciesGroups: SpeciesGroupEntry[]
    remarksOutsidePg: string
    remarks: string
  }

  type AuditFormPatch = Partial<Omit<AuditFormState, 'errors' | 'speciesGroups'>>
  type ErrorOption = { label: string; value: AuditErrorCode }
  type ActionOption = { label: string; value: AuditAction }
  type SpeciesDef = { label: string; functions: { label: string; value: string }[] }

  const props = defineProps<{
    rows: VisitAuditRow[]
    mode: 'to_check' | 'actions'
  }>()

  const emit = defineEmits<{
    submitted: []
  }>()

  const baseColumns: TableColumn<VisitAuditRow>[] = [
    { id: 'expand', header: '', enableSorting: false, cell: 'expand' },
    { id: 'pcb', header: 'PCB' },
    { id: 'researchers', header: 'Onderzoekers' },
    { id: 'start_time', header: 'Starttijd' },
    { id: 'duration', header: 'Duur' },
    { id: 'weather', header: 'Weercondities' },
    { id: 'period', header: 'Periode' },
    { id: 'execution_date', accessorKey: 'execution_date', header: 'Uitvoerdatum' }
  ]

  const columns = computed<TableColumn<VisitAuditRow>[]>(() => {
    if (props.mode === 'actions') {
      return [
        ...baseColumns,
        { id: 'status', header: 'Status' },
        { id: 'species', header: 'Soorten' },
        { id: 'functions', header: 'Functies' },
        { id: 'encountered_functions', header: 'Aangetroffen functies' }
      ]
    }
    return [
      ...baseColumns,
      { id: 'deviation', header: 'Geen afwijking' },
      { id: 'species', header: 'Soorten' },
      { id: 'functions', header: 'Functies' }
    ]
  })

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
    { label: 'Omgevingsfoto\'s niet geüpload', value: 'environmental_photos_not_uploaded' },
    { label: 'Geen beschrijving bij foto\'s', value: 'no_photo_descriptions' },
    { label: 'Samenvatting komt niet overeen met waarnemingen', value: 'summary_mismatch' },
    { label: 'Waarneming onduidelijk', value: 'observation_unclear' },
    { label: 'Bezoeknummer onjuist', value: 'visit_number_incorrect' },
    { label: 'Overig, zie opmerkingen', value: 'other' }
  ]

  const actionOptions: ActionOption[] = [
    { label: 'PL gemaild', value: 'pl_emailed' },
    { label: 'PL geappt', value: 'pl_messaged' },
    { label: 'PL gebeld', value: 'pl_called' },
    { label: 'Onderzoeker gemaild', value: 'researcher_emailed' },
    { label: 'Onderzoeker geappt', value: 'researcher_messaged' },
    { label: 'Onderzoeker gebeld', value: 'researcher_called' }
  ]

  const SPECIES_DEFS: Record<string, SpeciesDef> = {
    huismus: {
      label: 'Huismus',
      functions: [
        { label: 'Nestplaats', value: 'nestplaats' },
        { label: 'Functioneel leefgebied', value: 'functioneel_leefgebied' }
      ]
    },
    vleermuizen: {
      label: 'Vleermuizen',
      functions: [
        { label: 'Zomerverblijfplaats', value: 'zomerverblijfplaats' },
        { label: 'Kraamverblijfplaats', value: 'kraamverblijfplaats' },
        { label: 'Satellietverblijfplaats', value: 'satellietverblijfplaats' },
        { label: 'Massawinterverblijfplaats', value: 'massawinterverblijfplaats' },
        { label: 'Paarverblijfplaats', value: 'paarverblijfplaats' },
        { label: 'Vliegroute', value: 'vliegroute' },
        { label: 'Foerageergebied', value: 'foerageergebied' }
      ]
    },
    gierzwaluw: {
      label: 'Gierzwaluw',
      functions: [{ label: 'Nestplaats', value: 'nestplaats' }]
    },
    roofvogels: {
      label: 'Roofvogels',
      functions: [
        { label: 'Nestplaats', value: 'nestplaats' },
        { label: 'Foerageergebied', value: 'foerageergebied' }
      ]
    },
    amfibieen: {
      label: 'Amfibieën',
      functions: [
        { label: 'Voortplantingsplaats', value: 'voortplantingsplaats' },
        { label: 'Rustplaats', value: 'rustplaats' },
        { label: 'Ter plaatse', value: 'ter_plaatse' }
      ]
    },
    vlinders: {
      label: 'Vlinders',
      functions: [{ label: 'Aangetroffen', value: 'aangetroffen' }]
    },
    planten: {
      label: 'Planten',
      functions: [{ label: 'Groeiplaats', value: 'groeiplaats' }]
    },
    vogels: {
      label: 'Vogels',
      functions: [{ label: 'Nestplaats', value: 'nestplaats' }]
    },
    zoogdieren: {
      label: 'Zoogdieren',
      functions: [
        { label: 'Verblijfplaats', value: 'verblijfplaats' },
        { label: 'Leefgebied', value: 'leefgebied' }
      ]
    }
  }

  const FIXED_SPECIES = ['huismus', 'vleermuizen', 'gierzwaluw']
  const OPTIONAL_SPECIES = ['roofvogels', 'amfibieen', 'vlinders', 'planten', 'vogels', 'zoogdieren']

  const { $api } = useNuxtApp()
  const toast = useToast()

  // --- Audit form state ---

  const auditState = ref<Record<number, AuditFormState>>({})
  const auditLoaded = ref<Set<number>>(new Set())

  function emptyForm(): AuditFormState {
    return {
      errors: [],
      speciesGroups: FIXED_SPECIES.map((key) => ({ key, functions: [], remarks: '' })),
      remarksOutsidePg: '',
      remarks: ''
    }
  }

  function ensureAudit(id: number): AuditFormState {
    if (!auditState.value[id]) {
      auditState.value[id] = emptyForm()
    }
    return auditState.value[id]
  }

  function auditForm(id: number): AuditFormState {
    return ensureAudit(id)
  }

  function speciesGroupFromRecord(
    key: string,
    entry: { functions: Record<string, boolean>; remarks: string | null } | undefined
  ): SpeciesGroupEntry {
    return {
      key,
      functions: entry ? Object.entries(entry.functions).filter(([, v]) => v).map(([k]) => k) : [],
      remarks: entry?.remarks ?? ''
    }
  }

  function auditFromRecord(record: VisitAuditRecord): AuditFormState {
    const sf = record.species_functions ?? {}
    const speciesGroups: SpeciesGroupEntry[] = [
      ...FIXED_SPECIES.map((key) => speciesGroupFromRecord(key, sf[key])),
      ...OPTIONAL_SPECIES.filter((key) => sf[key]).map((key) => speciesGroupFromRecord(key, sf[key]))
    ]
    return {
      errors: record.errors.map((e) => ({
        code: e.code as AuditErrorCode | null,
        fixed: e.fixed,
        action: (e.action as AuditAction | null) ?? null,
        remarks: e.remarks ?? ''
      })),
      speciesGroups,
      remarksOutsidePg: record.remarks_outside_pg ?? '',
      remarks: record.remarks ?? ''
    }
  }

  async function loadAudit(id: number): Promise<void> {
    if (auditLoaded.value.has(id)) return
    try {
      const record = await $api<VisitAuditRecord>(`/visits/${id}/audit`)
      auditState.value[id] = auditFromRecord(record)
    } catch {
      ensureAudit(id)
    }
    auditLoaded.value.add(id)
  }

  async function handleToggle(row: Row<VisitAuditRow>): Promise<void> {
    const expanding = !row.getIsExpanded()
    row.toggleExpanded()
    if (expanding) {
      await loadAudit(row.original.id)
    }
  }

  function updateAudit(id: number, patch: AuditFormPatch): void {
    const current = ensureAudit(id)
    auditState.value[id] = { ...current, ...patch }
  }

  function addError(id: number): void {
    const form = ensureAudit(id)
    auditState.value[id] = {
      ...form,
      errors: [...form.errors, { code: null, fixed: false, action: null, remarks: '' }]
    }
  }

  function removeError(id: number, idx: number): void {
    const form = ensureAudit(id)
    auditState.value[id] = { ...form, errors: form.errors.filter((_, i) => i !== idx) }
  }

  function updateError(id: number, idx: number, patch: Partial<AuditErrorEntry>): void {
    const form = ensureAudit(id)
    const updated = form.errors.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    auditState.value[id] = { ...form, errors: updated }
  }

  function addSpeciesGroup(id: number, key: string): void {
    const form = ensureAudit(id)
    const def = SPECIES_DEFS[key]!
    const autoFunctions = def.functions.length === 1 ? [def.functions[0]!.value] : []
    auditState.value[id] = {
      ...form,
      speciesGroups: [...form.speciesGroups, { key, functions: autoFunctions, remarks: '' }]
    }
  }

  function removeSpeciesGroup(id: number, key: string): void {
    const form = ensureAudit(id)
    auditState.value[id] = {
      ...form,
      speciesGroups: form.speciesGroups.filter((g) => g.key !== key)
    }
  }

  function updateSpeciesGroup(id: number, key: string, patch: Partial<Omit<SpeciesGroupEntry, 'key'>>): void {
    const form = ensureAudit(id)
    auditState.value[id] = {
      ...form,
      speciesGroups: form.speciesGroups.map((g) => (g.key === key ? { ...g, ...patch } : g))
    }
  }

  function availableOptionalSpeciesFor(id: number): { label: string; value: string }[] {
    const existing = new Set(auditForm(id).speciesGroups.map((g) => g.key))
    return OPTIONAL_SPECIES.filter((k) => !existing.has(k)).map((k) => ({ label: SPECIES_DEFS[k]!.label, value: k }))
  }

  // --- Helpers ---

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
      missed: 'Gemist',
      needs_action: 'Actie nodig',
      provisional: 'Voorlopig afgekeurd'
    }
    return map[code]
  }

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function durationHours(minutes: number | null | undefined): number | null {
    if (minutes == null) return null
    return Math.round((minutes / 60) * 10) / 10
  }

  function pcbLabel(row: VisitAuditRow): string {
    const parts = [row.project_code, row.cluster_number]
    if (row.visit_nr != null) parts.push(String(row.visit_nr))
    return parts.join('-')
  }

  // --- Submit ---

  const submittingId = ref<number | null>(null)
  const submittingStatus = ref<AuditStatus | null>(null)

  const statusToastLabel: Record<AuditStatus, string> = {
    approved: 'Bezoek goedgekeurd',
    needs_action: 'Actie nodig opgeslagen',
    provisional: 'Voorlopig afgekeurd opgeslagen',
    rejected: 'Bezoek afgekeurd'
  }

  const statusToastColor: Record<AuditStatus, 'success' | 'warning' | 'error'> = {
    approved: 'success',
    needs_action: 'warning',
    provisional: 'warning',
    rejected: 'error'
  }

  function toNullable(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  async function onSubmit(id: number, auditStatus: AuditStatus): Promise<void> {
    const form = auditForm(id)
    submittingId.value = id
    submittingStatus.value = auditStatus

    const speciesFunctions: Record<string, { functions: Record<string, boolean>; remarks: string | null }> = {}
    for (const group of form.speciesGroups) {
      const def = SPECIES_DEFS[group.key]
      if (!def) continue
      const functionsMap: Record<string, boolean> = {}
      for (const f of def.functions) {
        functionsMap[f.value] = group.functions.includes(f.value)
      }
      speciesFunctions[group.key] = { functions: functionsMap, remarks: toNullable(group.remarks) }
    }

    try {
      await $api(`/visits/${id}/audit`, {
        method: 'PUT',
        body: {
          status: auditStatus,
          errors: form.errors.map((e) => ({
            code: e.code,
            fixed: e.fixed,
            action: e.action,
            remarks: toNullable(e.remarks)
          })),
          species_functions: speciesFunctions,
          remarks: toNullable(form.remarks),
          remarks_outside_pg: toNullable(form.remarksOutsidePg)
        }
      })

      toast.add({ title: statusToastLabel[auditStatus], color: statusToastColor[auditStatus] })
      await refreshNuxtData(`visit-activity-${id}`)
      emit('submitted')
    } catch {
      toast.add({ title: 'Opslaan mislukt', color: 'error' })
    } finally {
      submittingId.value = null
      submittingStatus.value = null
    }
  }
</script>
