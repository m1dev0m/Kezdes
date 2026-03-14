export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": {
                    DEFAULT: "#4F46E5", // Indigo 600
                    light: "#6366F1",   // Indigo 500
                    dark: "#4338CA",    // Indigo 700
                },
                "slate": {
                    50: "#F8FAFC",
                    100: "#F1F5F9",
                    200: "#E2E8F0",
                    300: "#CBD5E1",
                    400: "#94A3B8",
                    500: "#64748B",
                    600: "#475569",
                    700: "#334155",
                    800: "#1E293B",
                    900: "#0F172A",
                    950: "#020617",
                }
            },
            fontFamily: {
                "sans": ["'Inter'", "system-ui", "sans-serif"],
            },
            borderRadius: {
                "sm": "0.375rem",
                "md": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.25rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
            boxShadow: {
                "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                "DEFAULT": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                "card": "0 0 0 1px rgb(0 0 0 / 0.05), 0 2px 4px rgb(0 0 0 / 0.05)",
                "premium": "0 10px 40px -10px rgb(0 0 0 / 0.08), 0 0 20px -5px rgb(0 0 0 / 0.04)",
                "premium-hover": "0 20px 40px -10px rgb(0 0 0 / 0.12), 0 0 20px -5px rgb(0 0 0 / 0.08)",
            },
        },
    },
    plugins: [],
}
