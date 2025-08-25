export default defineEventHandler((event) => {
    deleteCookie(event, 'access_token', { path: '/'})
    deleteCookie(event, 'u', { path: '/' })
    return { ok: true }
})