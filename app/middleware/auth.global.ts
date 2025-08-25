export default defineNuxtRouteMiddleware(async (to) => {
    const { data } = await useFetch('/api/auth/me', {
        headers: process ? useRequestHeaders(['cookie']) : {},
    })
    const me = data.value

    // block / path for unauthorized users
    if (!to.path.startsWith('/auth') && !me?.confirmed) {
        return navigateTo('/auth')
    }
})