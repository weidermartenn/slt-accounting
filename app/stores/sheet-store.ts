import { defineStore } from 'pinia'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types'
import type { TransportAccountingSR } from '~/entities/TransportAccountingSaveRequestDto/types'
import type { TransportAccountingUpdateDto, TransportAccountingUpdateRequest } from '~/entities/TransportAccountingUpdateREquest/types'

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
                const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
                const data = await $fetch<TransportAccounting[]>('/api/worktable/user-worktable-records', { headers })
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
                const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
                const data = await $fetch<TransportAccounting[]>('/api/worktable/admin-worktable-records', { headers })
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
        async addMany(dtos: TransportAccountingSR[]) {
            if (!Array.isArray(dtos) || dtos.length === 0) return 
            await $fetch('/api/worktable/record-add', {
                method: 'POST',
                body: dtos
            })
        },
        async updateMany(dtos: TransportAccountingUpdateDto[]) {
            if (!Array.isArray(dtos) || dtos.length === 0) return 
            const body: TransportAccountingUpdateRequest = {
                transportAccountingSaveRequestDtos: dtos
            }
            await $fetch('/api/worktable/record-update', {
                method: 'PATCH',
                body
            })
        },
        async upsertOne(dto: TransportAccountingSR) {
            if (Number(dto?.id) > 0) {
                const body: TransportAccountingUpdateRequest = {
                    transportAccountingSaveRequestDtos: [dto]
                }
                await $fetch('/api/worktable/record-update', {
                    method: 'PATCH',
                    body
                })
            } else {
                await $fetch('/api/worktable/record-add', {
                    method: 'POST',
                    body: [dto]
                })
            }
        },
        async deleteByIds(ids: number[]) {
            if (!Array.isArray(ids) || ids.length === 0) return 
            await $fetch('/api/worktable/record-delete', {
                method: 'DELETE',
                body: ids
            })
        }
    }
})