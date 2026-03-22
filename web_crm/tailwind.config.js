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
                brand: {
                    green: '#1A3C34', // Deep Elegant Green
                    gold: '#C5A059',  // Sophisticated Gold
                    cream: '#FDFBF7', // Soft Cream
                    accent: '#E9E3D5'
                }
            },
            fontFamily: {
                ...fontFamily,
                serif: ['Playfair Display', 'serif'],
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            spacing,
            borderRadius: radii,
            boxShadow: shadows,
        },
    },
    plugins: [],
}
