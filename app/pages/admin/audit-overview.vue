<template>
  <div>
    <UPageHeader title="Controle-overzicht" />

    <UCard class="mt-6">
      <div v-if="pending" class="p-4 text-sm text-gray-500">Bezoeken worden geladen</div>
      <div v-else-if="error" class="p-4 text-sm text-red-500">Kon bezoeken niet laden.</div>
      <div v-else>
        <div class="mb-4 max-w-sm">
          <UInput
            v-model="pcbFilter"
            placeholder="Filter op PCB..."
            icon="i-lucide-search"
            clearable
          />
        </div>

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
  import type { VisitAuditRow } from '~/types/audit'

  definePageMeta({ middleware: 'admin' })

  const { data, pending, error, refresh } = useAsyncData(
    'audit-overview-visits',
    () => useNuxtApp().$api<VisitAuditRow[]>('/visits/audit/list'),
    { default: () => [] }
  )

  const pcbFilter = ref('')

  const filteredRows = computed(() => {
    const all = (data.value ?? []).filter(
      (r) =>
        r.status === 'approved' ||
        r.status === 'rejected' ||
        r.status === 'needs_action' ||
        r.status === 'provisional'
    )
    const query = pcbFilter.value.trim().toLowerCase()
    if (!query) return all
    return all.filter((r) => {
      const parts = [r.project_code, r.cluster_number]
      if (r.visit_nr != null) parts.push(String(r.visit_nr))
      return parts.join('-').toLowerCase().includes(query)
    })
  })
</script>
