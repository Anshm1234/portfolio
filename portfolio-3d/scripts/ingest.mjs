// ============================================================
// INGEST — build-time knowledge pipeline for the FAQ bot.
//
// Reads the knowledge sources, splits them into chunks, and writes
// api/_lib/knowledge.generated.js. Runs automatically via `prebuild`.
//
// Why a generated .js file instead of reading the .md at runtime: the Vercel
// function is bundled separately from the Vite app and doesn't reliably get
// the repo's files on disk. Importing a generated module needs no bundler
// config and no vercel.json.
//
// This is the ingest half of the RAG pipeline. `--embed` turns on the second
// half: embed every chunk with Gemini and write the vectors to a JSON store
// (see retrievers.js). Without it, ingest stops after chunking and retrieval
// falls back to sending the whole corpus.
// ============================================================
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { STUFF_ALL_CEILING_TOKENS } from '../api/_lib/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

// Rough token estimate — good enough to decide "does this still fit in the
// prompt". Real counts come from the API's usage field at runtime.
const estimateTokens = (s) => Math.ceil(s.length / 4);

// The ceiling lives in api/_lib/config.js — one owner, imported here rather
// than duplicated, so the build-time warning and the runtime health check can
// never disagree about what the threshold is.

// ---- source 1: the hand-maintained knowledge file ----
// Strip the editor-facing scaffolding: the leading blockquote guidance and
// any HTML comments (TODO notes to self). Those aren't knowledge.
function loadMarkdown() {
  const file = path.join(root, 'content', 'about-me.md');
  const raw = fs.readFileSync(file, 'utf8');
  const cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !line.startsWith('>'))
    .join('\n');

  // Two levels of granularity:
  //   ##  section          → a topic  (a project, a theme)
  //   ### subsection       → ONE IDEA, and one chunk
  //
  // Chunk-per-idea is what gives cosine something to separate. A single
  // 800-word "## Career Ops" chunk scores the same against "why TOPSIS?" as
  // against "what stack?", because it contains both; split into ideas, the
  // right one wins clearly.
  //
  // The parent heading is carried into both the chunk's label and its text, so
  // a subsection retrieved on its own still says which project it belongs to.
  // Without that, "### What I'd do differently" is unattributable once it
  // arrives at the model alongside five other chunks.
  const chunks = [];

  for (const section of cleaned.split(/^## /m).slice(1)) {
    const [h2Line, ...rest] = section.split('\n');
    const h2 = h2Line.trim();

    const parts = rest.join('\n').split(/^### /m);
    const intro = parts[0].trim(); // prose before the first ###
    const subs = parts.slice(1);

    // Text sitting directly under the ## becomes its own chunk. For a section
    // with no ### at all, that IS the section — which keeps short sections
    // (Contact, Education) as single chunks rather than over-splitting them.
    if (intro) {
      chunks.push({
        source: 'about-me.md',
        heading: h2,
        text: `## ${h2}\n${intro}`,
      });
    }

    for (const sub of subs) {
      const [h3Line, ...subRest] = sub.split('\n');
      const h3 = h3Line.trim();
      const body = subRest.join('\n').trim();
      if (!body && !h3) continue;
      chunks.push({
        source: 'about-me.md',
        heading: `${h2} → ${h3}`,
        text: `## ${h2}\n### ${h3}\n${body}`,
      });
    }
  }

  return chunks;
}

// A heading with no body under it — an unwritten TODO section — produces a
// chunk that is nothing but its own title. Those are worse than useless: they
// can still win a top-k slot on heading similarity alone and then contribute
// no information, displacing a chunk that had some.
const MIN_CHUNK_TOKENS = 25;

// ---- source 2: the project registry (same JSON the gallery reads) ----
// Pulled in automatically so a new project.json shows up in the bot without
// anyone remembering to also write it into the markdown.
//
// Skipped when about-me.md already has a `## Project: <title>` section — a
// hand-written project section is strictly better than the gallery blurb, and
// keeping both puts two near-identical chunks in the corpus that compete for
// the same top-k slot and split the similarity between them.
function loadProjects(markdownChunks) {
  // Matched loosely on purpose. The gallery title and the markdown heading are
  // maintained by hand in two places and drift — "EEG-Based Schizophrenia
  // Detection" vs "...Using Deep Learning" — so exact matching silently lets a
  // duplicate through, which is the failure this dedup exists to prevent.
  const norm = (s) =>
    s.replace(/^Project:\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const documented = markdownChunks
    .map((c) => c.heading.split(' → ')[0])
    .filter((h) => h.startsWith('Project: '))
    .map(norm);

  const isDocumented = (title) => {
    const t = norm(title);
    return documented.some((d) => d.startsWith(t) || t.startsWith(d));
  };

  const dir = path.join(root, 'src', 'data', 'projects');
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name, 'project.json'))
    .filter((p) => fs.existsSync(p))
    .map((p) => JSON.parse(fs.readFileSync(p, 'utf8')))
    .filter((p) => !isDocumented(p.title))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map((p) => ({
      source: 'project.json',
      heading: `Project: ${p.title}`,
      text: [
        `## Project: ${p.title}`,
        p.description,
        `Stack: ${p.stack}`,
        p.repo ? `Repository: ${p.repo}` : null,
        p.demo && p.demo !== 'game' ? `Live demo: ${p.demo}` : null,
        p.demo === 'game' ? 'Live demo: the 3D world on this site.' : null,
      ]
        .filter(Boolean)
        .join('\n'),
    }));
}

