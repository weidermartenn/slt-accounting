export default defineNuxtRouteMiddleware(async (to) => {
    const me = await $fetch<{ confirmed?: boolean } | null>('/api/auth/me', {
        headers: process ? useRequestHeaders(['cookie']) : undefined
    })
    const confirmed = !!me?.confirmed

    if (to.path.startsWith('/auth')) {
        if (confirmed && to.path !== '/') return navigateTo('/')
        return
    }

    if (!confirmed && to.path !== '/auth') {
        return navigateTo('/auth')
    }
})