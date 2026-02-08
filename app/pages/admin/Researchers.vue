<template>
  <div>
    <UPageHeader title="Onderzoekers" />

    <div class="flex justify-end my-6">
      <UButton v-if="!showCreate" color="primary" icon="i-heroicons-plus" @click="showCreate = true"
        >Nieuwe onderzoeker</UButton
      >
    </div>

    <UCard v-if="showCreate" class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UInput v-model="createForm.email" placeholder="email@example.com" />
        <UInput v-model="createForm.full_name" placeholder="Naam" />
        <USelect
          v-model="createForm.contract"
          :items="contractOptions"
          label="Contract"
          placeholder="Kies contract..."
        />
        <USelect
          v-model="createForm.experience_bat"
          :items="experienceOptions"
          placeholder="Kies vleermuis ervaring..."
        />
        <UInput v-model="createForm.city" placeholder="Plaats" />
        <UInput v-model="createForm.address" placeholder="Straatnaam" />
      </div>
      <div class="mt-4"><UCheckbox v-model="createForm.admin" label="Admin" /></div>
      <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <UCheckbox v-model="createForm.dvp" label="DVP" />
        <UCheckbox v-model="createForm.fiets" label="Fiets" />
        <UCheckbox v-model="createForm.hub" label="HUB" />
        <UCheckbox v-model="createForm.wbc" label="WBC" />
        <UCheckbox v-model="createForm.smp_gierzwaluw" label="SMP gierzwaluw" />
        <UCheckbox v-model="createForm.smp_huismus" label="SMP huismus" />
        <UCheckbox v-model="createForm.smp_vleermuis" label="SMP vleermuis" />
        <UCheckbox v-model="createForm.vrfg" label="VR/FG" />
        <UCheckbox v-model="createForm.vleermuis" label="Vleermuis" />
        <UCheckbox v-model="createForm.roofvogel" label="Roofvogel" />
        <UCheckbox v-model="createForm.zwaluw" label="Zwaluw" />
        <UCheckbox v-model="createForm.zangvogel" label="Huismus/Spreeuw" />
        <UCheckbox v-model="createForm.langoor" label="Langoor" />
        <UCheckbox v-model="createForm.pad" label="Rugstreeppad" />
        <UCheckbox v-model="createForm.vlinder" label="Grote vos/Iepenpage" />
        <UCheckbox v-model="createForm.teunisbloempijlstaart" label="Teunisbloempijlstaart" />
        <UCheckbox v-model="createForm.biggenkruid" label="Biggenkruid" />
        <UCheckbox v-model="createForm.schijfhoren" label="Schijfhoren" />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <UButton color="neutral" variant="soft" @click="onCancelCreate">Annuleren</UButton>
        <UButton :loading="creating" icon="i-heroicons-check" @click="onCreate">Toevoegen</UButton>
      </div>
    </UCard>

    <UCard>
      <div class="mt-4 flex items-center gap-2">
        <UInput v-model="query" placeholder="Filter op naam" class="w-full" />
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="soft" @click="loadUsers" />
      </div>

      <div class="mt-6 space-y-3">
        <div v-for="u in filteredUsers" :key="u.id" class="border rounded-md border-gray-300">
          <div class="flex items-center justify-between px-3 py-2">
            <div class="flex items-center gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="xs"
                :icon="expanded.has(u.id) ? 'i-lucide-minus' : 'i-lucide-plus'"
                @click="toggle(u.id)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-400" @click="toggle(u.id)">{{
                headerText(u)
              }}</span>
            </div>
          </div>

          <div v-if="expanded.has(u.id)" class="px-3 pb-3 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UInput v-model="u.email" placeholder="E-mail" />
              <UInput v-model="u.full_name" placeholder="Naam" />
              <USelect
                v-model="u.contract"
                :items="contractOptions"
                label="Contract"
                placeholder="Kies..."
              />
              <USelect
                v-model="u.experience_bat"
                :items="experienceOptions"
                label="Ervaring (vleermuis)"
                placeholder="Kies..."
              />

              <UInput v-model="u.city" placeholder="Stad" />
              <UInput v-model="u.address" placeholder="Straat (optioneel)" />
            </div>
            <div><UCheckbox v-model="u.admin" label="Admin" /></div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <UCheckbox v-model="u.dvp" label="DVP" />
              <UCheckbox v-model="u.fiets" label="Fiets" />
              <UCheckbox v-model="u.hub" label="HUB" />
              <UCheckbox v-model="u.wbc" label="WBC" />
              <UCheckbox v-model="u.smp_gierzwaluw" label="SMP gierzwaluw" />
              <UCheckbox v-model="u.smp_huismus" label="SMP huismus" />
              <UCheckbox v-model="u.smp_vleermuis" label="SMP vleermuis" />
              <UCheckbox v-model="u.vrfg" label="VR/FG" />
              <UCheckbox v-model="u.vleermuis" label="Vleermuis" />
              <UCheckbox v-model="u.roofvogel" label="Roofvogel" />
              <UCheckbox v-model="u.zwaluw" label="Zwaluw" />
              <UCheckbox v-model="u.zangvogel" label="Huismus/Spreeuw" />
              <UCheckbox v-model="u.langoor" label="Langoor" />
              <UCheckbox v-model="u.pad" label="Rugstreeppad" />
              <UCheckbox v-model="u.vlinder" label="Grote vos/Iepenpage" />
              <UCheckbox v-model="u.teunisbloempijlstaart" label="Teunisbloempijlstaart" />
              <UCheckbox v-model="u.biggenkruid" label="Biggenkruid" />
              <UCheckbox v-model="u.schijfhoren" label="Schijfhoren" />
            </div>
            <div class="flex gap-2 justify-end">
              <UButton
                color="primary"
                :loading="savingId === u.id"
                icon="i-heroicons-check"
                @click="onSave(u)"
                >Opslaan</UButton
              >
              <UModal
                title="Verwijder onderzoeker"
                :close="{
                  class: 'rounded-full'
                }"
              >
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-heroicons-trash"
                  @click="confirmDelete(u)"
                  >Verwijder</UButton
                >
                <template #body>
                  <div class="font-semibold">Bevestig verwijderen</div>
                  <div>Dit kan niet ongedaan worden gemaakt. Weet je het zeker?</div>
                </template>
                <template #footer>
                  <div class="flex justify-end gap-2">
                    <UButton
                      color="error"
                      :loading="deleting"
                      icon="i-heroicons-trash"
                      @click="onDelete"
                      >Verwijderen</UButton
                    >
                  </div>
                </template>
              </UModal>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'admin' })

  type User = {
    id: number
    email: string
    full_name: string | null
    admin: boolean
    city: string | null
    address: string | null
    contract: 'Intern' | 'Flex' | 'ZZP' | undefined
    experience_bat: 'Junior' | 'Medior' | 'Senior' | undefined
    smp_huismus: boolean
    smp_vleermuis: boolean
    smp_gierzwaluw: boolean
    pad: boolean
    langoor: boolean
    roofvogel: boolean
    wbc: boolean
    fiets: boolean
    hub: boolean
    dvp: boolean
    vrfg: boolean
    vleermuis: boolean
    zwaluw: boolean
    vlinder: boolean
    teunisbloempijlstaart: boolean
    zangvogel: boolean
    biggenkruid: boolean
    schijfhoren: boolean
  }

  type UserCreate = Omit<User, 'id'>
  type UserUpdate = Partial<Omit<User, 'id'>>

  const { $api } = useNuxtApp()

  const users = ref<User[]>([])
  const query = ref('')
  const expanded = ref<Set<number>>(new Set())
  const creating = ref(false)
  const savingId = ref<number | null>(null)
  const deleting = ref(false)
  const toDelete = ref<User | null>(null)
  const showCreate = ref(false)
  const toast = useToast()

  const contractOptions = [
    { label: 'Intern', value: 'Intern' },
    { label: 'Flex', value: 'Flex' },
    { label: 'ZZP', value: 'ZZP' }
  ]
  const experienceOptions = [
    { label: 'Junior', value: 'Junior' },
    { label: 'Medior', value: 'Medior' },
    { label: 'Senior', value: 'Senior' }
  ]

  const createForm = reactive<UserCreate>({
    email: '',
    full_name: '',
    admin: false,
    city: '',
    address: '',
    contract: undefined,
    experience_bat: undefined,
    smp_huismus: false,
    smp_vleermuis: false,
    smp_gierzwaluw: false,
    pad: false,
    langoor: false,
    roofvogel: false,
    wbc: false,
    fiets: false,
    hub: false,
    dvp: false,
    vrfg: false,
    vleermuis: false,
    zwaluw: false,
    vlinder: false,
    teunisbloempijlstaart: false,
    zangvogel: false,
    biggenkruid: false,
    schijfhoren: false
  })

  const filteredUsers = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return users.value
    return users.value.filter(
      (u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  })

  function headerText(u: User): string {
    const tags: string[] = []
    if (u.experience_bat) tags.push(u.experience_bat)
    if (u.wbc) tags.push('WBC')
    if (u.smp_huismus) tags.push('SMP huismus')
    if (u.smp_vleermuis) tags.push('SMP vleermuis')
    if (u.smp_gierzwaluw) tags.push('SMP gierzwaluw')
    if (u.fiets) tags.push('Fiets')
    if (u.hub) tags.push('HUB')
    if (u.dvp) tags.push('DVP')
    if (u.vrfg) tags.push('VRFG')
    if (u.vleermuis) tags.push('Vleermuis')
    if (u.roofvogel) tags.push('Roofvogel')
    if (u.zwaluw) tags.push('Zwaluw')
    if (u.vlinder) tags.push('Vlinder')
    if (u.teunisbloempijlstaart) tags.push('Teunisbloempijlstaart')
    if (u.zangvogel) tags.push('Huismus/Spreeuw')
    if (u.langoor) tags.push('Langoor')
    if (u.pad) tags.push('Rugstreeppad')
    if (u.biggenkruid) tags.push('Biggenkruid')
    if (u.schijfhoren) tags.push('Schijfhoren')
    const name = u.full_name || u.email
    return `${name}${tags.length ? ' (' + tags.join(', ') + ')' : ''}`
  }

  function toggle(id: number): void {
    const s = new Set(expanded.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    expanded.value = s
  }

  async function loadUsers(): Promise<void> {
    users.value = (await $api<User[]>('/admin/users/all')).map((u) => ({
      ...u,
      contract: u.contract ?? undefined,
      experience_bat: u.experience_bat ?? undefined
    }))
    users.value.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }

  async function onCreate(): Promise<void> {
    creating.value = true
    try {
      const created = await $api<User>('/admin/users', { method: 'POST', body: createForm })
      users.value.push({
        ...created,
        contract: created.contract ?? undefined,
        experience_bat: created.experience_bat ?? undefined
      })
      users.value.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
      Object.assign(createForm, {
        email: '',
        full_name: '',
        admin: false,
        city: '',
        address: '',
        contract: undefined,
        experience_bat: undefined,
        smp_huismus: false,
        smp_vleermuis: false,
        smp_gierzwaluw: false,
        pad: false,
        langoor: false,
        roofvogel: false,
        wbc: false,
        fiets: false,
        hub: false,
        dvp: false,
        vrfg: false,
        vleermuis: false,
        zwaluw: false,
        vlinder: false,
        teunisbloempijlstaart: false,
        zangvogel: false,
        biggenkruid: false,
        schijfhoren: false
      })
      showCreate.value = false
      toast.add({ title: 'Onderzoeker opgeslagen', color: 'success' })
    } catch (err: unknown) {
      const e = err as { response?: { _data?: { detail?: string }; status?: number } }
      const detail = e.response?._data?.detail
      if (e.response?.status === 409 || detail === 'email_already_exists') {
         toast.add({ title: 'Dit e-mailadres is al in gebruik.', color: 'error' })
      } else {
         toast.add({ title: 'Onderzoeker kon niet worden opgeslagen', color: 'error' })
      }
    } finally {
      creating.value = false
    }
  }

  function onCancelCreate(): void {
    showCreate.value = false
  }

  async function onSave(u: User): Promise<void> {
    savingId.value = u.id
    try {
      const { id: _ignore, ...rest } = u
      const payload: UserUpdate = { ...rest }
      const updated = await $api<User>(`/admin/users/${u.id}`, { method: 'PATCH', body: payload })
      const idx = users.value.findIndex((x) => x.id === u.id)
      if (idx >= 0) users.value[idx] = updated
      toast.add({ title: 'Onderzoeker opgeslagen', color: 'success' })
      const next = new Set(expanded.value)
      next.delete(u.id)
      expanded.value = next
    } catch (err: unknown) {
      const e = err as { response?: { _data?: { detail?: string }; status?: number } }
      const detail = e.response?._data?.detail
      if (e.response?.status === 409 || detail === 'email_already_exists') {
         toast.add({ title: 'Dit e-mailadres is al in gebruik.', color: 'error' })
      } else {
         toast.add({ title: 'Opslaan mislukt', color: 'error' })
      }
    } finally {
      savingId.value = null
    }
  }

  function confirmDelete(u: User): void {
    toDelete.value = u
  }

  async function onDelete(): Promise<void> {
    if (!toDelete.value) return
    deleting.value = true
    try {
      await $api(`/admin/users/${toDelete.value.id}`, { method: 'DELETE' })
      users.value = users.value.filter((x) => x.id !== toDelete.value!.id)
      toDelete.value = null
      toast.add({ title: 'Onderzoeker verwijderd', color: 'success' })
    } finally {
      deleting.value = false
    }
  }

  onMounted(loadUsers)
</script>
