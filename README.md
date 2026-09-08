<div align="center">

# 🌏 Ansh Madaan — 3D Portfolio

**A portfolio you don't read — you *walk through it*.**

Scroll it like a story, press play and explore it like a game, or just ask it questions. 🎮

**[→ anshmadaan.vercel.app](https://anshmadaan.vercel.app)**

<img src="portfolio-3d/public/og-image.jpg" alt="The 3D portfolio world" width="560" />

</div>

---

A warm, hand-built world where you **walk around (WASD)** and press **E** at the
desk, the mailbox, and the hamster to open Projects, Contact, and About — right
inside the scene. It repaints itself to *your* local time of day. 🌅🌙

There's also **Masala Dosa**, a RAG-powered assistant that answers questions
about me from my own notes — retrieval-augmented, evaluated, and grounded so it
admits a gap rather than inventing a credential.

```bash
cd portfolio-3d && npm install && npm run dev
```

---

## Table of contents

- [The two halves](#the-two-halves)
- [Architecture](#architecture)
- [Design decisions, and the evidence for them](#design-decisions-and-the-evidence-for-them)
- [Bugs worth remembering](#bugs-worth-remembering)
- [The numbers](#the-numbers)
- [Project structure](#project-structure)
- [Commands](#commands)
- [Setup and deployment](#setup-and-deployment)

---

## The two halves

### 1. The 3D world

React 19 · Three.js · React Three Fiber · GSAP · Blender · Vite

Every model was built by hand in Blender. The site works two ways: a
scroll-driven page with a frame-scrubbed hero animation, and a walkable
first-person world with physics, interactive stations, and touch controls on
phones. Lighting and palette follow the visitor's device clock.

### 2. The FAQ bot (RAG)

LangChain · Gemini · Vercel Functions · Server-Sent Events

A retrieval-augmented question-answering system over a hand-maintained
knowledge base. The pipeline chunks Markdown on heading boundaries, embeds each
chunk with Gemini, ranks by cosine similarity against the question, and streams
a grounded answer back token by token.

**It is measured, not assumed** — `npm run eval:retrieval` scores recall@k over
question → expected-chunk pairs, and it has overturned two design assumptions
so far.

---

## Architecture

### Build time (once per push)

```
npm run build
   │
   ├─ prebuild → scripts/ingest.mjs
   │     ├─ read content/about-me.md
   │     │     strip `>` guidance and <!-- TODO --> comments
   │     ├─ split:  ##  = a topic      ###  = ONE IDEA = one chunk
   │     ├─ carry the parent heading into each chunk's text
   │     ├─ pull project.json (skipping ones written up in Markdown)
   │     ├─ drop title-only stubs, and name them in the output
   │     ├─ fingerprint the corpus (sha256, 16 hex)
   │     └─ write knowledge.generated.js        54 chunks · 6,572 tokens
   │
   │   with --embed, additionally:
   │     ├─ embed all 54 (taskType RETRIEVAL_DOCUMENT, 768 dims, normalised)
   │     └─ write embeddings.generated.js       { id, embedding } only
   │
   └─ vite build → dist/
```

### Request time

```
BROWSER                     SERVER (api/ask.js)                  GEMINI

AskPanel.jsx
  POST /api/ask ──────────► ① validate     ≤500 chars, shape checks
  {question, history}       ② rate limit   per-IP hourly bucket
                            ③ sanitize     rebuild turns server-side
                            ④ retrieve ──────────────────────────►  embed question
                                 cosine × 54 → top 8                (RETRIEVAL_QUERY)
                            ⑤ PERSONA + 8 chunks = systemInstruction
                            ⑥ stream ────────────────────────────►  generate
   ◄── event: meta
   ◄── event: delta ×N ◄─── re-emit as SSE   ◄─────────────────────  text
   ◄── event: done
```

The key exists only inside the Vercel Function. The browser knows exactly one
thing about the backend: the string `/api/ask`.

### How embeddings map back to chunks

```
knowledge.generated.js          embeddings.generated.js
c002  "Education → Degree"  ←→  c002  [0.039, -0.007, … 768 floats]
      ↑ text + heading                ↑ numbers only, no text
      └──────── joined on id ─────────┘
```

The vector file deliberately stores **no text**. Retrieval joins by `id` and
pulls content from `CHUNKS`, so stale vectors can affect ranking but never
accuracy.

---

## Design decisions, and the evidence for them

### Why a custom `Embeddings` class instead of LangChain's built-in

LangChain's `GoogleGenerativeAIEmbeddings` leaves `taskType` undefined, so
`embedDocuments()` and `embedQuery()` return **byte-identical vectors** for the
same text — measured at 3072/3072 components equal. Gemini prepends a different
instruction for documents vs queries, and losing that asymmetry destroys
retrieval. It also accepts `outputDimensionality: 768` and silently returns
3072.

| | recall@8 |
|---|---|
| LangChain defaults | **0/5** |
| With correct task types | **94%** |

`api/_lib/embeddings.js` subclasses LangChain's `Embeddings` — the documented
extension point — so it still plugs into the vector store, retrievers, and MMR.
It just sends the two parameters that matter.

### Why MMR is switched off

Maximal Marginal Relevance penalises a candidate chunk for resembling ones
already selected. It sounds like the fix for multi-chunk questions. Measured:

| | recall@8 |
|---|---|
| Plain cosine | **94%** |
| Cosine + MMR | **76%** |

Diversity is the wrong objective when a question genuinely wants several
*similar* chunks. Ask "what are his hobbies?" and Badminton, Cycling and
Sketching are mutually similar — MMR discarded two of them for being too
on-topic. The eval overruled the assumption.

### Why chunks are split on headings, not fixed-size windows

A chunk is the unit retrieval returns, so it should be one complete idea. A
single 800-word "Career Ops" chunk scores identically against *"why TOPSIS?"*
and *"what stack?"* because it contains both. Split by idea and the right one
wins clearly. Heading boundaries are semantic; a 500-character window is
arbitrary and cuts sentences in half.

The parent heading is carried into the chunk's text, so `### What I'd do
differently` retrieved alone still says which project it belongs to.

### Why a JSON file instead of a vector database

Brute-force cosine over ~50 vectors takes microseconds. An
approximate-nearest-neighbour index only pays off when scanning everything is
the bottleneck. A committed file also means no service to provision, no
credentials in the request path, no network hop before the model call, and
vectors versioned alongside the content they were built from.

The store sits behind LangChain's `MemoryVectorStore` interface, so swapping in
pgvector or Upstash later changes one class.

### Why vectors are normalised at embed time

Cosine similarity is `(a·b) / (|a|×|b|)`. Normalise both vectors to length 1
and the denominator becomes 1, so cosine collapses into a plain dot product.
Done once at ingest, so nothing downstream has to remember.

### Why retrieval at all, given the corpus fits in the context window

Honestly: at 871 tokens it did **not** justify itself, and the first version
shipped as "stuff-all" — send the whole corpus, let the model pick. Retrieval
was *worse*: with 10 near-identical chunks, cosine scores spanned only 0.098
and top-k dropped needed chunks.

Retrieval became the right call at 54 distinct chunks, where the spread widens
and top-8 is genuine filtering rather than a rounding error. The threshold is
`STUFF_ALL_CEILING_TOKENS`, and the health route reports `overCeiling`.

### Why `gemini-3.5-flash-lite`

`gemini-2.5-flash` has a **20-request-per-day** free-tier quota
(`GenerateRequestsPerDayPerProjectPerModel`) and is now unavailable to new API
keys entirely. The full flash models are *thinking* models that returned empty
answers at low token caps, because thinking consumed the output budget. Lite is
correct for recall over a small corpus: no reasoning required, higher quota,
lower latency.

### Why answer length is controlled by the prompt, not `maxOutputTokens`

A hard token cap doesn't make a model concise — it truncates mid-sentence,
which reads as broken rather than brief. The prompt says "two or three
sentences, then stop"; `maxOutputTokens: 300` is only a runaway guard.

### Why the hero animation is 180 image frames, not a video

Frames give frame-accurate scroll scrubbing; a `<video>` element cannot be
scrubbed reliably across browsers. The cost is many HTTP requests — see the
HTTP/2 bug below.

### Why the lanyard is hand-written Verlet physics

Rapier has React Three Fiber bindings and would have taken an afternoon, but it
ships as a WASM blob. For one swinging cord that's a large dependency to put in
front of a visitor. Verlet integration — positions, previous positions, a
distance constraint iterated a few times per frame — is a fraction of the size
and indistinguishable for a single rope.

### Why `three` is not in a manual vendor chunk

Three.js is ~725 KB and only needed when someone launches the game or scrolls
the lanyard into view. Manually grouping a vendor chunk in the Rolldown config
causes it to be hoisted into the entry HTML's `modulepreload` list — so
grouping Three "for tidiness" made every visitor eagerly download 725 KB on
first paint for something most never reach. Only `react-vendor` and `gsap`,
which first paint genuinely needs, are grouped.

---

## Bugs worth remembering

### The SSE stream that returned HTTP 200 and nothing else

Gemini terminates its Server-Sent Event frames with **CRLF** (`\r\n\r\n`). The
parser split on `\n\n`, which matches nothing in `"data: {...}\r\n\r\n"`, so
every frame accumulated in the buffer and was discarded when the stream ended.
The endpoint returned a valid 200 with an empty body. The API had been sending
correct text the entire time.

### A green health check that passed a broken config

`check-gemini.mjs` reported "All good" while production returned 400 on every
request — because the checker sent a different `generationConfig` than the
handler did. The lite models reject a `thinkingConfig` parameter outright, and
only production was sending it.

**The fix wasn't the parameter, it was the divergence.** Both now call one
shared `buildGenerationConfig()`. A check that doesn't exercise the real
request shape isn't a check.

### Corrected content that kept being served

Both generated files stored the chunk text. `npm run ingest` regenerates the
text but only `--embed` regenerates the vectors — so after a content fix, the
corrected text sat in one file while retrieval read the stale copy from the
other. A claim fixed in the source was still being answered from disk.

Three defences now, at three layers:

| Layer | Behaviour |
|---|---|
| Build | fingerprint mismatch prints a loud `WARNING: STALE` |
| Runtime | retriever refuses mismatched vectors, degrades to stuff-all |
| Structural | vectors hold no text, so content can never be stale |

The third matters most: the first two are checks, the third makes the failure
impossible by design.

### A source file committed as binary

Raw `NUL` bytes ended up inside a string literal in `ingest.mjs`. JavaScript
tolerates control characters in string literals, so the code ran perfectly —
but git flagged the file binary, meaning no diffs, no blame, and no reviewable
history on the file defining the entire chunking strategy. Caught during a
pre-commit review; replaced with `\u0000` escapes, identical at runtime.

### HTTP/2 self-congestion

Loading all 180 hero frames at once made them competing requests over a single
HTTP/2 connection, and the sequence loaded *slower* than a more restrained
approach. Fixed by capping the frame loader's concurrency. Parallelism is not
free.

---

## The numbers

| Metric | Value |
|---|---|
| Corpus | 54 chunks · 6,572 tokens |
| Embedding dimensions | 768 (truncated from 3072 — Matryoshka) |
| Retrieval | cosine, top-8 |
| **recall@8** | **94%** (16/17 required chunks) |
| recall@8 with MMR | 76% |
| Answer model | `gemini-3.5-flash-lite` |
| Ask panel bundle | 4.25 KB, lazy — zero first-paint cost |
| Three.js | 725 KB, async chunk only |

---

## Project structure

```
portfolio-3d/
├── content/
│   └── about-me.md              the knowledge base — edit this, push, done
├── api/                         Vercel Functions (the only place the key exists)
│   ├── ask.js                   GET = health · POST = SSE answer stream
│   └── _lib/
│       ├── config.js            model IDs, retrieval tuning, generation config
│       ├── embeddings.js        Embeddings subclass with correct task types
│       ├── gemini.js            streaming generation over raw fetch
│       ├── retrievers.js        vector (LangChain) + stuff-all fallback
│       ├── ratelimit.js         per-IP bucket, environment-aware
│       ├── knowledge.generated.js    chunks + text        (generated)
│       └── embeddings.generated.js   { id, embedding }    (generated)
├── scripts/
│   ├── ingest.mjs               chunk, fingerprint, optionally embed
│   ├── eval-retrieval.mjs       recall@k measurement
│   ├── check-gemini.mjs         validate model IDs against the live API
│   ├── vite-plugin-api.mjs      mounts api/ into the dev server
│   └── load-env.mjs             .env.local for standalone scripts
└── src/
    ├── game/                    the walkable 3D world
    ├── sections/                Hero, About, Journey, Projects, Contact
    ├── components/              AskPanel, GameLauncher, Lanyard, loaders
    └── data/projects/           one folder per project, auto-discovered
```

---

## Commands

```bash
npm run dev              # site + /api/ask on one port (no `vercel dev` needed)
npm run build            # runs ingest, then builds
npm run ingest           # re-chunk the knowledge base
npm run ingest -- --embed   # re-chunk AND regenerate vectors  ← after editing content
npm run check:gemini     # verify model IDs + request shapes against the live API
npm run eval:retrieval   # recall@k
npm run eval:retrieval -- --mmr   # compare retrieval configurations
```

**After editing `content/about-me.md`, run `npm run ingest -- --embed`.** Plain
`ingest` leaves the vectors describing the previous corpus; you'll get a build
warning and a runtime fallback, but not RAG.

### Local dev without `vercel dev`

`scripts/vite-plugin-api.mjs` mounts the `api/` handlers into Vite's dev server
as connect middleware, supplying the two things Vercel's runtime adds and raw
Node doesn't: a parsed `req.body` and `res.status().json()`. One process, one
port, and the *same handler file* runs in dev and production — no mock server
to drift out of sync.

---

## Setup and deployment

1. Get a Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. `cp portfolio-3d/.env.example portfolio-3d/.env.local` and fill it in
3. `npm run check:gemini` — confirms the model IDs are current
4. `npm run ingest -- --embed` — generates the vectors
5. `npm run dev`

**On Vercel**, set both environment variables:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | your key |
| `RETRIEVER` | `vector` |

Without the second, production silently runs the non-RAG path while local runs
RAG. Verify after deploying with `curl https://<your-site>/api/ask` — the health
route never calls the model, so it costs nothing.

> **Set a spend limit on the key.** `/api/ask` is public. `ratelimit.js` caps
> per-IP requests, but it's per-instance memory: Vercel runs several instances
> and recycles them, so it blunts abuse rather than guaranteeing a ceiling.

<div align="center">

**[anshmadaanmks@gmail.com](mailto:anshmadaanmks@gmail.com)** · [LinkedIn](https://www.linkedin.com/in/ansh-madaan-5362b92a8/) · [GitHub](https://github.com/Anshm1234) · [Sketches](https://www.instagram.com/drawwithmadaan)

</div>
