// ============================================================
// CONTACT WINDOW — the DOM overlay controller for the Contact station.
//
// Owns show/hide, the exit affordances (✕ / backdrop / Esc), and the
// message form. The form POSTs to FormSubmit (same endpoint as the site's
// Contact section); if that's unreachable it falls back to opening a
// pre-filled Gmail compose. All the links are static in the markup.
//
// ONE-TIME SETUP: submit the form once and click the activation link
// FormSubmit emails you; every message after that lands in your inbox.
// ============================================================
import { EMAIL } from '../data/contact.js';

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

export function setupContact(onExit) {
  const root = document.getElementById('contact-card');
  if (!root) return null;
  const exitBtn = document.getElementById('ct-exit');
  const form = document.getElementById('ct-form');
  const sendBtn = document.getElementById('ct-send');
  const statusEl = document.getElementById('ct-status');

  exitBtn.onclick = () => onExit && onExit();
  // tapping the dim backdrop (but not the card) exits
  root.onclick = (e) => { if (e.target === root) onExit && onExit(); };

  const setStatus = (cls, msg) => {
    statusEl.className = 'ctg-status' + (cls ? ' ' + cls : '');
    statusEl.textContent = msg || '';
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name'), email = data.get('email'), message = data.get('message');
    sendBtn.disabled = true;
    setStatus('', 'Sending…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message, _subject: `Portfolio message from ${name}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok', 'Message sent — thank you! I’ll reply soon.');
      form.reset();
    } catch {
      // service unreachable — open a pre-filled Gmail compose instead
      setStatus('err', 'Couldn’t reach the form service — opening an email draft instead.');
      window.open(
        'https://mail.google.com/mail/?view=cm&fs=1'
        + `&to=${EMAIL}&su=${encodeURIComponent(`Portfolio message from ${name}`)}`
        + `&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`,
        '_blank',
      );
    } finally {
      sendBtn.disabled = false;
    }
  };

  return {
    open() { root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); },
    close() { root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); },
  };
}
