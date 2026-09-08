// ============================================================
// EMBEDDINGS — a LangChain Embeddings implementation that actually applies
// Gemini's retrieval task types.
//
// WHY THIS EXISTS. LangChain's built-in GoogleGenerativeAIEmbeddings defaults
// `taskType` to undefined, so embedDocuments() and embedQuery() return
// byte-identical vectors for identical text. Measured: 3072/3072 components
// identical. Gemini prepends a different instruction for documents vs queries,
// and losing that asymmetry measurably wrecks retrieval — on this corpus it
// took recall on a five-chunk question from usable to 0/5.
//
// It also accepts `outputDimensionality` and then ignores it (asked for 768,
// got 3072). A silently-dropped parameter is worse than a rejected one.
//
// Subclassing Embeddings is LangChain's documented extension point, so this
// plugs into MemoryVectorStore, retrievers and MMR like any other embeddings
// object — it just sends the two parameters that matter.
// ============================================================
import { Embeddings } from '@langchain/core/embeddings';
import { GEMINI } from './config.js';

export class GeminiRetrievalEmbeddings extends Embeddings {
  constructor(fields = {}) {
    super(fields);
    this.model = fields.model ?? GEMINI.embedModel;
    this.dimensions = fields.dimensions ?? GEMINI.embedDimensions;
    this.apiKey = fields.apiKey ?? process.env.GEMINI_API_KEY;
  }

  async #embed(texts, taskType) {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY is not set');

    const res = await fetch(
      `${GEMINI.base}/models/${this.model}:batchEmbedContents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${this.model}`,
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: this.dimensions,
          })),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`gemini embed ${res.status}: ${await res.text()}`);
    }

    const { embeddings } = await res.json();
    const vectors = (embeddings ?? []).map((e) => e.values);
    if (vectors.length !== texts.length) {
      throw new Error(
        `expected ${texts.length} embeddings, got ${vectors.length}`
      );
    }
    // Normalise here so every downstream similarity is a plain dot product and
    // nothing else has to remember to do it. MMR's internal maths assumes
    // comparable magnitudes too.
    return vectors.map(normalize);
  }

  /** Corpus side. */
  embedDocuments(texts) {
    return this.#embed(texts, GEMINI.taskTypeDocument);
  }

  /** Query side — the asymmetric counterpart. */
  async embedQuery(text) {
    const [vector] = await this.#embed([text], GEMINI.taskTypeQuery);
    return vector;
  }
}

export function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  return norm === 0 ? vec : vec.map((v) => v / norm);
}
