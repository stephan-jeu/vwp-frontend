// When a new deployment happens while the user has the page open, old JS tries to
// lazy-load chunks that no longer exist (different content hashes). This causes
// vite:preloadError and breaks navigation. Reload the page to pick up new assets.
export default defineNuxtPlugin(() => {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload()
  })
})
