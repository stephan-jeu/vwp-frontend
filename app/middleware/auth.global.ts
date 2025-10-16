export default defineNuxtRouteMiddleware((to) => {
  // Allow unauthenticated access to login and OAuth callback pages
  const publicPaths = ['/login', '/auth/callback']
  if (publicPaths.includes(to.path)) {
    return
  }

  // Run only on client since tokens are stored in localStorage
  if (process.server) return

  const accessToken = localStorage.getItem('access_token')
  if (!accessToken) {
    return navigateTo('/login')
  }
})
