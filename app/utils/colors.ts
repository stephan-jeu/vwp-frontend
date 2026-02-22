/**
 * Generates a Tailwind-like color palette (50-950) from a single hex color.
 * Simplified approach:
 * - Converts HEX to HSL
 * - Adjusts Lightness for each stop
 * - Converts back to HEX
 */

export type Palette = Record<number, string>

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    let r = 0,
        g = 0,
        b = 0
    if (hex.length === 4) {
        r = parseInt('0x' + hex[1] + hex[1])
        g = parseInt('0x' + hex[2] + hex[2])
        b = parseInt('0x' + hex[3] + hex[3])
    } else if (hex.length === 7) {
        r = parseInt('0x' + hex[1] + hex[2])
        g = parseInt('0x' + hex[3] + hex[4])
        b = parseInt('0x' + hex[5] + hex[6])
    }

    r /= 255
    g /= 255
    b /= 255
    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin
    let h = 0,
        s = 0,
        l = 0

    if (delta === 0) h = 0
    else if (cmax === r) h = ((g - b) / delta) % 6
    else if (cmax === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4

    h = Math.round(h * 60)
    if (h < 0) h += 360
    l = (cmax + cmin) / 2
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    s = +(s * 100).toFixed(1)
    l = +(l * 100).toFixed(1)

    return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100
    l /= 100
    const c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2
    let r = 0,
        g = 0,
        b = 0

    if (0 <= h && h < 60) {
        r = c
        g = x
        b = 0
    } else if (60 <= h && h < 120) {
        r = x
        g = c
        b = 0
    } else if (120 <= h && h < 180) {
        r = 0
        g = c
        b = x
    } else if (180 <= h && h < 240) {
        r = 0
        g = x
        b = c
    } else if (240 <= h && h < 300) {
        r = x
        g = 0
        b = c
    } else if (300 <= h && h < 360) {
        r = c
        g = 0
        b = x
    }
    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)

    const toHex = (n: number) => {
        const hex = n.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    return '#' + toHex(r) + toHex(g) + toHex(b)
}

export function generatePalette(baseHex: string): Palette {
    const { h, s } = hexToHsl(baseHex)

    // Map lightness to tailwind steps.
    // We assume the input color represents the 500 or 600 step roughly.
    // But to be consistent, we can just generate a full scale based on Lightness.
    // 50 is very light (L ~ 95), 950 is very dark (L ~ 10).
    // We keep Hue and Saturation constant for this simple generator.

    const steps: Record<number, number> = {
        50: 95,
        100: 90,
        200: 80,
        300: 70,
        400: 60,
        500: 50,
        600: 40,
        700: 30,
        800: 20,
        900: 10,
        950: 5
    }

    // If the user provides a very light or very dark color, this simple scale might look weird.
    // But for a brand color (usually primary), this linear lightness scale usually works "okay".
    // A better approach would be to mix with white/black, but HSL L-manipulation is often enough.

    const palette: Palette = {}

    // We can try to mix the base color into the scale if we want it to be *exactly* present.
    // For now, let's just generate a fresh scale from the Hue/Sat of the input.

    for (const [step, targetL] of Object.entries(steps)) {
        palette[Number(step)] = hslToHex(h, s, targetL)
    }

    // Override the 500 or closest step with exact color? 
    // Maybe better not to, to keep the gradient smooth.
    // But typically 500 or 600 is the primary action color.

    return palette
}
