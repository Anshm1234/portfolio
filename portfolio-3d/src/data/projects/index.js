// ============================================================
// PROJECT REGISTRY — auto-discovered from the folders in here.
//
// TO ADD A PROJECT:
//   1. Make a new folder here, e.g. ./my-project/
//   2. Add a project.json describing it (title, description, stack, shots,
//      demo, repo, accent, order).
//   3. Drop screenshots into that same folder and list their filenames in
//      the JSON's "shots" array (e.g. "dashboard.png"). A shot can also be a
//      { placeholder, hue } tile until you have a real image.
// The gallery (website + 3D game) picks it up automatically — no imports,
// no editing this file. Ordering is the "order" field (ascending).
// ============================================================

// Every project.json, plus every image sitting beside one, pulled in at build
// time. Vite hashes the images and gives us their final URLs.
const metaModules = import.meta.glob('./*/project.json', { eager: true });
const imageUrls = import.meta.glob('./*/*.{png,jpg,jpeg,webp,avif,gif}', {
  eager: true, query: '?url', import: 'default',
});

// folder name -> { filename -> bundled URL }
const imagesByFolder = {};
for (const [path, url] of Object.entries(imageUrls)) {
  const m = path.match(/^\.\/([^/]+)\/(.+)$/);
  if (m) (imagesByFolder[m[1]] ||= {})[m[2]] = url;
}

// Resolve one shot entry:
//   • { placeholder, hue }  → left as-is (gradient tile)
//   • "http…" or "/public"  → { src, name } from the path
//   • "dashboard.png"       → { src: bundledURL, name: "dashboard.png" }
// Keeping `name` lets the detail view caption each thumbnail with its filename.
function resolveShot(shot, folder) {
  if (typeof shot !== 'string') return shot;                     // placeholder tile
  if (/^(https?:)?\//.test(shot)) return { src: shot, name: shot.split('/').pop() };
  const url = imagesByFolder[folder]?.[shot];
  return url ? { src: url, name: shot } : shot;                  // unmatched: leave as text
}

export const PROJECTS = Object.entries(metaModules)
  .map(([path, mod]) => {
    const folder = path.match(/^\.\/([^/]+)\//)[1];
    const data = mod.default ?? mod;
    return { ...data, shots: (data.shots || []).map((s) => resolveShot(s, folder)) };
  })
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
