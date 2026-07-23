// ============================================================
// CONTACT — "GET IN TOUCH", the reference layout in the warm theme.
//   LEFT   the "Let's Work Together" card with the four circular social
//          buttons (LinkedIn / GitHub / Instagram / Email) and the address
//   RIGHT  "Send a Message" form card (name / email / message)
//   Title uses the site's Milkyway + Inter combo with the same cursor
//   scramble distortion as STAY CALM / WORK IN PEACE.
//
// Sending: with FORM_ENDPOINT set (a free Formspree form id), the form
// POSTs in the background and confirms inline. Left empty, it falls
// back to composing the message in the visitor's mail app.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { EMAIL, COMPOSE, SOCIALS } from '../data/contact.js';
import { attachMagnet } from '../utils/magnet.js';

// the four circular social buttons living in the "Let's Work Together" card.
// feather-style line icons — stroke inherits the button colour.
const SOCIAL_LINKS = [
  {
    id: 'linkedin', label: 'LinkedIn', href: SOCIALS.linkedin,
    icon: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.6A6.3 6.3 0 0 1 16 8Z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  {
    id: 'github', label: 'GitHub', href: SOCIALS.github,
    icon: (
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.6 6.4-7A5.4 5.4 0 0 0 20 4.8 5.1 5.1 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5.1 5.1 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22" />
    ),
  },
  {
    id: 'instagram', label: 'Instagram', href: SOCIALS.instagram,
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
  },
  {
    id: 'email', label: 'Email — let’s work together', href: SOCIALS.email,
    icon: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 7L22 7" />
      </>
    ),
  },
];

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

// FormSubmit forwards submissions straight to the inbox — no account needed.
// ONE-TIME SETUP: submit the form once and click the activation link that
// FormSubmit emails you; every message after that lands in your inbox.
// (Swap for a Formspree endpoint any time if you prefer.)
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

const LEAF_PATH = 'M2 22 C 2 10, 10 2, 22 2 C 22 12, 14 22, 2 22 Z';

// a handful of olive leaves drift down inside the card's leaf-layer
function spawnLeaves(layer) {
  const w = layer.clientWidth, h = layer.clientHeight;
  for (let i = 0; i < 7; i++) {
    const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaf.setAttribute('viewBox', '0 0 24 24');
    leaf.setAttribute('class', 'ct-leaf');
    leaf.innerHTML = `<path d="${LEAF_PATH}" fill="currentColor"/>`;
    const size = 10 + Math.random() * 9;
    leaf.style.width = `${size}px`;
    leaf.style.height = `${size}px`;
    leaf.style.left = `${Math.random() * w}px`;
    layer.appendChild(leaf);
    const dur = 2 + Math.random() * 1.6;
    gsap.fromTo(leaf,
      { y: -26, x: 0, rotation: Math.random() * 360 },
      { y: h + 30, x: (Math.random() - 0.5) * 70, rotation: `+=${180 + Math.random() * 200}`,
        duration: dur, ease: 'none', onComplete: () => leaf.remove() });
    gsap.to(leaf, { opacity: 0, delay: dur - 0.5, duration: 0.5 });
  }
}

// golden ember burst from the send button — the navbar-spark gold
function emberBurst(btn) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.className = 'ct-ember';
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, v = 44 + Math.random() * 90;
    gsap.to(s, {
      x: Math.cos(a) * v, y: Math.sin(a) * v - 24,
      opacity: 0, scale: 0.2, duration: 0.7 + Math.random() * 0.5,
      ease: 'power2.out', onComplete: () => s.remove(),
    });
  }
}

