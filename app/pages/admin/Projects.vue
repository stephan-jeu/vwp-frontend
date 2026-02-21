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
    { accessorKey: 'code', header: 'Projectcode' },
    { accessorKey: 'location', header: 'Locatie' },
    { accessorKey: 'customer', header: 'Klant' },
    { id: 'quote', header: 'Offerte' },
    { id: 'google', header: 'Google Drive' },
    { id: 'actions', header: '' }
  ]

  const rows = computed(() => store.projects)

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
      toast.add({ title: `Project ${toDelete.value.code} verwijderd.`, color: 'success' })
    } finally {
      deleting.value = false
      showDelete.value = false
      toDelete.value = null
    }
  }

  await useAsyncData('projects', () => store.fetchAll())
</script>
