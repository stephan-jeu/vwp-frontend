<template>
  <div class="mt-3 border-t pt-3">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-xs font-semibold text-gray-600">Activiteit</h4>
      <UButton
        v-if="!pending && !error && entries.length > 0"
        size="xs"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        @click="refresh()"
      />
    </div>

    <div v-if="pending" class="text-xs text-gray-500">Activiteit wordt geladen…</div>
    <div v-else-if="error" class="text-xs text-red-500">Kon activiteit niet laden.</div>
    <div v-else-if="entries.length === 0" class="text-xs text-gray-500">Geen activiteit.</div>

    <ul v-else class="space-y-1 text-xs">
      <li v-for="item in entries" :key="item.id" class="flex gap-2">
        <div class="text-[10px] text-gray-500 w-24 shrink-0">
          {{ formatDateTime(item.created_at) }}
        </div>
        <div class="flex-1">
          <div v-if="item.action !== 'visit_status_cleared'">
            <span class="font-medium">
              {{ item.actor?.full_name ?? 'Systeem' }}
            </span>
            <span class="ml-1">{{ actionLabel(item.action) }}</span>
          </div>
          <div v-else>
            {{ formatStatusClearedSentence(item) }}
          </div>
          <div v-if="item.details?.comment" class="text-gray-600">
            "{{ item.details.comment }}"
          </div>
          <div v-else-if="item.details?.reason" class="text-gray-600">
            {{ item.details.reason }}
          </div>
          <div
            v-if="item.action === 'visit_rejected' && hasAudit(item.details)"
            class="mt-1 space-y-1 text-[11px] text-gray-600"
          >
            <div v-if="auditErrors(item.details).length">
              <span class="font-medium">Gemaakte fout(en): </span>
              <span>
                {{ auditErrors(item.details).map((code) => errorLabel(code)).join(', ') }}
              </span>
            </div>
            <div v-if="auditString(item.details, 'errors_comment')">
              <span class="font-medium">Opmerking fouten: </span>
              <span>{{ auditString(item.details, 'errors_comment') }}</span>
            </div>
            <div v-if="auditString(item.details, 'pg_hm_function')">
              <span class="font-medium">PG: HM-functie: </span>
              <span>{{ auditString(item.details, 'pg_hm_function') }}</span>
            </div>
            <div v-if="auditString(item.details, 'pg_vm_function')">
              <span class="font-medium">PG: VM-functie: </span>
              <span>{{ auditString(item.details, 'pg_vm_function') }}</span>
            </div>
            <div v-if="auditString(item.details, 'pg_gz_function')">
              <span class="font-medium">PG: GZ-functie: </span>
              <span>{{ auditString(item.details, 'pg_gz_function') }}</span>
            </div>
            <div v-if="auditString(item.details, 'pg_other_species')">
              <span class="font-medium">PG: andere soort: </span>
              <span>{{ auditString(item.details, 'pg_other_species') }}</span>
            </div>
            <div v-if="auditString(item.details, 'remarks_outside_pg')">
              <span class="font-medium">Bijzonderheden buiten PG: </span>
              <span>{{ auditString(item.details, 'remarks_outside_pg') }}</span>
            </div>
            <div v-if="auditString(item.details, 'remarks')">
              <span class="font-medium">Opmerkingen: </span>
              <span>{{ auditString(item.details, 'remarks') }}</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{ visitId: number }>()

  type ActivityLogEntry = {
    id: number
    created_at: string
    actor_id: number | null
    action: string
    target_type: string
    target_id: number | null
    details: Record<string, unknown> | null
    batch_id: string | null
    actor: { id: number; full_name: string | null } | null
  }

  type ActivityDetails = Record<string, unknown> | null

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

  type AuditStringField =
    | 'errors_comment'
    | 'pg_hm_function'
    | 'pg_vm_function'
    | 'pg_gz_function'
    | 'pg_other_species'
    | 'remarks_outside_pg'
    | 'remarks'

  const statusLabelMap: Record<VisitStatusCode, string> = {
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

  const errorLabelMap: Record<AuditErrorCode, string> = {
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
    other: 'Overig, zie opmerkingen'
  }

  const { $api } = useNuxtApp()

  const { data, pending, error, refresh } = useAsyncData(
    `visit-activity-${props.visitId}`,
    () => $api<ActivityLogEntry[]>(`/visits/${props.visitId}/activity`),
    {
      watch: [() => props.visitId]
    }
  )

  const entries = computed(() => data.value ?? [])

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

  function actionLabel(action: string): string {
    switch (action) {
      case 'visit_executed':
        return 'heeft het bezoek uitgevoerd'
      case 'visit_executed_with_deviation':
        return 'heeft het bezoek uitgevoerd (met afwijking)'
      case 'visit_not_executed':
        return 'heeft het bezoek niet uitgevoerd'
      case 'visit_approved':
        return 'heeft het bezoek goedgekeurd'
      case 'visit_rejected':
        return 'heeft het bezoek afgekeurd'
      case 'visit_cancelled':
        return 'heeft het bezoek geannuleerd'
      case 'visit_advertised':
        return 'heeft dit bezoek aangeboden ter overname'
      case 'visit_advertised_cancelled':
        return 'heeft het aanbod tot overname ingetrokken'
      case 'visit_takeover_accepted':
        return 'heeft het bezoek overgenomen'
      default:
        return action
    }
  }

  function visitLabelFromDetails(details: ActivityDetails): string | null {
    if (!details) return null
    const projectCode = details['project_code'] as string | undefined
    const clusterNumber = details['cluster_number'] as number | undefined
    const visitNr = details['visit_nr'] as number | undefined
    if (!projectCode) return null
    const base = clusterNumber != null ? `${projectCode}-${clusterNumber}` : projectCode
    if (visitNr != null) return `${base} nr ${visitNr}`
    return base
  }

  function statusLabelFromCode(code: string | null | undefined): string | null {
    if (!code) return null
    return statusLabelMap[code as VisitStatusCode] ?? code
  }

  function formatStatusClearedSentence(entry: ActivityLogEntry): string {
    const details = entry.details as ActivityDetails
    const actor = entry.actor?.full_name ?? 'Systeem'
    const visitLabel = visitLabelFromDetails(details) ?? 'dit bezoek'
    const previousStatusRaw =
      (details && (details['previous_status'] as string | undefined)) ?? null
    const modeRaw = (details && (details['mode'] as string | undefined)) ?? null

    const previousLabel = statusLabelFromCode(previousStatusRaw)
    const newLabel = statusLabelFromCode(modeRaw)

    if (previousLabel && newLabel) {
      return `${actor} heeft de status van bezoek ${visitLabel} aangepast van ${previousLabel} naar ${newLabel}`
    }

    if (newLabel) {
      return `${actor} heeft de status van bezoek ${visitLabel} aangepast naar ${newLabel}`
    }

    return `${actor} heeft de status van een bezoek aangepast`
  }

  function getAudit(details: ActivityDetails): Record<string, unknown> | null {
    if (!details) return null
    const raw = (details as Record<string, unknown>)['audit']
    if (!raw || typeof raw !== 'object') return null
    return raw as Record<string, unknown>
  }

  function hasAudit(details: ActivityDetails): boolean {
    return getAudit(details) !== null
  }

  function auditErrors(details: ActivityDetails): string[] {
    const audit = getAudit(details)
    if (!audit) return []
    const raw = audit['errors']
    if (!Array.isArray(raw)) return []
    return raw.filter((value): value is string => typeof value === 'string')
  }

  function auditString(details: ActivityDetails, field: AuditStringField): string | null {
    const audit = getAudit(details)
    if (!audit) return null
    const value = audit[field]
    if (value == null) return null
    if (typeof value === 'string') return value
    return String(value)
  }

  function errorLabel(code: string): string {
    return errorLabelMap[code as AuditErrorCode] ?? code
  }
</script>
