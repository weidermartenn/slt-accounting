import { defineStore } from 'pinia'
import type { Employee } from '~/entities/Employee/types' 

export const useEmployeeStore = defineStore('employee', {
    state: () => ({
        employees: [] as Employee[],
        loading: false,
        error: '' as string | null,
    }),

    actions: {
        async fetchEmployees() {
            this.loading = true
            this.error = ''
            try {
                const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
                const data = await $fetch<Employee[]>('/api/employee/namelist', { headers })
                this.employees = data
            } catch (e: any) {
                this.error = e?.data?.statusMessage || e?.message || 'Ошибка загрузки'
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})

