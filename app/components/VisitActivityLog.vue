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
          <div>
            <span class="font-medium">
              {{ item.actor?.full_name ?? 'Systeem' }}
            </span>
            <span class="ml-1">{{ actionLabel(item.action) }}</span>
          </div>
          <div v-if="item.details?.comment" class="text-gray-600">
            "{{ item.details.comment }}"
          </div>
          <div v-else-if="item.details?.reason" class="text-gray-600">
            {{ item.details.reason }}
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
      default:
        return action
    }
  }
</script>
