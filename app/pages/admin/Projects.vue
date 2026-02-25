<template>
  <div>
    <UPageHeader title="Projecten" />

    <UCard class="mt-6">
      <UForm :state="form" :schema="schema" data-testid="project-form" @submit="onSubmit">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <UFormField label="Projectcode" name="code" required>
            <UInput v-model="form.code" placeholder="Bijv. P-001" data-testid="input-code" />
          </UFormField>
          <UFormField label="Locatie" name="location" required>
            <UInput
              v-model="form.location"
              placeholder="Bijv. Utrecht"
              data-testid="input-location"
            />
          </UFormField>
          <UFormField label="Klant" name="customer">
            <UInput
              v-model="form.customer"
              placeholder="Optioneel"
              data-testid="input-customer"
            />
          </UFormField>
          <UFormField label="Google Drive folder" name="google_drive_folder">
            <UInput
              v-model="form.google_drive_folder"
              placeholder="Optioneel"
              data-testid="input-gdrive"
              class="w-72"
            />
          </UFormField>
          <UFormField label="Offerte" name="quote">
            <UCheckbox v-model="form.quote" data-testid="input-quote" />
          </UFormField>
        </div>
        <div class="mt-4 flex gap-2">
          <UButton type="submit" color="primary" :loading="saving" data-testid="btn-submit">
            {{ isEditing ? 'Opslaan' : 'Toevoegen' }}
          </UButton>
          <UButton v-if="isEditing" variant="ghost" data-testid="btn-cancel" @click="resetForm"
            >Annuleren</UButton
          >
        </div>
      </UForm>
    </UCard>

    <UCard class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">Bestaande projecten</h3>
        <UInput
          v-model="globalFilter"
          placeholder="Filter..."
          class="w-64"
          data-testid="global-filter"
        />
      </div>
      <UTable
        :data="rows"
        :columns="columns"
        :loading="store.loading"
        :global-filter="globalFilter"
        data-testid="projects-table"
      >
        <template #select-header>
          <UCheckbox
            :model-value="allSelected"
            :indeterminate="someSelected && !allSelected"
            @update:model-value="toggleAllRows"
          />
        </template>
        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="bulkSelectedIds.has(row.original.id)"
            @click.stop
            @update:model-value="toggleBulkSelection(row.original.id, $event as boolean)"
          />
        </template>
        <template #quote-cell="{ row }">
          <span class="inline-flex items-center">
            <UIcon
              v-if="row.original?.quote"
              name="i-lucide-check"
              class="text-green-600 size-4"
            />
            <UIcon v-else name="i-lucide-x" class="text-warning-800 size-4" />
          </span>
        </template>
        <template #google-cell="{ row }">
          <span class="inline-flex items-center">
            <UIcon
              v-if="!!row.original?.google_drive_folder"
              name="i-lucide-check"
              class="text-green-600 size-4"
            />
            <UIcon v-else name="i-lucide-x" class="text-warning-800 size-4" />
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UButton variant="ghost" @click.stop="edit(row.original)"
            ><UIcon name="i-lucide-pencil" class="mr-1 size-4"
          /></UButton>
          <UButton
            color="warning"
            variant="ghost"
            :data-testid="`btn-delete-${row.original?.id}`"
            @click.stop="confirmDelete(row.original)"
          >
            <UIcon name="i-lucide-trash-2" class="size-4" />
          </UButton>
        </template>
      </UTable>
    </UCard>

    <UModal
      v-model:open="showDelete"
      title="Project verwijderen"
      description="Verwijdert een project met alle onderliggende clusters en bezoeken"
      data-testid="delete-modal"
    >
      <template #content>
        <UCard>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-triangle" class="text-amber-500" />
            <h3 class="text-lg font-medium">Project verwijderen</h3>
          </div>
          <p v-if="toDelete" class="mt-2">
            Weet je zeker dat je project <strong>{{ toDelete.code }}</strong> wilt verwijderen? Als
            je dit doet zullen ook alle onderliggende clusters en bezoeken worden verwijderd.
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton variant="ghost" data-testid="btn-modal-cancel" @click="showDelete = false"
              >Annuleren</UButton
            >
            <UButton
              color="warning"
              :loading="deleting"
              data-testid="btn-modal-delete"
              @click="doDelete"
              >Verwijderen</UButton
            >
          </div>
        </UCard>
      </template>
    </UModal>

    <UModal
      v-model:open="showBulkArchive"
      title="Projecten archiveren"
      description="Verplaatst project(en) met alle onderliggende clusters en bezoeken naar het archief"
      data-testid="archive-modal"
    >
      <template #content>
        <UCard>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-archive" class="text-primary-500" />
            <h3 class="text-lg font-medium">Projecten archiveren</h3>
          </div>
          <p class="mt-2">
            Weet je zeker dat je <strong>{{ bulkSelectedIds.size }}</strong> project(en) wilt archiveren? Dit kan niet ongedaan gemaakt worden en verbergt alle onderliggende clusters en bezoeken.
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton variant="ghost" @click="showBulkArchive = false"
              >Annuleren</UButton
            >
            <UButton
              color="primary"
              :loading="archiving"
              @click="doBulkArchive"
              >Archiveren</UButton
            >
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Floating Action Bar for Bulk Selection -->
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
          v-if="bulkSelectedIds.size > 0"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2.5"
        >
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ bulkSelectedIds.size }} project(en) geselecteerd
          </span>
          <UButton size="sm" icon="i-lucide-archive" @click="showBulkArchive = true">
            Projecten archiveren
          </UButton>
          <UButton size="sm" variant="ghost" color="neutral" @click="bulkSelectedIds.clear()">
            Deselecteer
          </UButton>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { z } from 'zod'
  import type { Project, ProjectCreate } from '~~/stores/projects'
  import { useProjectsStore } from '~~/stores/projects'
  import type { TableColumn } from '#ui/types'

  definePageMeta({ middleware: 'admin' })

  const store = useProjectsStore()
  const globalFilter = ref('')
  const saving = ref(false)
  const deleting = ref(false)
  const showDelete = ref(false)
  const toDelete = ref<Project | null>(null)
  const bulkSelectedIds = ref<Set<number>>(new Set())
  const showBulkArchive = ref(false)
  const archiving = ref(false)
  const toast = useToast()

  const schema = z.object({
    code: z.string().min(1, 'Verplicht'),
    location: z.string().min(1, 'Verplicht'),
    customer: z.string().nullable().optional(),
    google_drive_folder: z.string().nullable().optional(),
    quote: z.boolean().optional().default(false)
  })

  type FormState = {
    id?: number
    code: string
    location: string
    customer: string | null
    google_drive_folder: string | null
    quote: boolean
  }

  const form = reactive<FormState>({
    code: '',
    location: '',
    customer: null,
    google_drive_folder: null,
    quote: false
  })
  const isEditing = computed(() => !!form.id)

  const columns: TableColumn<Project>[] = [
    { id: 'select', header: '', enableSorting: false },
    { accessorKey: 'code', header: 'Projectcode' },
    { accessorKey: 'location', header: 'Locatie' },
    { accessorKey: 'customer', header: 'Klant' },
    { id: 'quote', header: 'Offerte' },
    { id: 'google', header: 'Google Drive' },
    { id: 'actions', header: '' }
  ]

  const rows = computed(() => {
    if (!globalFilter.value) return store.projects
    const term = globalFilter.value.toLowerCase()
    return store.projects.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        p.customer?.toLowerCase().includes(term)
    )
  })

  const allSelected = computed(() => {
    return rows.value.length > 0 && rows.value.every((row) => bulkSelectedIds.value.has(row.id))
  })

  const someSelected = computed(() => {
    return rows.value.some((row) => bulkSelectedIds.value.has(row.id))
  })

  function toggleAllRows(val: boolean | 'indeterminate') {
    if (val === true) {
      rows.value.forEach((row) => bulkSelectedIds.value.add(row.id))
    } else {
      bulkSelectedIds.value.clear()
    }
  }

  function toggleBulkSelection(id: number, val: boolean) {
    if (val) bulkSelectedIds.value.add(id)
    else bulkSelectedIds.value.delete(id)
  }

  function resetForm() {
    Object.assign(form, {
      id: undefined,
      code: '',
      location: '',
      customer: null,
      google_drive_folder: null,
      quote: false
    })
  }

  async function onSubmit() {
    const duplicate = store.projects.find(
      (project) => project.code === form.code && (!isEditing.value || project.id !== form.id)
    )
    if (duplicate) {
      toast.add({
        title: `Projectcode ${form.code} bestaat al`,
        color: 'warning'
      })
      return
    }

    saving.value = true
    try {
      const payload: ProjectCreate = {
        code: form.code,
        location: form.location,
        customer: form.customer ?? null,
        google_drive_folder: form.google_drive_folder ?? null,
        quote: form.quote ?? false
      }
      if (isEditing.value && form.id) {
        await store.update(form.id, payload)
        toast.add({ title: `Project ${payload.code} bewerkt.`, color: 'success' })
      } else {
        await store.create(payload)
        await store.fetchAll()
        // Reset form on successful create and show toast
        toast.add({ title: `Project ${payload.code} toegevoegd.`, color: 'success' })
      }
      resetForm()
    } finally {
      saving.value = false
    }
  }

  function edit(row: Project) {
    Object.assign(form, row)
  }

  // removed; handled inline in UModal trigger

  function confirmDelete(project: Project) {
    toDelete.value = project
    showDelete.value = true
  }

  async function doDelete() {
    if (!toDelete.value) return
    deleting.value = true
    try {
      await store.remove(toDelete.value.id)
      if (form.id === toDelete.value.id) resetForm()
      bulkSelectedIds.value.delete(toDelete.value.id)
      toast.add({ title: `Project ${toDelete.value.code} verwijderd.`, color: 'success' })
    } finally {
      deleting.value = false
      showDelete.value = false
      toDelete.value = null
    }
  }

  async function doBulkArchive() {
    if (bulkSelectedIds.value.size === 0) return
    archiving.value = true
    try {
      const idsToArchive = Array.from(bulkSelectedIds.value)
      await store.bulkArchive(idsToArchive)
      toast.add({
        title: `${idsToArchive.length} project(en) gearchiveerd.`,
        color: 'success'
      })
      bulkSelectedIds.value.clear()
      showBulkArchive.value = false
    } finally {
      archiving.value = false
    }
  }

  await useAsyncData('projects', () => store.fetchAll())
</script>