const markdownChunks = loadMarkdown();

const all = [...markdownChunks, ...loadProjects(markdownChunks)].map((c) => ({
  ...c,
  tokens: estimateTokens(c.text),
}));

// Drop the title-only stubs, and say which ones — an unwritten section should
// be visible as work outstanding, not silently absent from the corpus.
const stubs = all.filter((c) => c.tokens < MIN_CHUNK_TOKENS);
const chunks = all
  .filter((c) => c.tokens >= MIN_CHUNK_TOKENS)
  .map((c, i) => ({ id: `c${String(i).padStart(3, '0')}`, ...c }));

const totalTokens = chunks.reduce((n, c) => n + c.tokens, 0);

// Identifies this exact corpus. The vector file records the fingerprint it was
// built from, so retrievers.js can tell whether the vectors still match the
// text instead of silently serving whichever copy is older.
const fingerprint = createHash('sha256')
  .update(chunks.map((c) => c.id + '\u0000' + c.text).join('\u0001'))
  .digest('hex')
  .slice(0, 16);

const out = `// GENERATED by scripts/ingest.mjs — do not edit.
// Run \`npm run ingest\` (or any build) to regenerate.
export const CHUNKS = ${JSON.stringify(chunks, null, 2)};

export const CORPUS_TOKENS = ${totalTokens};
export const CORPUS_FINGERPRINT = ${JSON.stringify(fingerprint)};
`;

const outPath = path.join(root, 'api', '_lib', 'knowledge.generated.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);

console.log(
  `[ingest] ${chunks.length} chunks, ~${totalTokens} tokens -> api/_lib/knowledge.generated.js`
);

// Build-time staleness check: the vectors are regenerated only with --embed,
// so an ordinary build after a content edit leaves them behind.
const vecPathCheck = path.join(root, 'api', '_lib', 'embeddings.generated.js');
if (!process.argv.includes('--embed') && fs.existsSync(vecPathCheck)) {
  const existing = fs.readFileSync(vecPathCheck, 'utf8');
  const m = existing.match(/VECTOR_FINGERPRINT = "([a-f0-9]+)"/);
  if (!m || m[1] !== fingerprint) {
    console.warn(
      `[ingest] \u001b[33mWARNING: embeddings.generated.js is STALE.\u001b[0m ` +
        `The corpus changed since the vectors were built.
` +
        `           Run \`npm run ingest -- --embed\` or vector retrieval will ` +
        `serve outdated content.`
    );
  }
}

if (stubs.length) {
  console.log(
    `[ingest] ${stubs.length} section(s) still unwritten, excluded from the corpus:`
  );
  for (const s of stubs) console.log(`           · ${s.heading}`);
}

if (totalTokens > STUFF_ALL_CEILING_TOKENS) {
  console.warn(
    `[ingest] corpus is over the ${STUFF_ALL_CEILING_TOKENS}-token ceiling — ` +
      `time to switch RETRIEVER=vector and run this with --embed.`
  );
}

// ---- the vector half, off by default ----
// Enabled with `npm run ingest -- --embed`. Embeds every chunk with Gemini and
// writes api/_lib/embeddings.generated.js — a committed JSON store.
//
// A file, not a database: at this corpus size an index would be slower than
// the scan it replaces, there is no service to provision, no network hop in
// the request path, and the vectors version alongside the content they were
// built from. Swap JsonVectorStore in retrievers.js when that stops being true.
if (process.argv.includes('--embed')) {
  const { GeminiRetrievalEmbeddings } = await import('../api/_lib/embeddings.js');
  const { GEMINI } = await import('../api/_lib/config.js');

  if (!process.env.GEMINI_API_KEY) {
    console.error('[ingest] --embed needs GEMINI_API_KEY (put it in .env.local)');
    process.exit(1);
  }

  // The SAME Embeddings implementation the retriever uses at query time. That
  // is the point: document and query vectors have to come from one place, or
  // the task-type asymmetry silently drifts apart and retrieval degrades with
  // nothing to show for it.
  const embeddings = new GeminiRetrievalEmbeddings();

  console.log(`[ingest] embedding ${chunks.length} chunks with ${GEMINI.embedModel}...`);
  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.text));

  // Deliberately NOT storing text or heading here. They live in CHUNKS, and
  // keeping a second copy is what let a corrected chunk keep being served from
  // a stale vector file. Vectors carry an id and nothing else.
  const records = chunks.map((c, i) => ({ id: c.id, embedding: vectors[i] }));

  const vecPath = path.join(root, 'api', '_lib', 'embeddings.generated.js');
  fs.writeFileSync(
    vecPath,
    `// GENERATED by scripts/ingest.mjs --embed - do not edit.
` +
      `// ${records.length} chunks x ${vectors[0].length} dims, ${GEMINI.embedModel}.
` +
      `// Built from corpus fingerprint ${fingerprint}. Text lives in knowledge.generated.js.
` +
      `export const VECTOR_FINGERPRINT = ${JSON.stringify(fingerprint)};
` +
      `export const VECTORS = ${JSON.stringify(records)};
`
  );

  const kb = (fs.statSync(vecPath).size / 1024).toFixed(1);
  console.log(
    `[ingest] wrote ${records.length} vectors (${vectors[0].length} dims, ${kb} KB) ` +
      `-> api/_lib/embeddings.generated.js`
  );
  console.log('[ingest] set RETRIEVER=vector to switch retrieval on.');
}
