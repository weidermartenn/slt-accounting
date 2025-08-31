import type { H3Event } from "h3";

export default defineEventHandler(async (event: H3Event) => {
    const {
        public: { sltApiBase },
    } = useRuntimeConfig();

    if (!sltApiBase) {
        throw createError({
            statusCode: 500,
            statusMessage: "sltApiBase не указан",
        });
    }

    const id = await readBody<number[]>(event)

    try {
        return await $fetch(`${sltApiBase}/workTable/transportAccounting`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` },
            body: id
        })
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка',
            data: e?.data
        })
    }
})