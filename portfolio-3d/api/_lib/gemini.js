// ============================================================
// GEMINI — the streaming generation call.
//
// Embedding lives in embeddings.js as a LangChain Embeddings subclass, so the
// vector store and retrievers can use it directly. This file is only the
// generation half.
//
// Deliberately fetch-based rather than an SDK: it's one endpoint, it adds no
// dependency to the serverless bundle, and when a field name needs correcting
// the fix is visible right here instead of buried in a wrapper.
// ============================================================
import { GEMINI } from './config.js';

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('GEMINI_API_KEY is not set', 401);
  return key;
}

async function post(path, body) {
  const res = await fetch(`${GEMINI.base}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new GeminiError(`${path} failed: ${await res.text()}`, res.status);
  }
  return res;
}

/**
 * Stream an answer. Yields text deltas as they arrive.
 *
 * `alt=sse` makes Gemini emit Server-Sent Events instead of a JSON array that
 * only closes at the end — without it there's nothing to stream and the panel
 * would sit blank until the whole answer landed.
 */
export async function* streamAnswer({ system, history, question, generation }) {
  const res = await post(
    `models/${GEMINI.chatModel}:streamGenerateContent?alt=sse`,
    {
      // Gemini's equivalent of a system prompt. Kept separate from the turns
      // so a visitor's message can never be mistaken for an instruction.
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        ...history.map((m) => ({
          // Gemini names the assistant role 'model', not 'assistant'.
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: question }] },
      ],
      generationConfig: generation,
    }
  );

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  // Gemini terminates frames with CRLF (\r\n\r\n), not bare \n\n. Splitting on
  // "\n\n" matches nothing in "data: {...}\r\n\r\n", so every frame stays stuck
  // in the buffer and the stream silently yields no text at all. Match both.
  const FRAME_BREAK = /\r?\n\r?\n/;

  const parseFrame = function* (frame) {
    const line = frame.split(/\r?\n/).find((l) => l.startsWith('data: '));
    if (!line) return;
    const payload = line.slice(6).trim();
    if (!payload || payload === '[DONE]') return;

    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      return; // a malformed frame shouldn't kill the stream
    }

    const candidate = chunk.candidates?.[0];
    // A safety block ends the turn with no text — surface it rather than
    // letting the panel end on an empty bubble.
    if (candidate?.finishReason === 'SAFETY') {
      throw new GeminiError("I can't answer that one.", 200);
    }
    for (const part of candidate?.content?.parts ?? []) {
      if (part.text) yield part.text;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // The tail may be a partial frame — hold it back until the next read.
    const frames = buffer.split(FRAME_BREAK);
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      yield* parseFrame(frame);
    }
  }

  // A final frame with no trailing separator would otherwise be dropped.
  if (buffer.trim()) {
    yield* parseFrame(buffer);
  }
}


export { GeminiError };
