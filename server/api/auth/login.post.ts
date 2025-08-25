export default defineEventHandler(async (event) => {
    const { public: { kingsApiBase } } = useRuntimeConfig()

    if (!kingsApiBase) {
        throw createError({ statusCode: 500, statusMessage: 'kingsApiBase не указан' })
    }
    
    type Body = { login: string; confirmToken?: string } 
    const body = await readBody<Body>(event)

    if (!body?.login) {
        throw createError({ statusCode: 400, statusMessage: 'Логин (телефон) не указан' })
    }

    // 1 step - get code
    if (!body.confirmToken) {
        try {
            const res = await $fetch(`${kingsApiBase}/user/loginByCode`, {
                method: 'POST',
                body: { login: body.login }
            })
            return res
        } catch (e: any) {
            throw createError({
                statusCode: e?.status || 500,
                statusMessage: e?.data?.message || 'Произошла ошибка получения кода',
                data: e?.data
            })
        }
    }

    // 2 step - confirm code
    try {
        const res = await $fetch(`${kingsApiBase}/user/loginByCodeConfirmation`, {
            method: 'POST',
            body: { login: body.login, confirmToken: body.confirmToken }
        })
        
        return res
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка отправки кода',
            data: e?.data
        })
    }
})