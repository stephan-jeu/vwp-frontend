<template>
  <div>
    <UPageHeader title="Projecten" />

    <UCard class="mt-6">
      <UForm :state="form" :schema="schema" data-testid="project-form" @submit="onSubmit">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <UFormField label="Google Drive folder" name="google_drive_folder">
            <UInput
              v-model="form.google_drive_folder"
              placeholder="Optioneel"
              data-testid="input-gdrive"
              class="w-72"
            />
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
          <UModal
            v-model:open="showDelete"
            title="Project verwijderen"
            description="Verwijdert een project met alle onderliggende clusters en bezoeken"
            data-testid="delete-modal"
          >
            <UButton
              color="warning"
              variant="ghost"
              size="xl"
              :data-testid="`btn-delete-${row.original?.id}`"
              @click.stop="toDelete = row.original"
            >
              <UIcon name="i-lucide-trash-2" />
            </UButton>
            <template #content>
              <UCard>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-alert-triangle" class="text-amber-500" />
                  <h3 class="text-lg font-medium">Project verwijderen</h3>
                </div>
                <p class="mt-2">
                  Weet je zeker dat je project {{ row.original.code }} wilt verwijderen? Als je dit
                  doet zullen ook alle onderliggende clusters en bezoeken worden verwijderd.
                </p>
                <div class="mt-6 flex justify-end gap-2">
                  <UButton
                    variant="ghost"
                    data-testid="btn-modal-cancel"
                    @click="showDelete = false"
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
        </template>
      </UTable>
    </UCard>
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
  const toast = useToast()

  const schema = z.object({
    code: z.string().min(1, 'Verplicht'),
    location: z.string().min(1, 'Verplicht'),
    google_drive_folder: z.string().nullable().optional()
  })

  type FormState = {
    id?: number
    code: string
    location: string
    google_drive_folder: string | null
  }

  const form = reactive<FormState>({ code: '', location: '', google_drive_folder: null })
  const isEditing = computed(() => !!form.id)

  const columns: TableColumn<Project>[] = [
    { accessorKey: 'code', header: 'Projectcode' },
    { accessorKey: 'location', header: 'Locatie' },
    { id: 'google', header: 'Google Drive' },
    { id: 'actions', header: '' }
  ]

  const rows = computed(() => store.projects)

  function resetForm() {
    Object.assign(form, { id: undefined, code: '', location: '', google_drive_folder: null })
  }

  async function onSubmit() {
    saving.value = true
    try {
      const payload: ProjectCreate = {
        code: form.code,
        location: form.location,
        google_drive_folder: form.google_drive_folder ?? null
      }
      if (isEditing.value && form.id) {
        await store.update(form.id, payload)
        toast.add({ title: `Project ${payload.code} bewerkt.`, color: 'success' })
      } else {
        const created = await store.create(payload)
        // Reset form on successful create and show toast
        const addedCode = created.code
        toast.add({ title: `Project ${addedCode} toegevoegd.`, color: 'success' })
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

  async function doDelete() {
    if (!toDelete.value) return
    deleting.value = true
    try {
      await store.remove(toDelete.value.id)
      if (form.id === toDelete.value.id) resetForm()
      toast.add({ title: `Project ${toDelete.value.code} verwijderd.`, color: 'success' })
    } finally {
      deleting.value = false
      showDelete.value = false
      toDelete.value = null
    }
  }

  await useAsyncData('projects', () => store.fetchAll())
</script>
