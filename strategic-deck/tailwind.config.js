/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    emerald900: '#064e3b',
                    emerald500: '#10b981',
                    cream: '#FDFBF7',
                    amber500: '#f59e0b',
                    amber400: '#fbbf24',
                    // Legacy support
                    dark: '#064e3b',
                    DEFAULT: '#10b981',
                    accent: '#f59e0b',
                    gold: '#fbbf24',
                },
                gray: {
                    50: '#F9FAFB',
                    200: '#E5E5E5', // Input background
                    900: '#111827',
                }
            },
            borderRadius: {
                'modal': '40px',
                'pill': '9999px',
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.08)',
                'heavy': '0 4px 12px rgba(0,0,0,0.10)',
                'glow': '0 0 15px rgba(16,185,129,0.3)',
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(180deg, #019170 15.25%, #3AA189 49.58%, #019170 83.9%)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
