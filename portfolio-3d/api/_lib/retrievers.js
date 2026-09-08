// ============================================================
// RETRIEVERS — the standard RAG retrieval step, on LangChain.
//
//   search(question) -> { mode, chunks: [{id, heading, text, score}] }
//
// vector mode is the textbook pipeline: embed the question, cosine-compare it
// against the stored chunk vectors, take the top k. LangChain's
// MemoryVectorStore does the storage and the similarity maths; the only thing
// we supply is an Embeddings implementation that sends Gemini's retrieval task
// types (see embeddings.js for why that isn't optional).
//
// stuff-all is the fallback: no vectors generated yet (a fresh clone), or the
// vectors are stale relative to the corpus. It answers correctly from current
// text, so degrading to it loses RAG without losing accuracy.
// ============================================================
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { CHUNKS, CORPUS_TOKENS, CORPUS_FINGERPRINT } from './knowledge.generated.js';
import { STUFF_ALL_CEILING_TOKENS, RETRIEVAL } from './config.js';
import { GeminiRetrievalEmbeddings } from './embeddings.js';

class StaleVectorsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StaleVectorsError';
  }
}

class StuffAllRetriever {
  mode = 'stuff-all';

  async search() {
    return { mode: this.mode, chunks: CHUNKS.map((c) => ({ ...c, score: 1 })) };
  }
}

class VectorRetriever {
  mode = 'vector';
  #store = null;

  constructor({ topK = RETRIEVAL.topK, useMmr = RETRIEVAL.useMmr } = {}) {
    this.topK = topK;
    this.useMmr = useMmr;
  }

  // Built once per warm instance. The chunk vectors are read from the file the
  // ingest step wrote — addVectors, not addDocuments, so nothing is re-embedded
  // per request. Only the question gets an API call.
  async #getStore() {
    if (this.#store) return this.#store;

    const { VECTORS, VECTOR_FINGERPRINT } = await import('./embeddings.generated.js');

    // The vectors are regenerated only by `ingest --embed`, so an ordinary
    // build after editing about-me.md leaves them behind. Serving a stale
    // vector file is the worst outcome — it silently answers from content the
    // author already corrected — so refuse it and let the caller fall back.
    if (VECTOR_FINGERPRINT !== CORPUS_FINGERPRINT) {
      throw new StaleVectorsError(
        `vectors were built from corpus ${VECTOR_FINGERPRINT}, current corpus is ` +
          `${CORPUS_FINGERPRINT}. Run \`npm run ingest -- --embed\`.`
      );
    }

    // Text comes from CHUNKS, joined by id — the vector file stores no text of
    // its own, so retrieved content is always the current content.
    const byId = new Map(CHUNKS.map((c) => [c.id, c]));
    const usable = VECTORS.filter((v) => byId.has(v.id));

    const store = new MemoryVectorStore(new GeminiRetrievalEmbeddings());
    await store.addVectors(
      usable.map((v) => v.embedding),
      usable.map((v) => {
        const chunk = byId.get(v.id);
        return new Document({
          pageContent: chunk.text,
          metadata: { id: chunk.id, heading: chunk.heading, source: chunk.source },
        });
      })
    );

    this.#store = store;
    return store;
  }

  async search(question) {
    let store;
    try {
      store = await this.#getStore();
    } catch (err) {
      if (!(err instanceof StaleVectorsError)) throw err;
      // Stuff-all still answers correctly from the up-to-date text, so degrade
      // to it rather than 500. The content stays right; only RAG is off.
      console.error(`[retriever] STALE VECTORS — falling back to stuff-all. ${err.message}`);
      return new StuffAllRetriever().search(question);
    }

    // MMR penalises a candidate for resembling ones already chosen. Plain
    // cosine happily fills every slot with near-duplicates, which is what made
    // a five-chunk question return two of the five it needed.
    const results = this.useMmr
      ? (
          await store.maxMarginalRelevanceSearch(question, {
            k: this.topK,
            fetchK: RETRIEVAL.fetchK,
            lambda: RETRIEVAL.lambda,
          })
        ).map((doc) => [doc, null])
      : await store.similaritySearchWithScore(question, this.topK);

    return {
      mode: this.useMmr ? 'vector+mmr' : 'vector',
      chunks: results.map(([doc, score]) => ({
        id: doc.metadata.id,
        heading: doc.metadata.heading,
        source: doc.metadata.source,
        text: doc.pageContent,
        score,
      })),
    };
  }
}

let cached;

export function getRetriever() {
  if (cached) return cached;
  cached =
    process.env.RETRIEVER === 'vector'
      ? new VectorRetriever()
      : new StuffAllRetriever();
  return cached;
}

export const corpusStatus = () => ({
  tokens: CORPUS_TOKENS,
  ceiling: STUFF_ALL_CEILING_TOKENS,
  chunks: CHUNKS.length,
  overCeiling: CORPUS_TOKENS > STUFF_ALL_CEILING_TOKENS,
});
