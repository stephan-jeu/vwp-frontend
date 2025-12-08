<template>
  <div>
    <UPageHeader title="Prullenbak" />

    <UCard class="mt-6">
      <div v-if="loading" class="p-4 text-sm text-gray-500">Items worden geladen…</div>
      <div v-else-if="items.length === 0" class="p-4 text-sm text-gray-500">
        Er staan geen items in de prullenbak.
      </div>
      <div v-else>
        <UTable :data="items" :columns="columns">
          <template #kind-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-200">
              {{ kindLabel(row.original.kind) }}
            </span>
          </template>

          <template #label-cell="{ row }">
            <span class="text-sm text-gray-800 dark:text-gray-100">
              {{ row.original.label }}
            </span>
          </template>

          <template #deletedAt-cell="{ row }">
            <span class="text-xs text-gray-600 dark:text-gray-300">
              {{ formatDateTime(row.original.deleted_at) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-2">
              <UPopover>
                <UButton
                  size="sm"
                  variant="ghost"
                  color="primary"
                  :loading="restoringId === row.original.id"
                  :icon="'i-lucide-archive-restore'"
                  aria-label="Terugzetten"
                  @click="onRestore(row.original)"
                />
                <template #content> Terugzetten </template>
              </UPopover>
              <UPopover>
                <UButton
                  size="sm"
                  variant="ghost"
                  color="warning"
                  :loading="deletingId === row.original.id"
                  :icon="'i-lucide-trash-2'"
                  aria-label="Definitief verwijderen"
                  @click="onHardDelete(row.original)"
                />
                <template #content> Definitief verwijderen </template>
              </UPopover>
            </div>
            <p
              v-if="rowErrors[row.original.id]"
              class="mt-2 text-xs text-red-600 dark:text-red-400"
            >
              {{ rowErrors[row.original.id] }}
            </p>
          </template>
        </UTable>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import type { TableColumn } from '#ui/types'

  definePageMeta({ middleware: 'admin' })

  type TrashKind = 'project' | 'cluster' | 'visit' | 'user'

  interface TrashItemRow {
    id: number
    kind: TrashKind
    label: string
    project_code?: string | null
    cluster_number?: number | null
    visit_nr?: number | null
    deleted_at: string
  }

  interface ApiErrorData {
    detail?: string
  }

  interface ApiErrorResponse {
    _data?: ApiErrorData
  }

  interface ApiError extends Error {
    data?: ApiErrorData
    response?: ApiErrorResponse
  }

  function isApiError(error: unknown): error is ApiError {
    if (typeof error !== 'object' || error === null) return false
    const e = error as Partial<ApiError>
    return 'data' in e || 'response' in e
  }

  const { $api } = useNuxtApp()
  const toast = useToast()

  const loading = ref(false)
  const items = ref<TrashItemRow[]>([])
  const restoringId = ref<number | null>(null)
  const deletingId = ref<number | null>(null)
  const rowErrors = ref<Record<number, string>>({})

  const columns: TableColumn<TrashItemRow>[] = [
    { id: 'kind', header: 'Type' },
    { id: 'label', header: 'Item' },
    { id: 'deletedAt', header: 'Verwijderd op' },
    { id: 'actions', header: '' }
  ]

  function kindLabel(kind: TrashKind): string {
    const map: Record<TrashKind, string> = {
      project: 'Project',
      cluster: 'Cluster',
      visit: 'Bezoek',
      user: 'Gebruiker'
    }
    return map[kind]
  }

  function formatDateTime(iso: string): string {
    if (!iso) return ''
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return ''
    const datePart = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    }).format(dt)
    const timePart = new Intl.DateTimeFormat('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
    return `${datePart} ${timePart}`
  }

  async function loadTrash(): Promise<void> {
    loading.value = true
    try {
      const data = await $api<TrashItemRow[]>('/admin/trash')
      items.value = data
    } catch {
      toast.add({ title: 'Kon prullenbak niet laden', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function onRestore(item: TrashItemRow): Promise<void> {
    restoringId.value = item.id
    // Clear any previous error for this row without using delete on a dynamic key
    const entries = Object.entries(rowErrors.value).filter(([key]) => Number(key) !== item.id)
    const nextErrors: Record<number, string> = {}
    for (const [k, v] of entries) {
      nextErrors[Number(k)] = v
    }
    rowErrors.value = nextErrors

    try {
      await $api(`/admin/trash/${item.kind}/${item.id}/restore`, { method: 'POST' })
      items.value = items.value.filter((x) => x.id !== item.id)
      toast.add({ title: 'Item teruggezet', color: 'success' })
    } catch (error: unknown) {
      if (isApiError(error)) {
        const message =
          error.data?.detail ??
          error.response?._data?.detail ??
          'Dit item bestaat al en kan niet worden teruggezet.'
        rowErrors.value = { ...rowErrors.value, [item.id]: message }
      } else {
        toast.add({ title: 'Kon item niet terugzetten', color: 'error' })
      }
    } finally {
      restoringId.value = null
    }
  }

  async function onHardDelete(item: TrashItemRow): Promise<void> {
    deletingId.value = item.id
    try {
      await $api(`/admin/trash/${item.kind}/${item.id}`, { method: 'DELETE' })
      items.value = items.value.filter((x) => x.id !== item.id)
      toast.add({ title: 'Item definitief verwijderd', color: 'success' })
    } catch {
      toast.add({ title: 'Kon item niet verwijderen', color: 'error' })
    } finally {
      deletingId.value = null
    }
  }

  onMounted(loadTrash)
</script>
