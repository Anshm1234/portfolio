# The FAQ backend

`/api/ask` is a Vercel Function. It holds the Gemini API key, retrieves from
the knowledge base, and streams an answer back to the browser as SSE.

## Setup

1. Get a key at <https://aistudio.google.com/apikey>.
2. **Local:** copy `.env.example` to `.env.local` and put the key in it.
   `npm run dev` serves the site *and* `/api/ask` on the same port —
   `scripts/vite-plugin-api.mjs` mounts the handlers into Vite's dev server, so
   there's no `vercel dev` and no CLI login.
3. **Verify the model IDs before anything else:**

   ```bash
   npm run check:gemini
   ```

   The IDs in `_lib/config.js` were written without access to Google's docs.
   This asks the API which models your key actually has, names the exact
   replacement if one is wrong, then proves a real embed and a real streaming
   call. **Run it first** — it turns a confusing production 404 into a
   one-line fix.

4. **Production:** add `GEMINI_API_KEY` in *Vercel > Settings > Environment
   Variables*, then redeploy. Confirm with the health route, which costs
   nothing because it never calls the model:

   ```bash
   curl https://anshmadaan.vercel.app/api/ask
   # {"ok":true,"mode":"stuff-all","model":"...","keyConfigured":true,...}
   ```

   A 404 here means Vercel's **Root Directory** isn't `portfolio-3d` — that
   setting decides whether `portfolio-3d/api/` becomes `/api/`.
   `keyConfigured:false` means the env var didn't land.

## Watch the free-tier quota

Gemini's free tier is rate-limited per minute and per day. `_lib/ratelimit.js`
caps requests per IP first, but it's per-instance memory — Vercel runs several
instances and recycles them, so it blunts abuse rather than guaranteeing a cap.
When Google's quota runs out the endpoint returns 429 and the panel says so
politely; nothing breaks, but the bot goes quiet until the window resets.

## Editing what the bot knows

Edit `content/about-me.md` and push. `npm run ingest` runs automatically before
every build. Project descriptions come from `src/data/projects/*/project.json`
automatically — don't duplicate them in the markdown.

Anything not in those two places, the bot will not say. That's deliberate: it's
instructed to admit a gap rather than guess at a credential.

## Retrieval

`_lib/retrievers.js` has two implementations behind one `search()` interface.

| Mode | What it does |
|---|---|
| `vector` (default) | Embeds the question, cosine-ranks it against the stored chunk vectors, sends the top 8. This is the RAG path. |
| `stuff-all` (fallback) | Sends the whole corpus. Used when no vectors exist yet, or when they're stale. |

The vector store is LangChain's `MemoryVectorStore`, which does the storage and
the cosine maths. The one piece we supply is `_lib/embeddings.js` — an
`Embeddings` subclass that sends Gemini's `RETRIEVAL_DOCUMENT` /
`RETRIEVAL_QUERY` task types. LangChain's built-in Gemini embeddings leave the
task type undefined, which embeds documents and queries identically and took
recall on this corpus to 0/5. That class is not optional.

Vectors live in a committed JSON file rather than a database. Brute-force
cosine over ~50 vectors is microseconds — an ANN index only pays off when
scanning everything is the bottleneck. A file also means no service to
provision, no credentials in the request path, and no network hop before the
model call.

## Keeping vectors in sync

`npm run ingest` regenerates the text. **Only `npm run ingest -- --embed`
regenerates the vectors.** So after editing `content/about-me.md`, run the
`--embed` form — otherwise the vectors describe the previous corpus.

Three things guard against that:

- **Build** — ingest compares corpus fingerprints and warns loudly if they differ
- **Runtime** — the retriever refuses mismatched vectors and degrades to stuff-all
- **Structural** — the vector file stores `{ id, embedding }` and no text, so
  retrieved *content* always comes from the current corpus. Stale vectors can
  only affect ranking, never accuracy.

## Measuring retrieval

```bash
npm run eval:retrieval           # recall@k over question -> expected-chunk pairs
npm run eval:retrieval -- --mmr  # compare against the alternative config
```

RAG fails silently: drop a needed chunk and the model answers fluently from an
incomplete slice, with nothing in the logs. `recall@k` is the only thing that
catches it. **Add cases whenever you add content**, especially multi-chunk ones —
single-chunk questions pass trivially.

Current: `recall@8 = 94%`. MMR is off because the eval measured it at 76%; it
penalises chunks for resembling ones already picked, which is wrong when a
question legitimately wants several related chunks.
