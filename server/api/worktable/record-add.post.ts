import type { TransportAccountingSR } from '~/entities/TransportAccountingSaveRequestDto/types'

export default defineEventHandler(async (event) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    if (!sltApiBase) {
        throw createError({ statusCode: 500, statusMessage: 'sltApiBase не указан' })
    }

    type Body = { data: TransportAccountingSR }
    const body = await readBody<Body>(event)

    try {
        return await $fetch(`${sltApiBase}/workTable/transportAccounting`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` },
            body: body
        })
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка',
            data: e?.data
        })
    }
})