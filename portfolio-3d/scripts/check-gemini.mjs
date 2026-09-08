// ============================================================
// CHECK — verifies the Gemini config against the live API.
//
// The model IDs in api/_lib/config.js were written without access to Google's
// docs. Rather than have you find out via a 404 in production, this asks the
// API what actually exists and tells you what to put in the config.
//
//   npm run check:gemini
// ============================================================
import './load-env.mjs';
import { GEMINI, buildGenerationConfig } from '../api/_lib/config.js';

const key = process.env.GEMINI_API_KEY;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`    ${m}`);

if (!key) {
  bad('GEMINI_API_KEY is not set.');
  info('Copy .env.example to .env.local and put your key in it.');
  process.exit(1);
}

console.log(`\nChecking Gemini config against the live API...\n`);

// ---- 1. what models does this key actually have? ----
let models = [];
try {
  const res = await fetch(`${GEMINI.base}/models?pageSize=200`, {
    headers: { 'x-goog-api-key': key },
  });
  if (!res.ok) {
    bad(`Could not list models: ${res.status}`);
    info(await res.text());
    process.exit(1);
  }
  const json = await res.json();
  models = (json.models ?? []).map((m) => ({
    id: m.name.replace(/^models\//, ''),
    methods: m.supportedGenerationMethods ?? [],
  }));
  ok(`Key works — ${models.length} models available.`);
} catch (err) {
  bad(`Network error: ${err.message}`);
  process.exit(1);
}

const has = (id) => models.some((m) => m.id === id);
const supporting = (method) =>
  models.filter((m) => m.methods.includes(method)).map((m) => m.id);

let problems = 0;

// ---- 2. the chat model ----
console.log('\nChat model');
if (has(GEMINI.chatModel)) {
  ok(`"${GEMINI.chatModel}" exists.`);
} else {
  problems++;
  bad(`"${GEMINI.chatModel}" does NOT exist.`);
  // Filter on generateContent, NOT streamGenerateContent: the models endpoint
  // never lists the streaming variant even for models that stream fine, so
  // filtering on it silently returns an empty suggestion list.
  const options = supporting('generateContent').filter((id) =>
    id.includes('flash')
  );
  info(`Set GEMINI.chatModel in api/_lib/config.js to one of:`);
  for (const id of options.slice(0, 6)) info(`  • ${id}`);
}

// ---- 3. the embedding model ----
console.log('\nEmbedding model');
if (has(GEMINI.embedModel)) {
  ok(`"${GEMINI.embedModel}" exists.`);
} else {
  problems++;
  bad(`"${GEMINI.embedModel}" does NOT exist.`);
  const options = supporting('embedContent');
  info(`Set GEMINI.embedModel in api/_lib/config.js to one of:`);
  for (const id of options.slice(0, 6)) info(`  • ${id}`);
}

// ---- 4. a real embed call — proves the request shape, not just the ID ----
console.log('\nEmbedding call');
try {
  // Deliberately the same class retrievers.js uses. A checker that exercises a
  // different embedding path than production is how the taskType bug survived
  // a green check once already.
  const { GeminiRetrievalEmbeddings } = await import('../api/_lib/embeddings.js');
  const vec = await new GeminiRetrievalEmbeddings().embedQuery('hello');
  ok(`Returned a ${vec.length}-dim vector.`);
  if (vec.length !== GEMINI.embedDimensions) {
    info(
      `Note: config says ${GEMINI.embedDimensions} dims but the API returned ` +
        `${vec.length}. outputDimensionality may be unsupported on this model.`
    );
  }
} catch (err) {
  problems++;
  bad(`Embedding failed: ${err.message}`);
}

// ---- 5. a real streaming call — proves the SSE parsing end to end ----
console.log('\nStreaming call');
try {
  const { streamAnswer } = await import('../api/_lib/gemini.js');
  let text = '';
  for await (const delta of streamAnswer({
    system: 'You are a test. Reply with exactly the word: ok',
    history: [],
    question: 'say ok',
    generation: buildGenerationConfig(),
  })) {
    text += delta;
  }
  if (text.trim()) ok(`Streamed a reply: "${text.trim().slice(0, 40)}"`);
  else {
    problems++;
    bad('Stream produced no text — SSE parsing may be wrong.');
  }
} catch (err) {
  problems++;
  bad(`Streaming failed: ${err.message}`);
}

console.log(
  problems === 0
    ? '\n\x1b[32mAll good.\x1b[0m /api/ask is ready to answer.\n'
    : `\n\x1b[31m${problems} problem(s).\x1b[0m Fix api/_lib/config.js and re-run.\n`
);
process.exit(problems === 0 ? 0 : 1);
