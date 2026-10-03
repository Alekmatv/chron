// Vite config: React plugin, PWA (manifest + service worker), the "@" alias for imports from src,
// and local serving of /api functions.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

/**
 * Serves the Vercel functions from /api during `npm run dev`, so the frontend
 * talks to the real database locally without the Vercel CLI.
 * Adds the small subset of the Vercel request/response helpers the handlers use.
 */
function localApi() {
  /** Middleware that runs an /api handler; loadModule imports the handler file. */
  const apiMiddleware = (loadModule) => async (req, res, next) => {
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
      const handler = (await loadModule(file)).default;
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(apiMiddleware((file) => server.ssrLoadModule(file)));
    },
    // `vite preview` serves the production build (with the service worker), used to test offline mode.
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware((file) => import(pathToFileURL(file).href)));
    },
  };
}

/** Cache names shared with the app code (Safety Pack writes map tiles into the same cache). */
const MAP_TILES_CACHE = 'chron-map-tiles';

/** Progressive Web App: installable manifest and a service worker that keeps the app working offline. */
const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
  manifest: {
    name: 'CHROŃ — od zagrożenia do działania',
    short_name: 'CHROŃ',
    description: 'Alerty o zagrożeniach, najbliższe schrony i trasa — także bez internetu.',
    lang: 'pl',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0A0D',
    theme_color: '#0B0A0D',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The whole app shell is precached, so the app opens without a network connection.
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // Map tiles: served from the cache first; the Safety Pack pre-downloads tiles of the zone.
        urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
        handler: 'CacheFirst',
        options: {
          cacheName: MAP_TILES_CACHE,
          expiration: { maxEntries: 3000, maxAgeSeconds: 30 * 24 * 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Shelters and threats: fresh data when online, the last response when offline or slow.
        urlPattern: ({ url }) => url.pathname === '/api/shelters' || url.pathname === '/api/threats',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'chron-api',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 },
        },
      },
      {
        // Walking routes: a previously built route is reused when the routing service is unreachable.
        urlPattern: ({ url }) => url.hostname === 'routing.openstreetmap.de',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'chron-routes',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 },
        },
      },
      {
        // Fonts: rarely change, so the cached copy is used first.
        urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
        handler: 'CacheFirst',
        options: {
          cacheName: 'chron-fonts',
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default defineConfig(({ mode }) => {
  // Make DATABASE_URL and other secrets from .env available to the local API handlers.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), pwa, localApi()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
