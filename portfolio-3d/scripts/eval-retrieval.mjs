// ============================================================
// RETRIEVAL EVAL — measures recall@k over question → expected-chunk pairs.
//
//   npm run eval:retrieval            measure the current config
//   npm run eval:retrieval -- --mmr   compare it against the alternative
//
// This exists because retrieval quality is invisible without it. A RAG system
// that drops a needed chunk doesn't error — the model answers fluently from
// what it got, and nothing in the logs says anything went missing. recall@k is
// the only thing that catches that.
//
// It has already earned its keep twice: it caught that LangChain's default
// embeddings omit Gemini's retrieval task types (recall 0/5), and it overturned
// the assumption that MMR would help (92% plain cosine vs 67% with MMR).
//
// WHEN YOU ADD CONTENT TO about-me.md, ADD CASES HERE — especially multi-chunk
// ones. Single-chunk questions pass trivially; the interesting failures all
// look like "give me an overview of everything".
// ============================================================
import './load-env.mjs';

process.env.RETRIEVER = 'vector';

const { getRetriever } = await import('../api/_lib/retrievers.js');
const { RETRIEVAL } = await import('../api/_lib/config.js');

// `need` lists every chunk heading a CORRECT answer requires.
const CASES = [
  { q: 'What did he study?', need: ['Education → Degree'] },
  { q: 'What is his CGPA?', need: ['Education → Degree'] },
  {
    q: 'Tell me about the EEG project',
    need: ['Project: EEG-Based Schizophrenia Detection → The architecture and results'],
  },
  {
    q: 'How accurate was the schizophrenia model?',
    need: ['Project: EEG-Based Schizophrenia Detection → The architecture and results'],
  },
  { q: 'How do I contact him?', need: ['Contact'] },
  {
    q: 'What are his hobbies?',
    need: [
      'Things that make me a person → Badminton',
      'Things that make me a person → Cycling',
      'Things that make me a person → Sketching, and the phone it bought',
    ],
  },
  {
    q: 'Give me a full overview of his background and all his projects.',
    need: [
      'Who I am',
      'Project: Career Ops',
      'Project: Portfolio 3D',
      'Project: EEG-Based Schizophrenia Detection',
    ],
  },
  {
    q: 'Does he prefer chai or coffee?',
    need: ['Things that make me a person → Chai and coffee, correctly understood'],
  },
  { q: 'What are his opinions on frameworks?', need: ["Opinions I'll defend → Frameworks are overused"] },
  { q: 'What backend experience does he have?', need: ['Skills → Backend'] },
  { q: 'Does he have leadership experience?', need: ['Leadership and achievements → General Secretary, ACM Student Chapter'] },
  { q: 'Tell me about Career Ops', need: ['Project: Career Ops → What it does'] },
];

const G = '\x1b[32m', R = '\x1b[31m', D = '\x1b[2m', X = '\x1b[0m';

async function measure(useMmr) {
  const retriever = getRetriever();
  retriever.useMmr = useMmr;

  let need = 0;
  let hit = 0;
  const failures = [];

  for (const c of CASES) {
    const { chunks } = await retriever.search(c.q);
    const got = chunks.map((x) => x.heading);
    const found = c.need.filter((n) => got.includes(n));
    need += c.need.length;
    hit += found.length;
    if (found.length < c.need.length) {
      failures.push({ q: c.q, missed: c.need.filter((n) => !got.includes(n)), got });
    }
  }
  return { recall: hit / need, hit, need, failures };
}

const k = RETRIEVAL.topK;
console.log(`\nRetrieval eval — ${CASES.length} questions, k=${k}\n`);

const main = await measure(RETRIEVAL.useMmr);
const label = RETRIEVAL.useMmr ? 'cosine + MMR' : 'plain cosine';
const colour = main.recall >= 0.9 ? G : R;

console.log(
  `  ${colour}recall@${k} = ${main.hit}/${main.need} = ${(main.recall * 100).toFixed(0)}%${X}  (${label})`
);

if (main.failures.length) {
  console.log(`\n  ${main.failures.length} question(s) missing a required chunk:\n`);
  for (const f of main.failures) {
    console.log(`  ${R}✗${X} "${f.q}"`);
    for (const m of f.missed) console.log(`      missed: ${m}`);
    console.log(`      ${D}got: ${f.got.slice(0, 3).join(' | ')}…${X}`);
  }
} else {
  console.log(`\n  ${G}Every required chunk retrieved.${X}`);
}

if (process.argv.includes('--mmr')) {
  const other = await measure(!RETRIEVAL.useMmr);
  const otherLabel = RETRIEVAL.useMmr ? 'plain cosine' : 'cosine + MMR';
  console.log(`\n  ${'─'.repeat(46)}`);
  console.log(`  ${label.padEnd(16)} ${(main.recall * 100).toFixed(0)}%`);
  console.log(`  ${otherLabel.padEnd(16)} ${(other.recall * 100).toFixed(0)}%`);
  console.log(`  ${'─'.repeat(46)}`);
  console.log(
    main.recall >= other.recall
      ? `  ${G}Current config wins. Leave it.${X}`
      : `  ${R}The alternative is better — update RETRIEVAL in config.js.${X}`
  );
}

console.log('');
process.exit(main.recall >= 0.9 ? 0 : 1);
