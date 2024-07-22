// vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    server: {
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
        https: true // Włączenie obsługi HTTPS
    },
    optimizeDeps: {
        exclude: ['onnxruntime-web']
    },
    build: {
        commonjsOptions: {
            include: [/onnxruntime-web/, /node_modules/]
        }
    },
    assetsInclude: ['**/*.wasm'],
    plugins: [
        basicSsl(),
        {
            name: 'configure-response-headers',
            configureServer: (server) => {
                server.middlewares.use((_req, res, next) => {
                    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    next();
                });
            },
        },
    ],
});
