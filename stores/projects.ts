import { defineStore } from 'pinia'

export interface Project {
  id: number
  code: string
  location: string
  google_drive_folder: string | null
}

export interface ProjectCreate {
  code: string
  location: string
  google_drive_folder?: string | null
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
      const created = await $api<Project>('/projects', { method: 'POST', body: payload })
      this.projects.push(created)
      return created
    },
    async update(id: number, payload: ProjectCreate) {
      const { $api } = useNuxtApp()
      const updated = await $api<Project>(`/projects/${id}`, { method: 'PUT', body: payload })
      const idx = this.projects.findIndex((p) => p.id === id)
      if (idx !== -1) this.projects[idx] = updated
      if (this.selected?.id === id) this.selected = updated
      return updated
    },
    async remove(id: number) {
      const { $api } = useNuxtApp()
      await $api<void>(`/projects/${id}`, { method: 'DELETE' })
      this.projects = this.projects.filter((p) => p.id !== id)
      if (this.selected?.id === id) this.selected = null
    }
  }
})
