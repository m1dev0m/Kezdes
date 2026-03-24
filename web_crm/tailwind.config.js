import { colors, fontFamily, fontSize, fontWeight, spacing, radii, shadows } from './src/tokens';

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                ...colors,
                primary: 'var(--color-primary)',
                success: 'var(--success)',
                warning: 'var(--warning)',
                danger: 'var(--danger)',
                bg: {
                    primary: 'var(--bg-primary)',
                    surface: 'var(--bg-surface)'
                },
                brand: {
                    green: 'var(--color-primary)',
                    cream: 'var(--bg-primary)',
                }
            },
            fontFamily: {
                ...fontFamily,
                sans: ['Inter', 'sans-serif'],
            },
            spacing: {
                ...spacing,
                'card': 'var(--card-padding)',
                'gap': 'var(--gap)',
            },
            borderRadius: {
                ...radii,
                'card': 'var(--border-radius)',
            },
            boxShadow: shadows,
        },
    },
    plugins: [],
}
