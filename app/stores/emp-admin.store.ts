import { defineStore } from 'pinia'
import type { UserDto } from '~/entities/UserDto/types'

export const useEmployeeAdminStore = defineStore('employee', {
    state: () => ({
        employees: [] as UserDto[],
        loading: false,
        error: '' as string | null,
    }),

    actions: {
        async fetchEmployees() {
            this.loading = true
            this.error = ''
            try {
                const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
                const data = await $fetch<UserDto[]>('/api/admin/employees-records', { headers })
                // @ts-ignore
                this.employees = data.object
                console.log(data)
            } catch (e: any) {
                this.error = e?.data?.statusMessage || e?.message || 'Ошибка загрузки'
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})

