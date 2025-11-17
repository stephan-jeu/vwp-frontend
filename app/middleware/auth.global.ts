export default defineNuxtRouteMiddleware(async (to) => {
  // Allow unauthenticated access to login and OAuth callback pages
  const publicPaths = ['/login', '/auth/callback']
  if (publicPaths.includes(to.path)) {
    return
  }

  // Run only on client since tokens are stored in localStorage
  if (import.meta.server) return

  const accessToken = localStorage.getItem('access_token')
  if (!accessToken) {
    return navigateTo('/login')
  }

  // For all routes, validate the token by loading identity. If invalid/expired,
  // the $api plugin will attempt refresh and redirect to /login on failure.
  const { useAuthStore } = await import('~~/stores/auth')
  const auth = useAuthStore()
  await auth.ensureLoaded()
  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  // If navigating to admin routes, ensure the user is admin
  if (to.path.startsWith('/admin')) {
    if (!auth.isAdmin) {
      return navigateTo('/')
    }
  }
})
