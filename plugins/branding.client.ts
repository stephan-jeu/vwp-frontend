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
            })

            // Update the 950 step specifically? 
            // The generator handles it, but let's ensure it overrides existings.
        } catch (e) {
            console.warn('Failed to generate brand palette:', e)
        }
    }
})
