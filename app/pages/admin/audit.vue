<template>
  <div>
    <UPageHeader title="Controle" />

    <UCard class="mt-6">
      <div v-if="pending" class="p-4 text-sm text-gray-500">Bezoeken worden geladen</div>
      <div v-else-if="error" class="p-4 text-sm text-red-500">Kon bezoeken niet laden.</div>
      <div v-else>
        <UTabs v-model="activeTab" :items="auditTabs" class="mb-4" />

        <AuditVisitsTable
          :rows="filteredRows"
          :mode="activeTab === 'to_check' ? 'to_check' : 'actions'"
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
    'audit-visits',
    () => useNuxtApp().$api<VisitAuditRow[]>('/visits/audit/list'),
    { default: () => [] }
  )

  const auditTabs = [
    { label: 'Te controleren', value: 'to_check' },
    { label: 'Acties nodig', value: 'needs_action' }
  ]

  const activeTab = ref('to_check')

  const filteredRows = computed(() => {
    const all = data.value ?? []
    if (activeTab.value === 'needs_action') {
      return all.filter((r) => r.status === 'needs_action' || r.status === 'provisional')
    }
    return all.filter((r) => r.status === 'executed' || r.status === 'executed_with_deviation')
  })
</script>
