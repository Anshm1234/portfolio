// Loads .env.local / .env into process.env for scripts run outside Vite.
//
// The dev server does this via scripts/vite-plugin-api.mjs, and Vercel injects
// env vars directly — but a bare `node scripts/foo.mjs` gets neither, which is
// how `npm run ingest -- --embed` ended up reporting a missing API key that was
// sitting in .env.local the whole time.
//
// Existing shell vars win, matching how Vercel treats dashboard vars.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const file of ['.env.local', '.env']) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
