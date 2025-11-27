import { defineStore } from 'pinia'

interface TestModeState {
  simulatedDate: string | null
}

export const useTestModeStore = defineStore('testMode', {
  state: (): TestModeState => ({
    simulatedDate: null
  }),
  actions: {
    setSimulatedDate(value: string | null): void {
      this.simulatedDate = value
    },
    reset(): void {
      this.simulatedDate = null
    }
  }
})
