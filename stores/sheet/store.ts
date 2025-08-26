import { defineStore } from 'pinia'
import type { transportAccounting } from '~/entities/TransportAccountingDto/types'

export const useSheetStore = defineStore('sheet', {
    state: () => ({
        records: {} as Record<string, transportAccounting[]>,
        loading: false,
        error: '' as string | null
    }),

    getters: {
        periods: (state) => Object.keys(state.records),
        entries: (state) => Object.entries(state.records)
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = ''
            try {
                console.log("Начало")
                const data = await $fetch<transportAccounting[]>('/api/admin/records', {
                    headers: process ? useRequestHeaders(['cookie']) : undefined
                })
                console.log("data: ", data)
                // @ts-ignore
                const obj = data?.object ?? data?.body?.object ?? {}
                console.log("obj: ", obj)
                this.records = { ...obj }
                console.log("this.records: ", this.records)
                console.log("Конец")
            } catch (e: any) {
                this.error = e?.data?.statusMessage || e?.message || 'Ошибка загрузки'
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})