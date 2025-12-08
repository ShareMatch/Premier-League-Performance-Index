import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          // Ignore watching these directories
          ignored: ['**/node_modules/**', '**/strategic-deck/**', '**/.git/**'],
        },
      },
      plugins: [react()],
      optimizeDeps: {
        // Pre-bundle these for faster startup
        include: ['react', 'react-dom', 'lucide-react'],
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