export default function Contact() {
  const titleRef = useRef(null);
  const cardRef = useRef(null);
  const formRef = useRef(null);
  const sendRef = useRef(null);
  const [status, setStatus] = useState(null);   // 'sending' | 'ok' | 'err' | null

  // cursor scramble — identical logic to the other section titles
  useEffect(() => {
    const el = titleRef.current;
    const split = SplitText.create(el, { type: 'chars' });
    for (const ch of split.chars) ch.dataset.orig = ch.textContent;
    const RADIUS = 120;
    const onMove = (e) => {
      for (const ch of split.chars) {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        if (d < RADIUS) {
          gsap.to(ch, {
            overwrite: true,
            duration: 0.9 * (1 - d / RADIUS) + 0.3,
            ease: 'none',
            scrambleText: { text: ch.dataset.orig, chars: '▓▒░#%&@!<>/', speed: 0.7 },
          });
        }
      }
    };
    el.addEventListener('pointermove', onMove);
    return () => { el.removeEventListener('pointermove', onMove); split.revert(); };
  }, []);

  // late lazy mount shifts layout — recompute every trigger's positions
  useEffect(() => { ScrollTrigger.refresh(); }, []);

  // seasonal leaves: hovering either card sheds a few olive leaves down it
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = [cardRef.current, formRef.current].filter(Boolean);
    const pairs = cards.map((card) => {
      const layer = card.querySelector('.leaf-layer');
      const enter = () => layer && spawnLeaves(layer);
      card.addEventListener('pointerenter', enter);
      return [card, enter];
    });
    return () => pairs.forEach(([c, fn]) => c.removeEventListener('pointerenter', fn));
  }, []);

  // magnetic pull on the send button + the social buttons in the card
  useEffect(() => attachMagnet(
    [sendRef.current, ...document.querySelectorAll('#contact .sd-btn')],
    { strength: 0.22, radius: 80 },
  ), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = data.get('name'), email = data.get('email'), message = data.get('message');
    emberBurst(sendRef.current);            // celebrate the send with gold embers
    setStatus('sending');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name, email, message,
          _subject: `Portfolio message from ${name}`,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok');
      form.reset();
    } catch {
      // service unreachable — open a pre-filled Gmail compose instead
      setStatus('err');
      window.open(
        'https://mail.google.com/mail/?view=cm&fs=1'
        + `&to=${EMAIL}&su=${encodeURIComponent(`Portfolio message from ${name}`)}`
        + `&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`,
        '_blank',
      );
    }
  };

  return (
    <section className="contact-sec section section-wide" id="contact">
      {/* centred header — same face + distortion as the other headline pieces */}
      <div className="git-head">
        <h2 className="git-title" ref={titleRef} aria-label="Get in touch">
          <span className="git-a">GET IN</span>
          <span className="git-b">TOUCH</span>
        </h2>
        <p className="git-sub">
          Have a project in mind or want to discuss potential opportunities?
          I&rsquo;d love to hear from you.
        </p>
      </div>

      <div className="contact-grid">
        {/* LEFT — the work-together card; the docked social buttons carry the
            email/github/etc. links, so no separate rows repeating them */}
        <div className="ct-left">
          <div className="ct-card" ref={cardRef}>
            <div className="leaf-layer" aria-hidden="true" />
            <h3>Let&rsquo;s Work Together</h3>
            {/* the social buttons — right above the availability text */}
            <div className="social-dock">
              {SOCIAL_LINKS.map((l) => (
                <a
                  key={l.id} className="sd-btn" href={l.href}
                  target="_blank" rel="noopener" aria-label={l.label} title={l.label}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {l.icon}
                  </svg>
                </a>
              ))}
            </div>
            <p>
              I&rsquo;m currently available for internships, freelance work, and
              collaborative projects. If you have an exciting opportunity or
              project idea, don&rsquo;t hesitate to reach out.
            </p>
            <a className="ct-mail-line" href={COMPOSE} target="_blank" rel="noopener">{EMAIL}</a>
          </div>
        </div>

        {/* RIGHT — the message form */}
        <form className="ct-form" ref={formRef} onSubmit={onSubmit}>
          <div className="leaf-layer" aria-hidden="true" />
          <h3>Send a Message</h3>
          <p className="ct-form-sub">Fill out the form below and I&rsquo;ll get back to you as soon as possible.</p>

          <div className="ct-field">
            <label htmlFor="ct-name">Name</label>
            <input className="ct-input" id="ct-name" name="name" type="text" placeholder="Your name" required />
          </div>
          <div className="ct-field">
            <label htmlFor="ct-email">Email</label>
            <input className="ct-input" id="ct-email" name="email" type="email" placeholder="Your email" required />
          </div>
          <div className="ct-field">
            <label htmlFor="ct-message">Message</label>
            <textarea className="ct-input" id="ct-message" name="message" placeholder="Your message" required />
          </div>

          <button className="ct-send" type="submit" ref={sendRef} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send Message ↗'}
          </button>
          {status === 'ok' && <p className="ct-status ok">Message sent — thank you! I&rsquo;ll reply soon.</p>}
          {status === 'err' && <p className="ct-status err">Couldn&rsquo;t reach the form service — I&rsquo;ve opened an email draft with your message instead.</p>}
        </form>
      </div>
    </section>
  );
}
