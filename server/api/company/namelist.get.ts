export default defineEventHandler(async (event) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    if (!sltApiBase) {
        throw createError({ statusCode: 500, statusMessage: 'sltApiBase не указан' })
    }

    try {
        return await $fetch(`${sltApiBase}/company/nameList`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` }
        })
    } catch (e: any) {
        throw createError({
            statusCode: e.status || 500,
            message: e.data.message || 'Ошибка при получении списка компаний',
            data: e.data
        })
    }
})