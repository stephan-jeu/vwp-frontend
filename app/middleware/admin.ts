export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const token = localStorage.getItem('access_token')
  if (!token) return navigateTo('/login')

  const { useAuthStore } = await import('~~/stores/auth')
  const auth = useAuthStore()
  await auth.ensureLoaded()
  if (!auth.isAdmin) {
    return navigateTo('/')
  }
})
