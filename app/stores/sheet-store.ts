import { defineStore } from 'pinia'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types'

export const useSheetStore = defineStore('sheet', {
    state: () => ({
        records: {} as Record<string, TransportAccounting[]>,
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
                const data = await $fetch<TransportAccounting[]>('/api/worktable/user-worktable-records', {
                    headers: process ? useRequestHeaders(['cookie']) : undefined
                })
                // @ts-ignore
                const obj = data?.object ?? data?.body?.object ?? {}
                this.records = { ...obj }
            } catch (e: any) {
                this.error = e?.data?.statusMessage || e?.message || 'Ошибка загрузки'
                throw e
            } finally {
                this.loading = false
            }
        },
        async fetchAllRoleAdmin() {
            this.loading = true
            this.error = ''
            try {
                const data = await $fetch<TransportAccounting[]>('/api/worktable/admin-worktable-records', {
                    headers: process ? useRequestHeaders(['cookie']) : undefined
                })
                // @ts-ignore
                const obj = data?.object ?? data?.body?.object ?? {}
                this.records = { ...obj }
            } catch (e: any) {
                this.error = e?.data?.statusMessage || e?.message || 'Ошибка загрузки'
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})