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
        const res: any = await $fetch(`${kingsApiBase}/user/loginByCodeConfirmation`, {
            method: 'POST',
            body: { login: body.login, confirmToken: body.confirmToken }
        })

        // @ts-ignore
        const token = res?.object?.jwtToken

        // @ts-ignore
        const user = res?.object?.user

        console.log(res?.object);

        if (token) {
            setCookie(event, 'access_token', token, {
                httpOnly: true, sameSite: 'lax', path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            })
        }

        if (user) {
            const minimal = { id: user.id, confirmed: !!user.confirmed, roleCode: user.role?.code ?? null, token: token }
            setCookie(event, 'u', Buffer.from(JSON.stringify(minimal)).toString('base64'), {
                httpOnly: true, sameSite: 'lax', path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            })
        }
        
        return res
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка отправки кода',
            data: e?.data
        })
    }
})