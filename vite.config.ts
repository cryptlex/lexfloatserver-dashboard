import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        paraglideVitePlugin({
            project: './project.inlang',
            outdir: './src/paraglide',
            outputStructure: 'message-modules',
            cookieName: 'PARAGLIDE_LOCALE',
            localStorageKey: 'PARAGLIDE_LOCALE',
            strategy: ['cookie', 'localStorage', 'preferredLanguage', 'baseLocale'],
        }),
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
            routesDirectory: 'src/routes',
            generatedRouteTree: 'src/routeTree.gen.ts',
            tmpDir: '.tanstack',
        }),
        viteReact(),
        tailwindcss(),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:8090',
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000,
    },
});
