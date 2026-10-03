// Vite config: React plugin, the "@" alias for imports from src, and local serving of /api functions.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

/**
 * Serves the Vercel functions from /api during `npm run dev`, so the frontend
 * talks to the real database locally without the Vercel CLI.
 * Adds the small subset of the Vercel request/response helpers the handlers use.
 */
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const file = `.${url.pathname}.js`;
        if (!existsSync(file)) return next();
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (body) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        try {
          const handler = (await server.ssrLoadModule(file)).default;
          await handler(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make DATABASE_URL and other secrets from .env available to the local API handlers.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), localApi()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
