<template>
  <div>
    <UPageHeader title="Planning" />
    <div>
      <UCard class="mt-4">
        <div class="flex flex-col gap-4">
          <!-- Controls Header -->
          <div class="mb-3">
            <div class="flex items-end gap-3 flex-wrap">
              <div class="min-w-[200px]">
                <label class="block mb-1 text-md text-gray-500">Selecteer week</label>
                <USelectMenu
                  v-model="selectedWeekTab"
                  :items="weekTabs"
                  option-attribute="label"
                  placeholder="Selecteer week"
                  class="w-full"
                />
              </div>

              <UButton
                icon="i-heroicons-sparkles"
                color="primary"
                variant="solid"
                :loading="loading"
                @click="runPlanning"
              >
                {{ generateLabel }}
              </UButton>

              <UButton
                v-if="plannedVisits.length > 0"
                icon="i-heroicons-trash"
                color="error"
                variant="soft"
                :loading="clearing"
                @click="clearResearchers"
              >
                {{ deleteLabel }}
              </UButton>

              <UButton
                v-if="plannedVisits.length > 0"
                icon="i-heroicons-envelope"
                color="primary"
                variant="soft"
                :loading="sendingEmails"
                @click="sendPlanningEmails"
              >
                Notificeer onderzoekers
              </UButton>
            </div>
          </div>

          <!-- Capacity Header (Always Visible) -->
          <div
            v-if="capacityData.researchers.length > 0"
            class="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
          >
            <!-- Capacity Collapsible (Same as before) -->
            <button
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              @click="availabilityCollapsed = !availabilityCollapsed"
            >
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-200">
                <span class="font-semibold text-gray-900 dark:text-white">Nog beschikbaar:</span>
                <span
                  >Avond
                  <span :class="{ 'text-red-600 font-bold': capacityData.totals.avond < 0 }">{{
                    capacityData.totals.avond
                  }}</span></span
                >
                <span
                  >Ochtend
                  <span :class="{ 'text-red-600 font-bold': capacityData.totals.ochtend < 0 }">{{
                    capacityData.totals.ochtend
                  }}</span></span
                >
                <span
                  >Dag
                  <span :class="{ 'text-red-600 font-bold': capacityData.totals.dag < 0 }">{{
                    capacityData.totals.dag
                  }}</span></span
                >
                <span v-if="!featureStrictAvailability"
                  >Flex
                  <span :class="{ 'text-red-600 font-bold': capacityData.totals.flex < 0 }">{{
                    capacityData.totals.flex
                  }}</span></span
                >
              </div>
              <UIcon
                :name="
                  availabilityCollapsed ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'
                "
                class="w-5 h-5 text-gray-500"
              />
            </button>

            <div
              v-if="!availabilityCollapsed"
              class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800"
            >
              <div
                v-for="r in capacityData.researchers"
                :key="r.id"
                class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100 min-w-[120px]">
                  {{ r.name }}
                </div>
                <div class="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div :class="{ 'text-red-600 font-bold': r.remaining.avond < 0 }">
                    Avond: {{ r.remaining.avond }}
                  </div>
                  <div :class="{ 'text-red-600 font-bold': r.remaining.ochtend < 0 }">
                    Ochtend: {{ r.remaining.ochtend }}
                  </div>
                  <div :class="{ 'text-red-600 font-bold': r.remaining.dag < 0 }">
                    Dag: {{ r.remaining.dag }}
                  </div>
                  <div v-if="!featureStrictAvailability" :class="{ 'text-red-600 font-bold': r.remaining.flex < 0 }">
                    Flex: {{ r.remaining.flex }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <UTabs :items="tabs" class="w-full">
            <template #status>
              <!-- STATUS TAB CONTENT (Existing Logic) -->
              <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Executed Column -->
                <div>
                  <h3 class="font-semibold text-sm mb-2">
                    Uitgevoerd ({{ completedVisits.length }})
                  </h3>
                  <div v-if="completedVisits.length === 0" class="text-xs text-gray-500">
                    Geen bezoeken.
                  </div>
                  <div v-else class="space-y-2">
                    <VisitPreviewCard
                      v-for="visit in completedVisits"
                      :key="visit.id"
                      :visit="visit"
                      selectable
                      :selected="selectedVisitIds.has(visit.id)"
                      @open="goToDetail(visit.id)"
                      @update:selected="toggleSelection(visit.id, $event)"
                    />
                  </div>
                </div>

                <!-- Planned Column -->
                <div>
                  <h3 class="font-semibold text-sm mb-2">Gepland ({{ plannedVisits.length }})</h3>
                  <div v-if="plannedVisits.length === 0" class="text-xs text-gray-500">
                    Geen geplande bezoeken.
                  </div>
                  <div v-else class="space-y-2">
                    <VisitPreviewCard
                      v-for="visit in plannedVisits"
                      :key="visit.id"
                      :visit="visit"
                      selectable
                      :selected="selectedVisitIds.has(visit.id)"
                      @open="goToDetail(visit.id)"
                      @update:selected="toggleSelection(visit.id, $event)"
                    />
                  </div>
                </div>
              </div>
            </template>

            <template #plan>
              <!-- PLAN TAB CONTENT (New) -->
              <div
                v-if="reserveVisits.length > 0"
                class="mb-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
              >
                <button
                  class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                  @click="reserveCollapsed = !reserveCollapsed"
                >
                  <div
                    class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <span class="font-semibold text-gray-900 dark:text-white">
                      Toon reserve bezoeken ({{ reserveVisits.length }})
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      Maximaal 30 weergegeven
                    </span>
                  </div>
                  <UIcon
                    :name="reserveCollapsed ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                    class="w-5 h-5 text-gray-500"
                  />
                </button>
                <div
                  v-if="!reserveCollapsed"
                  class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800"
                >
                  <div
                    v-if="reserveVisitsLimited.length === 0"
                    class="px-4 py-3 text-sm text-gray-500"
                  >
                    Geen reserve bezoeken beschikbaar.
                  </div>
                  <div v-else class="p-4 space-y-3">
                    <VisitPreviewCard
                      v-for="visit in reserveVisitsLimited"
                      :key="visit.id"
                      :visit="visit"
                      @open="goToDetail(visit.id)"
                    />
                    <div
                      v-if="reserveVisits.length > reserveVisitsLimited.length"
                      class="text-xs text-gray-500"
                    >
                      Eerste 30 bezoeken getoond.
                    </div>
                  </div>
                </div>
              </div>

              <UAlert
                v-if="overplanningMessages.length > 0"
                class="mb-4 mt-2"
                color="warning"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                title="Overplanning"
                :description="overplanningMessages.join(' | ')"
              />
              <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Left: Voorlopig / Proposed -->
                <div class="bg-gray-50/50 p-4 rounded-lg border border-gray-200">
                  <h3 class="font-bold text-gray-700 flex items-center justify-between mb-4">
                    <span>Voorlopig ({{ inboxVisits.length }})</span>
                    <UTooltip text="Voorgesteld door Seizoensplanner">
                      <UIcon name="i-heroicons-information-circle" class="text-gray-400" />
                    </UTooltip>
                  </h3>

                  <div class="space-y-3">
                    <div v-for="visit in inboxVisits" :key="visit.id" class="space-y-2">
                      <VisitPreviewCard
                        :visit="visit"
                        selectable
                        :selected="selectedVisitIds.has(visit.id)"
                        @open="goToDetail(visit.id)"
                        @update:selected="toggleSelection(visit.id, $event)"
                      />
                    </div>
                    <div
                      v-if="inboxVisits.length === 0"
                      class="text-center text-sm text-gray-400 italic py-8"
                    >
                      Geen voorgestelde bezoeken.
                    </div>
                  </div>
                </div>

                <!-- Right: Schedule / Locked -->
                <div class="bg-gray-50/50 p-4 rounded-lg border border-gray-200">
                  <h3 class="font-bold text-gray-700 flex items-center justify-between mb-4">
                    <span>Planning ({{ scheduleVisits.length }})</span>
                  </h3>

                  <div class="space-y-3">
                    <div v-for="visit in scheduleVisits" :key="visit.id" class="space-y-2">
                      <VisitPreviewCard
                        :visit="visit"
                        selectable
                        :selected="selectedVisitIds.has(visit.id)"
                        @open="goToDetail(visit.id)"
                        @update:selected="toggleSelection(visit.id, $event)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #researchers>
              <!-- RESEARCHERS TAB CONTENT -->
              <div class="mt-4 overflow-x-auto">
                <template v-if="featureDailyPlanning">
                  <!-- Daily Planning Grid: rows = researchers, columns = Mon-Fri -->
                  <table class="min-w-full border-collapse text-sm">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-700">
                        <th
                          class="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] sticky left-0 bg-white dark:bg-gray-900 z-10"
                        >
                          Onderzoeker
                        </th>
                        <th
                          v-for="day in weekDays"
                          :key="day.iso"
                          class="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 min-w-[160px] text-center border-l border-gray-100 dark:border-gray-800"
                        >
                          <div>{{ day.short }}</div>
                          <div class="text-xs font-normal text-gray-400">{{ day.dateStr }}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr
                        v-for="row in researcherGrid"
                        :key="row.id"
                        class="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td
                          class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-900 z-10"
                        >
                          {{ row.name }}
                        </td>
                        <td
                          v-for="day in weekDays"
                          :key="day.iso"
                          class="px-3 py-2 align-top border-l border-gray-100 dark:border-gray-800"
                        >
                          <div
                            v-for="visit in row.visitsByDay[day.iso] ?? []"
                            :key="visit.id"
                            class="mb-1 cursor-pointer text-xs rounded px-1.5 py-0.5 inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 whitespace-nowrap"
                            @click="goToDetail(visit.id)"
                          >
                            <span class="font-medium">{{ visit.project_code }}</span>
                            <span class="text-gray-500">{{ visit.cluster_number }}</span>
                            <span>{{
                              enableVisitCode
                                ? (visit.visit_code ?? '-')
                                : visitSpeciesAbbr(visit)
                            }}</span>
                            <UIcon
                              :name="visitStatusIcon(visit.status)"
                              :class="visitStatusIconColor(visit.status)"
                              class="w-3.5 h-3.5 flex-shrink-0"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div
                    v-if="researcherGrid.length === 0"
                    class="text-sm text-gray-400 italic py-4"
                  >
                    Geen onderzoekers gevonden.
                  </div>
                </template>

                <template v-else>
                  <!-- Condensed List: rows = researchers, one cell with all visits -->
                  <table class="min-w-full border-collapse text-sm">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-700">
                        <th
                          class="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]"
                        >
                          Onderzoeker
                        </th>
                        <th
                          class="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300"
                        >
                          Bezoeken
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr
                        v-for="row in researcherGrid"
                        :key="row.id"
                        class="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td
                          class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap align-top"
                        >
                          {{ row.name }}
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex flex-wrap gap-1">
                            <div
                              v-for="visit in row.visits"
                              :key="visit.id"
                              class="cursor-pointer text-xs rounded px-1.5 py-0.5 inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 whitespace-nowrap"
                              @click="goToDetail(visit.id)"
                            >
                              <span class="font-medium">{{ visit.project_code }}</span>
                              <span class="text-gray-500">{{ visit.cluster_number }}</span>
                              <span>{{
                                enableVisitCode
                                  ? (visit.visit_code ?? '-')
                                  : visitSpeciesAbbr(visit)
                              }}</span>
                              <UIcon
                                :name="visitStatusIcon(visit.status)"
                                :class="visitStatusIconColor(visit.status)"
                                class="w-3.5 h-3.5 flex-shrink-0"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div
                    v-if="researcherGrid.length === 0"
                    class="text-sm text-gray-400 italic py-4"
                  >
                    Geen onderzoekers gevonden.
                  </div>
                </template>
              </div>
            </template>
          </UTabs>
        </div>
      </UCard>

      <!-- Planning Modal (For Manual Assign) -->
      <UModal v-model="showPlanModal">
        <UCard v-if="selectedVisit">
          <template #header>
            <div class="font-bold">Bezoek inplannen: {{ selectedVisit.project_code }}</div>
          </template>

          <div class="space-y-4">
            <UFormField label="Onderzoekers">
              <!-- Researcher Select (Simple Checkboxes or multi-select could be better) -->
              <!-- For now minimal placeholder -->
              <div class="text-sm text-gray-500">Selecteer onderzoekers (Todo)</div>
            </UFormField>
          </div>

          <template #footer>
            <UButton label="Opslaan" @click="showPlanModal = false" />
          </template>
        </UCard>
      </UModal>

      <!-- Bulk Status Modal -->
      <VisitStatusModal
        :visits="selectedVisitsData"
        :open="bulkStatusModalOpen"
        :is-admin="true"
        @update:open="bulkStatusModalOpen = $event"
        @saved="onBulkSaved"
      />

      <!-- Floating Action Bar -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-full opacity-0"
        >
          <div
            v-if="selectedVisitIds.size > 0"
            class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2.5"
          >
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
              {{ selectedVisitIds.size }} bezoek(en) geselecteerd
            </span>
            <UButton size="sm" icon="i-lucide-shield-check" @click="openBulkStatusModal">
              Status aanpassen
            </UButton>
            <UButton size="sm" variant="ghost" color="neutral" @click="selectedVisitIds.clear()">
              Deselecteer
            </UButton>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
  import VisitPreviewCard from '../../components/VisitPreviewCard.vue'
  import VisitStatusModal from '../../components/VisitStatusModal.vue'
  import { storeToRefs } from 'pinia'
  import { useTestModeStore } from '~~/stores/testMode'

  definePageMeta({ middleware: 'admin' })

  const { $api } = useNuxtApp()
  const testModeStore = useTestModeStore()
  const { simulatedDate } = storeToRefs(testModeStore)

  const runtimeConfig = useRuntimeConfig()

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

  type VisitListRow = {
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
    planned_week: number | null
    planned_date: string | null
    from_date: string | null
    to_date: string | null
    duration: number | null
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
    provisional_week: number | null
    provisional_locked: boolean
    custom_function_name: string | null
    custom_species_name: string | null
    visit_code: string | null
  }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  type VisitStatusOption = { label: string; value: VisitStatusCode }

  const statusOptions: VisitStatusOption[] = [
    { label: 'Aangemaakt', value: 'created' },
    { label: 'Open', value: 'open' },
    { label: 'Gepland', value: 'planned' },
    { label: 'Verlopen', value: 'overdue' },
    { label: 'Gemist', value: 'missed' },
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Uitgevoerd (afwijking)', value: 'executed_with_deviation' },
    { label: 'Niet uitgevoerd', value: 'not_executed' },
    { label: 'Goedgekeurd', value: 'approved' },
    { label: 'Afgekeurd', value: 'rejected' },
    { label: 'Geannuleerd', value: 'cancelled' }
  ]

  // --- Availability / Capacity Types ---
  interface ApiAvailabilityCompact {
    week: number
    morning_days: number
    daytime_days: number
    nighttime_days: number
    flex_days: number
    // We ignore backend 'assigned_*' counts here as we calculate them dynamically
    // based on the actual visits loaded in the planning view for accuracy.
  }
  interface ApiUserAvailability {
    id: number
    name: string
    availability: ApiAvailabilityCompact[]
  }
  interface ApiAvailabilityListResponse {
    users: ApiUserAvailability[]
  }


  interface ResearcherCapacity {
    id: number
    name: string
    remaining: {
      ochtend: number
      dag: number
      avond: number
      flex: number
    }
  }

  const completedStatusValues: VisitStatusCode[] = [
    'executed',
    'executed_with_deviation',
    'approved',
    'rejected'
  ]

  const plannedStatusValues: VisitStatusCode[] = ['planned', 'not_executed']

  const loading = ref(false)
  const clearing = ref(false)
  const sendingEmails = ref(false)
  const currentWeekNumber = computed<number>(() => currentIsoWeek(effectiveToday.value))
  const toast = useToast()

  type ApiErrorShape = {
    data?: { detail?: unknown } | null
    response?: { _data?: { detail?: unknown } | null } | null
  }

  function errorDescription(error: unknown): string {
    const err = error as ApiErrorShape
    const detail = err?.data?.detail ?? err?.response?._data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (error instanceof Error && error.message) return error.message
    return 'Onbekende fout'
  }

  // const week = ref<number>(currentWeekNumber.value) // REMOVED
  const visits = ref<VisitListRow[]>([])

  // Availability data
  const rawAvailability = ref<ApiUserAvailability[]>([])
  const availabilityCollapsed = ref(true)
  const reserveCollapsed = ref(true)

  // Feature flags
  const featureDailyPlanning = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureDailyPlanning
    if (typeof raw === 'string') return raw === 'true' || raw === '1'
    return Boolean(raw)
  })

  const featureStrictAvailability = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureStrictAvailability
    if (typeof raw === 'string') return raw === 'true' || raw === '1'
    return Boolean(raw)
  })

  const enableVisitCode = computed<boolean>(() => {
    const raw = (runtimeConfig.public as Record<string, unknown>).enableVisitCode
    if (typeof raw === 'string') return raw === 'true' || raw === '1'
    return Boolean(raw)
  })

  type WeekTab = { label: string; value: string; week: number }

  function currentIsoWeek(baseDate: Date): number {
    const d = new Date(baseDate)
    const dayNr = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dayNr + 3)
    const firstThursday = new Date(d.getFullYear(), 0, 4)
    const weekNumber =
      1 +
      Math.round(
        ((d.getTime() - firstThursday.getTime()) / 86400000 -
          3 +
          ((firstThursday.getDay() + 6) % 7)) /
          7
      )
    return Math.max(1, Math.min(53, weekNumber))
  }

  function isoWeekRange(weekNumber: number | null): { start: Date; end: Date } | null {
    if (weekNumber == null || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53)
      return null

    const now = effectiveToday.value
    const year = now.getFullYear()
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
    const dow = simple.getDay() || 7
    const monday = new Date(simple)
    monday.setDate(simple.getDate() - (dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return { start: monday, end: sunday }
  }

  const weekRange = computed(() => isoWeekRange(activeWeekNumber.value))

  const _weekLabel = computed(() => {
    if (!weekRange.value) return ''

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(weekRange.value.start)
    const end = formatter.format(weekRange.value.end)
    return `Ma-zo: ${start} - ${end}`
  })

  function getIsoWeekNumber(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const diff = tmp.getTime() - yearStart.getTime()
    return Math.ceil((diff / 86400000 + 1) / 7)
  }

  function visitWeekNumber(visit: VisitListRow): number {
    if (visit.planned_week && Number.isInteger(visit.planned_week)) {
      return visit.planned_week
    }

    if (visit.from_date) {
      const dt = new Date(visit.from_date)
      if (!Number.isNaN(dt.getTime())) {
        return getIsoWeekNumber(dt)
      }
    }

    return currentWeekNumber.value
  }

  function weekRangeLabel(weekNumber: number): string | null {
    const range = isoWeekRange(weekNumber)
    if (!range) return null

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(range.start)
    const end = formatter.format(range.end)
    return `${start} - ${end}`
  }

  function _statusLabel(code: VisitStatusCode): string {
    const found = statusOptions.find((s) => s.value === code)
    return found?.label ?? code
  }

  const availableWeeks = ref<number[]>([])

  const weekTabs = computed<WeekTab[]>(() => {
    const allWeeks = new Set(availableWeeks.value)
    allWeeks.add(currentWeekNumber.value)

    // Filter out past weeks
    const current = currentWeekNumber.value
    const futureWeeks = Array.from(allWeeks).filter((w) => w >= current)

    // Sort logically
    const sorted = futureWeeks.sort((a, b) => a - b)

    const tabs: WeekTab[] = []

    for (const w of sorted) {
      if (w === currentWeekNumber.value) {
        tabs.push({ label: 'Deze week', value: 'current', week: w })
      } else {
        const range = weekRangeLabel(w)
        const base = `Week ${w}`
        const label = range ? `${base} (${range})` : base
        tabs.push({ label, value: `week-${w}`, week: w })
      }
    }

    return tabs
  })

  async function loadWeeks(): Promise<void> {
    try {
      availableWeeks.value = await $api<number[]>('/visits/weeks')
    } catch (_e) {
      console.error('Failed to load weeks', _e)
    }
  }

  onMounted(async () => {
    await loadWeeks()

    // Restore week from query if present
    const route = useRoute()
    const queryWeek = Number(route.query.week)
    if (queryWeek && !Number.isNaN(queryWeek)) {
      // Even if past week, if explicit query param, we might want to respect it?
      // Or just filter. The user said "not display weeks past".
      // Let's rely on weekTabs filter.
      // But if user requested week 10 and we are in week 20, weekTabs won't have it.
      // So we fallback to current.
      const found = weekTabs.value.find((w) => w.week === queryWeek)
      if (found) {
        selectedWeekTab.value = found
      }
    }

    // Initial visits load
    void loadVisits()
  })

  /*
   * We bind the SelectMenu to the full tab object.
   * Default is the "current" week tab.
   */
  const defaultTab = { label: 'Deze week', value: 'current', week: currentWeekNumber.value }
  const selectedWeekTab = ref<WeekTab>(defaultTab)

  // Ensure selectedTab stays valid or defaults to current if options change
  watch(weekTabs, (tabs) => {
    const currentVal = selectedWeekTab.value.value
    const found = tabs.find((t) => t.value === currentVal)
    if (found) {
      selectedWeekTab.value = found
    } else {
      const current = tabs.find((t) => t.value === 'current')
      if (current) selectedWeekTab.value = current
    }
  })

  const activeWeekNumber = computed<number>(() => {
    return selectedWeekTab.value.week
  })

  // Reload data/availability when active week changes
  watch(activeWeekNumber, () => {
    void loadVisits()
  })

  const isCurrentWeekTab = computed<boolean>(
    () => activeWeekNumber.value === currentWeekNumber.value
  )

  const generateLabel = computed(() => {
    return isCurrentWeekTab.value
      ? 'Genereer planning deze week'
      : `Genereer planning week ${activeWeekNumber.value}`
  })

  const deleteLabel = computed(() => {
    return isCurrentWeekTab.value
      ? 'Verwijder planning deze week'
      : `Verwijder planning week ${activeWeekNumber.value}`
  })

  function _isInSelectedWeek(visit: VisitListRow): boolean {
    if (!weekRange.value) return false
    if (!visit.from_date || !visit.to_date) return false

    const from = new Date(visit.from_date)
    const to = new Date(visit.to_date)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false

    return from <= weekRange.value.end && to >= weekRange.value.start
  }

  const completedVisits = computed(() =>
    visits.value.filter((v) => completedStatusValues.includes(v.status))
  )

  const plannedVisits = computed(() =>
    visits.value.filter((v) => plannedStatusValues.includes(v.status))
  )

  // --- NEW PLAN BOARD LOGIC ---

  const tabs = computed(() => {
    const result: { label: string; slot: string }[] = []
    if (isCurrentWeekTab.value) {
      result.push({ label: 'Status', slot: 'status' })
    }
    result.push({ label: 'Planbord', slot: 'plan' })
    if (plannedVisits.value.length > 0) {
      result.push({ label: 'Onderzoekers', slot: 'researchers' })
    }
    return result
  })

  const showPlanModal = ref(false)
  const selectedVisit = ref<VisitListRow | null>(null)

  // Inbox: Visits provisionally planned for this week that are not yet planned.
  const inboxVisits = computed(() => {
    const w = activeWeekNumber.value
    return visits.value.filter((v) => {
      if (v.provisional_week !== w) return false

      if (v.planned_week != null) return false

      // If it's executed/cancelled, ignore
      if (['executed', 'executed_with_deviation', 'cancelled', 'rejected'].includes(v.status))
        return false

      return true
    })
  })

  const reserveVisits = computed(() => {
    const w = activeWeekNumber.value
    return visits.value.filter((v) => {
      if (!_isInSelectedWeek(v)) return false
      if (v.planned_week != null) return false
      if (['executed', 'executed_with_deviation', 'cancelled', 'rejected'].includes(v.status))
        return false

      return v.provisional_week !== w
    })
  })

  const reserveVisitsLimited = computed(() => reserveVisits.value.slice(0, 30))

  // Schedule: Visits explicitly planned for this week
  const scheduleVisits = computed(() => {
    const w = activeWeekNumber.value
    return visits.value.filter((v) => v.planned_week === w && v.researchers.length > 0)
  })

  // --- Researcher Grid ---

  function toLocalISODate(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const weekDays = computed(() => {
    if (!weekRange.value) return []
    const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    const formatter = new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' })
    
    const allVisits = [...plannedVisits.value, ...completedVisits.value]
    
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekRange.value!.start)
      date.setDate(date.getDate() + i)
      return {
        short: dayNames[i] as string,
        dateStr: formatter.format(date),
        iso: toLocalISODate(date)
      }
    })
    
    const sat = dates[5]
    const sun = dates[6]
    
    if (!sat || !sun) return dates.slice(0, 5)
    
    const hasSat = allVisits.some((v) => v.planned_date && v.planned_date.startsWith(sat.iso))
    const hasSun = allVisits.some((v) => v.planned_date && v.planned_date.startsWith(sun.iso))
    
    const result = dates.slice(0, 5)
    if (hasSat) result.push(sat)
    if (hasSun) result.push(sun)
    
    return result
  })

  type ResearcherRow = {
    id: number
    name: string
    visits: VisitListRow[]
    visitsByDay: Record<string, VisitListRow[]>
  }

  const researcherGrid = computed<ResearcherRow[]>(() => {
    const allVisits = [...plannedVisits.value, ...completedVisits.value]
    const map = new Map<number, ResearcherRow>()

    for (const visit of allVisits) {
      for (const researcher of visit.researchers) {
        if (!map.has(researcher.id)) {
          map.set(researcher.id, {
            id: researcher.id,
            name: researcher.full_name ?? `Gebruiker #${researcher.id}`,
            visits: [],
            visitsByDay: {}
          })
        }
        const row = map.get(researcher.id)!
        row.visits.push(visit)

        const dayKey = visit.planned_date ? visit.planned_date.slice(0, 10) : 'onbekend'
        if (!row.visitsByDay[dayKey]) row.visitsByDay[dayKey] = []
        row.visitsByDay[dayKey].push(visit)
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })

  function visitSpeciesAbbr(visit: VisitListRow): string {
    if (visit.species.length > 0) {
      const abbreviations = visit.species.map((s) => s.abbreviation || s.name)
      return Array.from(new Set(abbreviations)).join(' ')
    }
    return visit.custom_species_name || '-'
  }

  function visitStatusIcon(status: VisitStatusCode): string {
    if (['executed', 'executed_with_deviation', 'approved'].includes(status)) {
      return 'i-heroicons-check-circle'
    }
    if (status === 'planned') return 'i-heroicons-calendar'
    return 'i-heroicons-clock'
  }

  function visitStatusIconColor(status: VisitStatusCode): string {
    if (['executed', 'executed_with_deviation', 'approved'].includes(status)) return 'text-green-500'
    if (status === 'planned') return 'text-blue-500'
    return 'text-gray-400'
  }

  // --- End Researcher Grid ---

  // --- END NEW LOGIC ---

  // --- Capacity Calculation ---

  const capacityData = computed<{
    researchers: ResearcherCapacity[]
    totals: { ochtend: number; dag: number; avond: number; flex: number }
  }>(() => {
    // 1. Build initial map from raw availability
    const map = new Map<number, ResearcherCapacity>()
    const targetWeek = activeWeekNumber.value

    for (const user of rawAvailability.value) {
      // Find the availability entry for the *active* week
      const entry = user.availability.find((a) => a.week === targetWeek)
      if (!entry) continue

      // Initialize with total capacity
      map.set(user.id, {
        id: user.id,
        name: user.name,
        remaining: {
          ochtend: entry.morning_days ?? 0,
          dag: entry.daytime_days ?? 0,
          avond: entry.nighttime_days ?? 0,
          flex: entry.flex_days ?? 0
        }
      })
    }

    // 2. Subtract assigned visits
    // We use 'visits' and 'isInSelectedWeek' to ensure we only count what's visible/relevant
    // for this week tab.

    for (const v of visits.value) {
      if (['cancelled', 'rejected'].includes(v.status)) continue

      // The tab logic already filters by week for display, but let's double check logic match.
      // isInSelectedWeek uses date ranges. visitWeekNumber is more direct for planning logic.
      if (visitWeekNumber(v) !== targetWeek) continue

      const part = v.part_of_day

      for (const r of v.researchers) {
        const cap = map.get(r.id)
        if (!cap) continue

        if (part === 'Ochtend' || part === 'ochtend') {
          cap.remaining.ochtend--
          if (cap.remaining.ochtend < 0 && cap.remaining.flex > 0) {
            cap.remaining.ochtend++
            cap.remaining.flex--
          }
        } else if (part === 'Dag' || part === 'dag') {
          cap.remaining.dag--
          if (cap.remaining.dag < 0 && cap.remaining.flex > 0) {
            cap.remaining.dag++
            cap.remaining.flex--
          }
        } else if (part === 'Avond' || part === 'avond' || part === 'Nacht' || part === 'nacht') {
          cap.remaining.avond--
          if (cap.remaining.avond < 0 && cap.remaining.flex > 0) {
            cap.remaining.avond++
            cap.remaining.flex--
          }
        } else {
          // No specific part -> consume Flex
          cap.remaining.flex--
        }
      }
    }

    // 3. Aggregate totals and list
    const researchers = Array.from(map.values())
      .filter(
        (r) =>
          r.remaining.ochtend > 0 ||
          r.remaining.dag > 0 ||
          r.remaining.avond > 0 ||
          r.remaining.flex > 0
      )
      .sort((a, b) => a.name.localeCompare(b.name))

    const totals = { ochtend: 0, dag: 0, avond: 0, flex: 0 }
    for (const r of researchers) {
      if (r.remaining.ochtend > 0) totals.ochtend += r.remaining.ochtend
      if (r.remaining.dag > 0) totals.dag += r.remaining.dag
      if (r.remaining.avond > 0) totals.avond += r.remaining.avond
      if (r.remaining.flex > 0) totals.flex += r.remaining.flex
    }

    return { researchers, totals }
  })

  type OverplanningWarning = {
    researcher_id: number
    researcher_name: string
    available_total: number
    assigned_total: number
  }

  const overplanningWarnings = computed<OverplanningWarning[]>(() => {
    const targetWeek = activeWeekNumber.value
    const statuses: VisitStatusCode[] = ['planned', 'executed', 'executed_with_deviation']

    const map = new Map<
      number,
      {
        id: number
        name: string
        available_total: number
        assigned_total: number
      }
    >()

    for (const user of rawAvailability.value) {
      const entry = user.availability.find((a) => a.week === targetWeek)
      const available =
        (entry?.morning_days ?? 0) +
        (entry?.daytime_days ?? 0) +
        (entry?.nighttime_days ?? 0) +
        (entry?.flex_days ?? 0)

      map.set(user.id, {
        id: user.id,
        name: user.name,
        available_total: available,
        assigned_total: 0
      })
    }

    for (const v of visits.value) {
      if (!statuses.includes(v.status)) continue
      if (visitWeekNumber(v) !== targetWeek) continue

      for (const r of v.researchers) {
        const name = r.full_name ?? `#${r.id}`
        const existing = map.get(r.id)
        if (!existing) {
          map.set(r.id, {
            id: r.id,
            name,
            available_total: 0,
            assigned_total: 1
          })
          continue
        }

        existing.assigned_total += 1
      }
    }

    const warnings: OverplanningWarning[] = []
    for (const r of map.values()) {
      if (r.assigned_total <= r.available_total) continue
      warnings.push({
        researcher_id: r.id,
        researcher_name: r.name,
        available_total: r.available_total,
        assigned_total: r.assigned_total
      })
    }

    return warnings.sort((a, b) => a.researcher_name.localeCompare(b.researcher_name))
  })

  const overplanningMessages = computed<string[]>(() => {
    return overplanningWarnings.value.map((w) => `${w.researcher_name} heeft te veel bezoeken`)
  })

  async function loadAvailability(): Promise<void> {
    try {
      // Fetch for the active week tab
      const w = activeWeekNumber.value
      const response = await $api<ApiAvailabilityListResponse>('/admin/availability', {
        method: 'GET',
        query: { week_start: w, week_end: w }
      })
      rawAvailability.value = response.users
    } catch (e) {
      console.error('Failed to load availability', e)
    }
  }

  async function loadVisits(): Promise<void> {
    loading.value = true
    try {
      const w = activeWeekNumber.value
      const statuses: VisitStatusCode[] = [
        ...completedStatusValues,
        ...plannedStatusValues,
        'open',
        'created'
      ]
      const query: Record<string, unknown> = {
        page: 1,
        page_size: 200,
        statuses,
        week: w
      }
      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }
      const response = await $api<VisitListResponse>('/visits', { query })
      visits.value = response.items

      // Load availability for the initial active week
      void loadAvailability()
    } finally {
      loading.value = false
    }
  }

  // Refetch availability when switching tabs (weeks)
  watch(activeWeekNumber, () => {
    void loadAvailability()
  })

  async function runPlanning(): Promise<void> {
    loading.value = true
    try {
      const w = activeWeekNumber.value
      // Retrieve response to get count
      const result = await $api<{ selected_visit_ids: number[] }>(`/planning/generate`, {
        method: 'POST',
        body: { week: w }
      })

      // 1. Show feedback
      const count = result.selected_visit_ids.length
      toast.add({
        title: 'Planning gegenereerd',
        description: `Planning gegenereerd voor week ${w}, ${count} bezoeken ingepland.`,
        color: 'success'
      })

      // 2. Refresh available weeks (in case this week wasn't there before)
      await loadWeeks()

      // No need to navigate, we are already on the tab?
      // Actually we might need to re-find the tab if it wasn't there before.

      const foundTab = weekTabs.value.find((t) => t.week === w)
      if (foundTab) {
        selectedWeekTab.value = foundTab
      }

      // 4. Load visits for the newly selected week
      await loadVisits()
    } catch (error: unknown) {
      const w = activeWeekNumber.value
      const description = errorDescription(error)
      toast.add({
        title: 'Fout bij planning genereren',
        description: `Week ${w}: ${description}`,
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  async function sendPlanningEmails() {
    if (
      !confirm(
        'Weet je zeker dat je de planning wilt mailen naar alle onderzoekers voor deze week?'
      )
    )
      return

    sendingEmails.value = true
    try {
      const year = effectiveToday.value.getFullYear()
      const targetYear = weekRange.value ? weekRange.value.start.getFullYear() : year

      const result = await $api<{ message: string; stats: unknown }>(
        `/planning/${targetYear}/${activeWeekNumber.value}/notify`,
        {
          method: 'POST'
        }
      )
      toast.add({
        title: 'Emails verstuurd',
        description: result.message,
        color: 'success'
      })
    } catch (err: unknown) {
      toast.add({
        title: 'Fout bij versturen emails',
        description: errorDescription(err),
        color: 'error'
      })
    } finally {
      sendingEmails.value = false
    }
  }

  async function clearResearchers(): Promise<void> {
    if (
      !confirm('Weet je zeker dat je alle toegewezen onderzoekers voor deze week wilt verwijderen?')
    )
      return

    clearing.value = true
    try {
      const w = activeWeekNumber.value
      await $api(`/planning/clear`, { method: 'POST', body: { week: w } })
      await loadVisits()
    } finally {
      clearing.value = false
    }
  }

  watch(
    () => simulatedDate.value,
    () => {
      if (!testModeEnabled.value) return
      void loadVisits()
    }
  )

  // Removed onMounted here because we do it after loading weeks

  // --- Bulk Selection ---
  const selectedVisitIds = reactive(new Set<number>())
  const bulkStatusModalOpen = ref(false)

  function toggleSelection(id: number, selected: boolean) {
    if (selected) {
      selectedVisitIds.add(id)
    } else {
      selectedVisitIds.delete(id)
    }
  }

  const selectedVisitsData = computed(() => {
    return visits.value
      .filter((v) => selectedVisitIds.has(v.id))
      .map((v) => ({
        id: v.id,
        status: v.status,
        from_date: v.from_date,
        to_date: v.to_date,
        planned_week: v.planned_week,
        planned_date: v.planned_date,
        researchers: v.researchers
      }))
  })

  function openBulkStatusModal() {
    bulkStatusModalOpen.value = true
  }

  async function onBulkSaved() {
    selectedVisitIds.clear()
    await loadVisits()
  }

  function goToDetail(id: number): void {
    const q: Record<string, string | number> = { back: 'planning' }
    if (activeWeekNumber.value) {
      q.week = activeWeekNumber.value
    }
    navigateTo({
      path: `/visits/${id}`,
      query: q
    })
  }
</script>
