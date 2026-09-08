// ============================================================
// ASK PANEL — the FAQ bot's UI. Floating button bottom-left (bottom-right
// belongs to the game launcher), opening a small chat panel.
//
// Talks only to /api/ask, which holds the API key. Answers arrive as SSE and
// are painted token-by-token, so the panel shows progress instead of sitting
// blank for two seconds.
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import './AskPanel.css';

const SUGGESTIONS = [
  "What's Ansh studying?",
  'Tell me about Career Ops',
  'What has he built with ML?',
  'How do I get in touch?',
];

// The endpoint streams `event: <name>` / `data: <json>` pairs. EventSource
// can't POST, so we read the body stream and split frames ourselves.
async function* readSSE(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // Frames are separated by a blank line; the last piece may be partial.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const event = frame.match(/^event: (.+)$/m)?.[1];
      const data = frame.match(/^data: (.+)$/m)?.[1];
      if (event && data) yield { event, data: JSON.parse(data) };
    }
  }
}

export default function AskPanel() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]); // {role, content}
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Keep the newest message in view as tokens stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy, error]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Esc closes — and cancels an in-flight answer rather than orphaning it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        abortRef.current?.abort();
        setOpen(false);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q || busy) return;

      setDraft('');
      setError(null);
      setBusy(true);

      // Snapshot the history BEFORE adding this turn — the server appends the
      // question itself, so sending it in history too would duplicate it.
      const history = turns.map(({ role, content }) => ({ role, content }));
      setTurns((t) => [
        ...t,
        { role: 'user', content: q },
        { role: 'assistant', content: '' },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          // 400/429 come back as plain JSON, not a stream.
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Something went wrong. Try again in a moment.');
        }

        for await (const { event, data } of readSSE(res.body)) {
          if (event === 'delta') {
            setTurns((t) => {
              const next = [...t];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                role: 'assistant',
                content: last.content + data.text,
              };
              return next;
            });
          } else if (event === 'error') {
            throw new Error(data.error);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
        // Drop the empty assistant bubble — the error message replaces it.
        setTurns((t) => (t.at(-1)?.content === '' ? t.slice(0, -1) : t));
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, turns]
  );

  return (
    <>
      <button
        type="button"
        className={open ? 'ask-fab is-open' : 'ask-fab'}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ask-panel"
        aria-label={open ? 'Close the ask-me panel' : 'Ask me anything'}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 21 11.5Z" />
          )}
        </svg>
        <span>Ask me anything</span>
      </button>

      <div
        id="ask-panel"
        // Visibility is driven entirely by `hidden` below — CSS keys off
        // .ask-panel[hidden]. No second "open" class to drift out of sync.
        className="ask-panel"
        role="dialog"
        aria-label="Ask about Ansh"
        hidden={!open}
      >
        <header className="ask-head">
          <span className="ask-dot" aria-hidden="true" />
          <div>
            <strong>Ask about Ansh</strong>
            {/* The "from his own notes" caveat lives in the intro bubble
                below, in the bot's own voice. Naming her here keeps the
                identity visible after the intro scrolls out of view. */}
            <small>Masala Dosa · portfolio assistant</small>
          </div>
        </header>

        <div className="ask-scroll" ref={scrollRef}>
          {turns.length === 0 && !error && (
            <div className="ask-empty">
              <p>Ask me about his background, projects, or stack.</p>
              <div className="ask-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>

              {/* The intro is an ordinary assistant bubble, so the first thing
                  in the panel already looks like the conversation you're about
                  to have. Static text, not a model call — spending quota and a
                  second of latency on a fixed string would be a bad trade. */}
              <div className="ask-msg ask-assistant">
                I'm <strong>Masala Dosa</strong>, Ansh's FAQ assistant. Everything I know
                comes from his own notes, Throw a question.
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div
              key={i}
              className={`ask-msg ask-${t.role}`}
              // Only the streaming answer announces itself; announcing every
              // bubble would make a screen reader re-read the transcript.
              aria-live={
                t.role === 'assistant' && i === turns.length - 1 ? 'polite' : undefined
              }
            >
              {t.content || (
                <span className="ask-typing" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </div>
          ))}

          {error && <div className="ask-error">{error}</div>}
        </div>

        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question…"
            maxLength={500}
            disabled={busy}
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send question"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
