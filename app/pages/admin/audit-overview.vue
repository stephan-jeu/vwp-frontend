<template>
  <div>
    <UPageHeader title="Controle-overzicht" />

    <UCard class="mt-6">
      <div v-if="pending" class="p-4 text-sm text-gray-500">Bezoeken worden geladen</div>
      <div v-else-if="error" class="p-4 text-sm text-red-500">Kon bezoeken niet laden.</div>
      <div v-else>
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UInput
            v-model="pcbFilter"
            placeholder="Filter op PCB..."
            icon="i-lucide-search"
            clearable
            class="w-44"
          />

          <USelectMenu
            v-model="selectedStatuses"
            :items="auditStatusOptions"
            multiple
            placeholder="Status"
            class="w-52"
          />

          <UInputMenu
            :model-value="selectedResearcherFilters"
            :items="researcherOptions"
            multiple
            searchable
            placeholder="Onderzoeker"
            class="w-52"
            @update:model-value="(sel) => (filterResearcherIds = sel.map((o) => o.value as number))"
          />

          <UInputMenu
            :model-value="selectedFunctionFilters"
            :items="functionOptions"
            multiple
            searchable
            placeholder="Functies"
            class="w-52"
            @update:model-value="(sel) => (filterFunctionIds = sel.map((o) => o.value as number))"
          />

          <UInputMenu
            :model-value="selectedSpeciesFilters"
            :items="speciesOptions"
            multiple
            searchable
            placeholder="Soorten"
            class="w-52"
            @update:model-value="(sel) => (filterSpeciesIds = sel.map((o) => o.value as number))"
          />

          <UInput
            v-model.number="filterWeek"
            placeholder="Week"
            type="number"
            min="1"
            max="53"
            class="w-24"
          />
        </div>

        <div class="mb-3 text-xs text-gray-500">{{ filteredRows.length }} bezoeken</div>

        <AuditVisitsTable
          :rows="filteredRows"
          mode="actions"
          @submitted="refresh"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import type { VisitAuditRow, AuditStatus } from '~/types/audit'

type Option = { label: string; value: number }
  type AuditStatusOption = { label: string; value: AuditStatus }
  const { data, pending, error, refresh } = useAsyncData(
    'audit-overview-visits',
    () => useNuxtApp().$api<VisitAuditRow[]>('/visits/audit/list'),
    { default: () => [] }
  )

  const pcbFilter = ref('')
  const selectedStatuses = ref<AuditStatusOption[]>([])
  const filterResearcherIds = ref<number[]>([])
  const filterFunctionIds = ref<number[]>([])
  const filterSpeciesIds = ref<number[]>([])
  const filterWeek = ref<number | null>(null)

  const auditStatusOptions: AuditStatusOption[] = [
    { label: 'Goedgekeurd', value: 'approved' },
    { label: 'Afgekeurd', value: 'rejected' },
    { label: 'Actie nodig', value: 'needs_action' },
    { label: 'Voorlopig afgekeurd', value: 'provisional' }
  ]


  const researcherOptions = computed<Option[]>(() => {
    const map = new Map<number, string>()
    for (const row of data.value ?? []) {
      for (const r of row.researchers) {
        map.set(r.id, r.full_name ?? `Gebruiker #${r.id}`)
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const functionOptions = computed<Option[]>(() => {
    const map = new Map<number, string>()
    for (const row of data.value ?? []) {
      for (const f of row.functions) {
        map.set(f.id, f.name)
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  })

  const speciesOptions = computed<Option[]>(() => {
    const map = new Map<number, string>()
    for (const row of data.value ?? []) {
      for (const s of row.species) {
        map.set(s.id, s.abbreviation ?? s.name)
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  })

  const selectedResearcherFilters = computed(() =>
    researcherOptions.value.filter((o) => filterResearcherIds.value.includes(o.value))
  )
  const selectedFunctionFilters = computed(() =>
    functionOptions.value.filter((o) => filterFunctionIds.value.includes(o.value))
  )
  const selectedSpeciesFilters = computed(() =>
    speciesOptions.value.filter((o) => filterSpeciesIds.value.includes(o.value))
  )

  function getIsoWeek(dateStr: string): number | null {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const week1 = new Date(d.getFullYear(), 0, 4)
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    )
  }

  const filteredRows = computed(() => {
    const auditStatuses = new Set<string>(['approved', 'rejected', 'needs_action', 'provisional'])
    let result = (data.value ?? []).filter((r) => auditStatuses.has(r.status))

    const query = pcbFilter.value.trim().toLowerCase()
    if (query) {
      result = result.filter((r) => {
        const parts = [r.project_code, r.cluster_number]
        if (r.visit_nr != null) parts.push(String(r.visit_nr))
        return parts.join('-').toLowerCase().includes(query)
      })
    }

    if (selectedStatuses.value.length > 0) {
      const statusSet = new Set(selectedStatuses.value.map((s) => s.value))
      result = result.filter((r) => statusSet.has(r.status as AuditStatus))
    }

    if (filterResearcherIds.value.length > 0) {
      const ids = new Set(filterResearcherIds.value)
      result = result.filter((r) => r.researchers.some((res) => ids.has(res.id)))
    }

    if (filterFunctionIds.value.length > 0) {
      const ids = new Set(filterFunctionIds.value)
      result = result.filter((r) => r.functions.some((f) => ids.has(f.id)))
    }

    if (filterSpeciesIds.value.length > 0) {
      const ids = new Set(filterSpeciesIds.value)
      result = result.filter((r) => r.species.some((s) => ids.has(s.id)))
    }

    if (filterWeek.value != null) {
      const targetWeek = filterWeek.value
      result = result.filter((r) => {
        if (!r.execution_date) return false
        return getIsoWeek(r.execution_date) === targetWeek
      })
    }

    return result
  })
</script>
