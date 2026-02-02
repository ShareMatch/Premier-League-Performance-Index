import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./index.tsx",
        "./App.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
        "./data/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        screens: {
            'xs': '480px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        extend: {
            colors: {
                brand: {
                    emerald900: '#005430',
                    emerald500: '#005430',
                    // White button tokens (centralised so button color can be changed here)
                    whiteButtonBg: '#2e3742',
                    whiteButtonText: '#FFFFFF',
                    cream: '#FDFBF7',
                    amber500: '#f59e0b',
                    amber400: '#fbbf24',
                    // Legacy support
                    dark: '#005430',
                    DEFAULT: '#005430',
                    accent: '#f59e0b',
                    gold: '#fbbf24',
                    primary: '#078651',
                
                },
                // Override Tailwind's default gray-200 for input backgrounds
                gray: {
                    200: '#E5E5E5', // Input backgrounds (per brand guidelines)
                },
                modal: {
                    outer: '#042222', // Modal outer background (use with bg-opacity)
                    inner: '#021A1A', // Modal inner form container
                    notice: '#0F2222', // Security notice background
                }
            },
            borderRadius: {
                'modal': '40px',
                'pill': '9999px',
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.08)',
                'heavy': '0 4px 12px rgba(0,0,0,0.10)',
                'glow': '0 0 15px rgba(0, 84, 48, 0.3)',
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(180deg, #005430 15.25%, #005430 49.58%, #005430 83.9%)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [
        plugin(function({ addUtilities }) {
            addUtilities({
                '.text-gradient-primary': {
                    'background-image': 'linear-gradient(180deg, #00A060 0%, #007848 50%, #005430 100%)',
                    '-webkit-background-clip': 'text',
                    'background-clip': 'text',
                    'color': 'transparent',
                },
                // Safe area utilities for mobile devices with notches
                '.safe-area-inset-bottom': {
                    'padding-bottom': 'env(safe-area-inset-bottom)',
                },
                '.safe-area-inset-top': {
                    'padding-top': 'env(safe-area-inset-top)',
                },
                '.safe-area-inset-left': {
                    'padding-left': 'env(safe-area-inset-left)',
                },
                '.safe-area-inset-right': {
                    'padding-right': 'env(safe-area-inset-right)',
                },
            });
        }),
    ],
}
