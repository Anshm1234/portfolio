// ============================================================
// CONFIG — every Gemini model ID and endpoint in one place.
//
// ⚠️ VERIFY THESE. They were written without access to Google's docs, and
// model IDs churn faster than anything else in this codebase. Run
// `npm run check:gemini` once your key is in .env.local — it pings the API
// and tells you exactly which of these are wrong and what to use instead.
//
// Everything else in the FAQ backend reads from here, so correcting a model
// ID is a one-line change in one file.
// ============================================================

export const GEMINI = {
  base: 'https://generativelanguage.googleapis.com/v1beta',

  // The model that writes the answers.
  //
  // NOT gemini-2.5-flash: its free tier allows 20 requests PER DAY
  // (GenerateRequestsPerDayPerProjectPerModel-FreeTier), which one visitor
  // asking five questions would burn a quarter of. The quota is per-model, so
  // a newer model is a fresh allowance rather than a share of the same one.
  //
  // Lite, specifically: this is recall over ~900 tokens of reference text, not
  // reasoning. The full flash models are thinking models and returned empty
  // text at small token caps because thinking consumed the budget; the lite
  // models answer immediately and cost less quota per question.
  chatModel: 'gemini-3.5-flash-lite',

  // The embedding model, used at ingest (documents) and query time.
  embedModel: 'gemini-embedding-001',

  // Cutting dimensionality down from the model's default keeps the committed
  // JSON store small. 768 is plenty of headroom for a corpus this size.
  embedDimensions: 768,

  // Gemini distinguishes document vs query embeddings the way Voyage does —
  // asymmetric embeddings measurably beat symmetric ones for retrieval, and
  // mismatching the two sides quietly degrades every result.
  taskTypeDocument: 'RETRIEVAL_DOCUMENT',
  taskTypeQuery: 'RETRIEVAL_QUERY',
};

// Answer shaping.
export const ANSWER = {
  // A backstop, not the mechanism. Length is controlled by the prompt — this
  // just stops a runaway. Set it too tight and answers truncate mid-sentence,
  // which looks broken rather than concise. ~300 tokens is roughly 4 sentences,
  // so a well-behaved 2-3 sentence answer never comes near it.
  maxOutputTokens: 300,
  temperature: 0.3, // low: this is recall, not creative writing
  maxQuestionChars: 500,
  maxHistoryTurns: 6,

  // null = omit thinkingConfig from the request entirely.
  //
  // The lite models don't think, and they reject the parameter outright with
  // a 400 "Request contains an invalid argument" — so sending thinkingBudget:0
  // to gemini-3.5-flash-lite breaks every call, even though 0 is what it
  // already does. Set a number here ONLY if chatModel is a thinking model
  // (e.g. gemini-3.5-flash), where thinking is on by default and costs quota:
  // measured on 2.5-flash, a one-word answer burned 18 thinking tokens
  // (34 total vs 16 with it disabled).
  thinkingBudget: null,
};

/**
 * The generationConfig every request sends.
 *
 * This lives here, shared by api/ask.js and scripts/check-gemini.mjs, because
 * they diverged once and it cost an afternoon: the checker sent a bare config,
 * reported "All good", and the real endpoint 400'd on the thinkingConfig that
 * only it was sending. A green check has to exercise the same shape production
 * does, or it isn't a check.
 */
export function buildGenerationConfig() {
  const config = {
    maxOutputTokens: ANSWER.maxOutputTokens,
    temperature: ANSWER.temperature,
  };
  // Only thinking models accept this key; the lite models 400 on it.
  if (ANSWER.thinkingBudget !== null && ANSWER.thinkingBudget !== undefined) {
    config.thinkingConfig = { thinkingBudget: ANSWER.thinkingBudget };
  }
  return config;
}

// Retrieval tuning. These are the numbers the eval exists to justify — don't
// change them on intuition, change them because recall@k moved.
export const RETRIEVAL = {
  topK: 8, // chunks sent to the model

  // MMR is OFF, and that was a measurement, not a preference. Measured on the
  // eval set: plain cosine 92% recall@8, MMR 67%.
  //
  // MMR penalises a candidate for resembling ones already selected. That helps
  // when near-duplicates crowd out genuinely different chunks — but it's the
  // wrong objective for "list all his hobbies", where Badminton, Cycling and
  // Sketching ARE mutually similar and all three are wanted. MMR dropped two
  // of them for being too on-topic.
  //
  // Revisit if the corpus grows enough to contain real near-duplicates.
  // `npm run eval:retrieval` is how you'd decide, not intuition.
  useMmr: false,
  fetchK: 25, // MMR candidate pool, when enabled
  lambda: 0.5, // 1 = pure relevance, 0 = pure diversity
};

// Above this the whole corpus stops comfortably fitting in one prompt and
// retrieval starts earning its complexity.
export const STUFF_ALL_CEILING_TOKENS = 8_000;
