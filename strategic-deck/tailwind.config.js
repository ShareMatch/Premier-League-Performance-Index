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
                    dark: '#064e3b', // emerald-900
                    DEFAULT: '#10b981', // emerald-500
                    accent: '#f59e0b', // amber-500
                    gold: '#fbbf24', // amber-400
                    cream: '#FDFBF7',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Playfair Display', 'serif'],
            },
        },
    },
    plugins: [],
}
