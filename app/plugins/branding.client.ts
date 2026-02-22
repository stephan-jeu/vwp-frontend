import { generatePalette } from '~/utils/colors'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const primaryColor = config.public.brandColorPrimary

    if (primaryColor && typeof primaryColor === 'string' && primaryColor.trim() !== '') {
        try {
            const palette = generatePalette(primaryColor)

            const root = document.documentElement
            Object.entries(palette).forEach(([step, hex]) => {
                root.style.setProperty(`--color-brand-${step}`, hex)
                root.style.setProperty(`--ui-color-primary-${step}`, hex)
            })

            // Also set --ui-primary directly (shade 500 for light, 400 for dark)
            // matching Nuxt UI's convention from its colors plugin
            root.style.setProperty('--ui-primary', palette[500] ?? null)
        } catch (e) {
            console.warn('Failed to generate brand palette:', e)
        }
    }
})
