import { defineStore } from 'pinia'

export interface Project {
  id: number
  code: string
  location: string
  customer: string | null
  google_drive_folder: string | null
  quote: boolean
}

export interface ProjectCreate {
  code: string
  location: string
  customer?: string | null
  google_drive_folder?: string | null
  quote?: boolean
}

interface State {
  projects: Project[]
  loading: boolean
  error: string | null
  selected: Project | null
}

export const useProjectsStore = defineStore('projects', {
  state: (): State => ({ projects: [], loading: false, error: null, selected: null }),
  actions: {
    setSelected(project: Project | null) {
      this.selected = project
    },
    async fetchAll() {
      const { $api } = useNuxtApp()
      this.loading = true
      this.error = null
      try {
        const data = await $api<Project[]>('/projects')
        this.projects = data
      } catch (e: unknown) {
        this.error = 'Kon projecten niet laden'
        throw e
      } finally {
        this.loading = false
      }
    },
    async create(payload: ProjectCreate) {
      const { $api } = useNuxtApp()
      const created = await $api<Project>('/projects', {
        method: 'POST',
        body: { ...payload, quote: payload.quote ?? false }
      })
      this.projects.push(created)
      return created
    },
    async update(id: number, payload: ProjectCreate) {
      const { $api } = useNuxtApp()
      const updated = await $api<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: { ...payload, quote: payload.quote ?? false }
      })
      const idx = this.projects.findIndex((p) => p.id === id)
      if (idx !== -1) this.projects[idx] = updated
      if (this.selected?.id === id) this.selected = updated
      return updated
    },
    async remove(id: number) {
      const { $api } = useNuxtApp()
      await $api<unknown>(`/projects/${id}`, { method: 'DELETE' })
      this.projects = this.projects.filter((p) => p.id !== id)
      if (this.selected?.id === id) this.selected = null
    },
    async bulkArchive(ids: number[]) {
      const { $api } = useNuxtApp()
      await $api<{ archived_projects: number }>('/projects/bulk-archive', {
        method: 'POST',
        body: { project_ids: ids }
      })
      this.projects = this.projects.filter((p) => !ids.includes(p.id))
      if (this.selected && ids.includes(this.selected.id)) {
        this.selected = null
      }
    }
  }
})
