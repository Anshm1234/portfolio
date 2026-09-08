// ============================================================
// DEV API PLUGIN — mounts the api/ handlers into Vite's dev server.
//
// `vite` alone is a static server and knows nothing about api/, so /api/ask
// would 404 in dev and the only way to test would be to deploy. `vercel dev`
// solves that but needs the CLI installed and the project linked.
//
// This mounts the same handler files Vercel will run, on the same paths, with
// the two conveniences Vercel's Node runtime adds and raw Node doesn't:
// a parsed `req.body` and the `res.status().json()` helpers. Same code path in
// dev and prod — no separate mock server to drift out of sync.
//
// Dev only. In a real build this plugin never runs.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const MAX_BODY_BYTES = 100_000; // a question is ~500 chars; this is generous

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(parts).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Vercel's Node runtime decorates the response with these; plain http doesn't.
function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = (payload) => {
    res.end(payload);
    return res;
  };
  return res;
}

export default function apiPlugin({ dir = 'api' } = {}) {
  return {
    name: 'local-vercel-api',
    apply: 'serve',
    configureServer(server) {
      const apiDir = path.resolve(server.config.root, dir);

      // Vite only exposes VITE_-prefixed vars, and only to the client bundle —
      // it never touches process.env. The handler reads process.env like it
      // will on Vercel, so load .env.local into it here. Existing shell vars
      // win, matching how Vercel treats dashboard vs. local overrides.
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
      if (!process.env.GEMINI_API_KEY) {
        server.config.logger.warn(
          '[api] GEMINI_API_KEY is not set — /api/ask will stream an error. ' +
            'Put it in portfolio-3d/.env.local to answer questions locally.'
        );
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        // /api/ask -> api/ask.js. Reject anything with path traversal or a
        // leading underscore (_lib is shared code, not a route) — same rule
        // Vercel applies.
        const route = url.pathname.slice('/api/'.length);
        if (!/^[a-z0-9-]+$/i.test(route)) {
          return decorate(res).status(404).json({ error: 'Not found' });
        }

        const file = path.join(apiDir, `${route}.js`);
        if (!fs.existsSync(file)) {
          return decorate(res).status(404).json({ error: 'Not found' });
        }

        decorate(res);

        try {
          if (req.method === 'POST' || req.method === 'PUT') {
            req.body = await readJsonBody(req);
          }
          // ssrLoadModule keeps the handler hot-reloading like the rest of the
          // app — edit api/ask.js and the next request picks it up.
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[api] ${route}: ${err.stack ?? err}`);
          if (!res.headersSent) {
            decorate(res).status(500).json({ error: String(err.message ?? err) });
          } else {
            res.end();
          }
        }
      });
    },
  };
}
