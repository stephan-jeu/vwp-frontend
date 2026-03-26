<template>
  <div v-if="audit" class="mt-3 border-t pt-3">
    <h4 class="text-xs font-semibold text-gray-600 mb-2">Controle</h4>

    <div class="space-y-3 text-xs text-gray-700 dark:text-gray-300">
      <!-- Status -->
      <div class="flex items-center gap-2">
        <span class="font-medium">Status:</span>
        <UBadge :color="statusColor(audit.status)" variant="subtle">
          {{ statusLabel(audit.status) }}
        </UBadge>
      </div>

      <!-- Gemaakte fouten -->
      <div v-if="audit.errors.length > 0">
        <div class="font-medium mb-1">Gemaakte fouten</div>
        <ul class="space-y-2">
          <li
            v-for="(entry, idx) in audit.errors"
            :key="idx"
            class="border rounded p-2 space-y-1 bg-gray-50 dark:bg-gray-900"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ errorLabel(entry.code) }}</span>
              <UBadge v-if="entry.fixed" color="success" variant="subtle" size="sm">Hersteld</UBadge>
              <UBadge v-else color="warning" variant="subtle" size="sm">Niet hersteld</UBadge>
            </div>
            <div v-if="entry.action" class="text-gray-500">
              <span class="font-medium">Actie:</span> {{ actionLabel(entry.action) }}
            </div>
            <div v-if="entry.remarks" class="text-gray-500 whitespace-pre-line">
              <span class="font-medium">Opmerking:</span> {{ entry.remarks }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Soortgroepen -->
      <div v-if="speciesEntries.length > 0">
        <div class="font-medium mb-1">Soortgroepen</div>
        <ul class="space-y-2">
          <li
            v-for="entry in speciesEntries"
            :key="entry.key"
            class="border rounded p-2 space-y-1 bg-gray-50 dark:bg-gray-900"
          >
            <div class="font-medium">{{ speciesLabel(entry.key) }}</div>
            <div v-if="entry.functions.length > 0">
              <span class="font-medium">Functies:</span>
              {{ entry.functions.map((fn) => functionLabel(entry.key, fn)).join(', ') }}
            </div>
            <div v-if="entry.remarks" class="text-gray-500 whitespace-pre-line">
              <span class="font-medium">Opmerking:</span> {{ entry.remarks }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Bijzonderheden buiten PG -->
      <div v-if="audit.remarks_outside_pg">
        <span class="font-medium">Bijzonderheden buiten PG:</span>
        <p class="mt-0.5 whitespace-pre-line">{{ audit.remarks_outside_pg }}</p>
      </div>

      <!-- Opmerkingen -->
      <div v-if="audit.remarks">
        <span class="font-medium">Opmerkingen:</span>
        <p class="mt-0.5 whitespace-pre-line">{{ audit.remarks }}</p>
      </div>

      <!-- Metainfo -->
      <div class="text-[10px] text-gray-400 pt-1">
        Aangemaakt door {{ audit.created_by.full_name ?? 'Onbekend' }} op
        {{ formatDateTime(audit.created_at) }}
        <span v-if="audit.updated_by">
          · Bijgewerkt door {{ audit.updated_by.full_name ?? 'Onbekend' }} op
          {{ formatDateTime(audit.updated_at) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{ visitId: number }>()

  type AuditStatus = 'approved' | 'needs_action' | 'provisional' | 'rejected'

  type AuditErrorEntry = {
    code: string
    fixed: boolean
    action: string | null
    remarks: string | null
  }

  type SpeciesFunctionEntry = {
    functions: Record<string, boolean>
    remarks: string | null
  }

  type UserName = { id: number; full_name: string | null }

  type VisitAuditRead = {
    id: number
    visit_id: number
    status: AuditStatus
    errors: AuditErrorEntry[]
    species_functions: Record<string, SpeciesFunctionEntry> | null
    remarks: string | null
    remarks_outside_pg: string | null
    created_by: UserName
    updated_by: UserName | null
    created_at: string
    updated_at: string
  }

  const { $api } = useNuxtApp()

  const { data } = useAsyncData(
    `visit-audit-${props.visitId}`,
    () =>
      $api<VisitAuditRead>(`/visits/${props.visitId}/audit`).catch((err: unknown) => {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          return null
        }
        throw err
      }),
    { watch: [() => props.visitId] }
  )

  const audit = computed(() => data.value ?? null)

  type SpeciesEntry = { key: string; functions: string[]; remarks: string | null }

  const speciesEntries = computed<SpeciesEntry[]>(() => {
    const sf = audit.value?.species_functions
    if (!sf) return []
    return Object.entries(sf).map(([key, entry]) => ({
      key,
      functions: Object.entries(entry.functions)
        .filter(([, v]) => v)
        .map(([k]) => k),
      remarks: entry.remarks
    }))
  })

  type BadgeColor = 'success' | 'warning' | 'error' | 'neutral'

  function statusColor(status: AuditStatus): BadgeColor {
    switch (status) {
      case 'approved':
        return 'success'
      case 'needs_action':
      case 'provisional':
        return 'warning'
      case 'rejected':
        return 'error'
    }
  }

  function statusLabel(status: AuditStatus): string {
    switch (status) {
      case 'approved':
        return 'Goedgekeurd'
      case 'needs_action':
        return 'Actie nodig'
      case 'provisional':
        return 'Voorlopig afgekeurd'
      case 'rejected':
        return 'Afgekeurd'
    }
  }

  const ERROR_LABELS: Record<string, string> = {
    visit_not_uploaded: 'Bezoek niet geüpload',
    visit_started_too_late: 'Bezoek te laat begonnen',
    visit_stopped_too_early: 'Bezoek te vroeg gestopt',
    no_encounter_photo: 'Geen foto geüpload van aangetroffen verblijfplaats/nest',
    no_recordings: 'Geen opnamen geüpload',
    no_visit_summary: 'Geen samenvatting bezoek',
    forgot_initials: 'Initialen vergeten',
    outside_date_window: 'Niet binnen datumgrenzen',
    tracks_not_uploaded: 'Tracks niet geüpload',
    wrong_cluster: 'Verkeerde cluster onderzocht',
    weather_not_according_to_protocol: 'Weer voldeed niet aan protocol',
    environmental_photos_not_uploaded: "Omgevingsfoto's niet geüpload",
    no_photo_descriptions: "Geen beschrijving bij foto's",
    summary_mismatch: 'Samenvatting komt niet overeen met waarnemingen',
    observation_unclear: 'Waarneming onduidelijk',
    visit_number_incorrect: 'Bezoeknummer onjuist',
    other: 'Overig, zie opmerkingen'
  }

  const ACTION_LABELS: Record<string, string> = {
    pl_emailed: 'PL gemaild',
    pl_messaged: 'PL geappt',
    pl_called: 'PL gebeld',
    researcher_emailed: 'Onderzoeker gemaild',
    researcher_messaged: 'Onderzoeker geappt',
    researcher_called: 'Onderzoeker gebeld'
  }

  const SPECIES_LABELS: Record<string, string> = {
    huismus: 'Huismus',
    vleermuizen: 'Vleermuizen',
    gierzwaluw: 'Gierzwaluw',
    roofvogels: 'Roofvogels',
    amfibieen: 'Amfibieën',
    vlinders: 'Vlinders',
    planten: 'Planten',
    vogels: 'Vogels',
    zoogdieren: 'Zoogdieren'
  }

  const FUNCTION_LABELS: Record<string, Record<string, string>> = {
    huismus: { nestplaats: 'Nestplaats', functioneel_leefgebied: 'Functioneel leefgebied' },
    vleermuizen: {
      zomerverblijfplaats: 'Zomerverblijfplaats',
      kraamverblijfplaats: 'Kraamverblijfplaats',
      satellietverblijfplaats: 'Satellietverblijfplaats',
      massawinterverblijfplaats: 'Massawinterverblijfplaats',
      paarverblijfplaats: 'Paarverblijfplaats',
      vliegroute: 'Vliegroute',
      foerageergebied: 'Foerageergebied'
    },
    gierzwaluw: { nestplaats: 'Nestplaats' },
    roofvogels: { nestplaats: 'Nestplaats', foerageergebied: 'Foerageergebied' },
    amfibieen: {
      voortplantingsplaats: 'Voortplantingsplaats',
      rustplaats: 'Rustplaats',
      ter_plaatse: 'Ter plaatse'
    },
    vlinders: { aangetroffen: 'Aangetroffen' },
    planten: { groeiplaats: 'Groeiplaats' },
    vogels: { nestplaats: 'Nestplaats' },
    zoogdieren: { verblijfplaats: 'Verblijfplaats', leefgebied: 'Leefgebied' }
  }

  function errorLabel(code: string): string {
    return ERROR_LABELS[code] ?? code
  }

  function actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action
  }

  function speciesLabel(key: string): string {
    return SPECIES_LABELS[key] ?? key
  }

  function functionLabel(speciesKey: string, fn: string): string {
    return FUNCTION_LABELS[speciesKey]?.[fn] ?? fn
  }

  function formatDateTime(iso: string): string {
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
  }
</script>
