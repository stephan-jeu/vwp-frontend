export type VisitStatusCode =
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
  | 'needs_action'
  | 'provisional'

export type AuditStatus = 'approved' | 'needs_action' | 'provisional' | 'rejected'

export type AuditErrorCode =
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
  | 'environmental_photos_not_uploaded'
  | 'no_photo_descriptions'
  | 'summary_mismatch'
  | 'observation_unclear'
  | 'visit_number_incorrect'
  | 'other'

export type AuditAction =
  | 'pl_emailed'
  | 'pl_messaged'
  | 'pl_called'
  | 'researcher_emailed'
  | 'researcher_messaged'
  | 'researcher_called'

export type CompactFunction = { id: number; name: string }
export type CompactSpecies = { id: number; name: string; abbreviation?: string | null }
export type UserName = { id: number; full_name: string | null }

export type VisitAuditRow = {
  id: number
  project_code: string
  project_location: string
  project_google_drive_folder: string | null
  cluster_id: number
  cluster_number: string
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
  vog: boolean
  hub: boolean
  dvp: boolean
  sleutel: boolean
  remarks_planning: string | null
  remarks_field: string | null
  priority: boolean
  part_of_day: string | null
  start_time_text: string | null
  planning_locked: boolean
  researchers: UserName[]
  advertized: boolean
  quote: boolean
  visit_code: string | null
}

// Shape returned by GET /visits/{id}/audit
export type VisitAuditRecord = {
  id: number
  visit_id: number
  status: AuditStatus
  errors: { code: string; fixed: boolean; action: string | null; remarks: string | null }[]
  species_functions: Record<string, { functions: Record<string, boolean>; remarks: string | null }> | null
  remarks: string | null
  remarks_outside_pg: string | null
}
