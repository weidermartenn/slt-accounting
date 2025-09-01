export default defineEventHandler((event) => {
    const raw = getCookie(event, 'u')
    if (!raw) return null
    try {
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
            confirmed: boolean, roleCode: string | null, id: number
        }
    } catch {
        return null
    }
})