// ============================================================
// GAME LAUNCHER — mounts the untouched 3D game as a full-screen overlay.
//
// The game (../game/index.js) boots on import: it appends its canvas into
// #game-canvas (falling back to <body>) and drives the overlay DOM by id
// (#hint, #prompt, #panel*, #showcase*). So this component simply renders
// that exact DOM, then dynamically imports the game once, on launch.
//
// NOTE: the game has module-level state and no teardown, so we import it a
// single time and keep it alive; "Exit" hides the overlay rather than
// destroying the scene. (A future step can add real dispose/teardown.)
// ============================================================
import { useEffect, useRef } from 'react';
import { EMAIL, COMPOSE, SOCIALS } from '../data/contact.js';

let gameBooted = false;   // module-level: import the game exactly once

// the four social links shown in the Contact window (feather-style icons)
const CONTACT_SOCIALS = [
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
    icon: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.6 6.4-7A5.4 5.4 0 0 0 20 4.8 5.1 5.1 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5.1 5.1 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22" />,
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

export default function GameLauncher({ onExit }) {
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (!gameBooted) {
      gameBooted = true;
      // dynamic import → the game's setup side-effects run now, not on page load
      import('../game/index.js');
    }
  }, []);

  return (
    <div className="game-overlay">
      {/* the canvas mounts here (game appends renderer.domElement) */}
      <div id="game-canvas" className="game-canvas" />

      {/* the game's existing overlay UI, by the ids main.js/showcase.js expect */}
      <div id="hint">WASD / Arrows to move · E to interact · walk off the edge, I dare you</div>
      <div id="prompt"><kbd className="prompt-key">E</kbd><span id="prompt-label"></span></div>
      <div id="panel">
        <span id="panel-close">✕</span>
        <h2 id="panel-title"></h2>
        <p id="panel-body"></p>
        <a id="panel-link" target="_blank" rel="noopener"></a>
      </div>

      {/* PC showcase — styled as the in-world monitor: bezel + phosphor screen */}
      <div id="showcase" aria-hidden="true">
        <div id="sc-frame">
          {/* terminal chrome: window title + traffic-light controls (the red
              one is the real Back button showcase.js wires by #sc-exit) */}
          <div id="sc-titlebar">
            <span className="sc-tb-name">▶ ~/projects<b className="sc-caret" aria-hidden="true">_</b></span>
            <span className="sc-tb-win">
              <i className="sc-win sc-win-min" aria-hidden="true"></i>
              <i className="sc-win sc-win-max" aria-hidden="true"></i>
              <button type="button" id="sc-exit" className="sc-win sc-win-close"
                title="Back (Esc)" aria-label="Exit showcase"></button>
            </span>
          </div>

          <div id="sc-screen">
            <div id="sc-body">
              <div id="sc-gallery">
                <div id="sc-shots"></div>
                <button type="button" className="sc-arrow" id="sc-prev" aria-label="Previous screenshot">‹</button>
                <button type="button" className="sc-arrow" id="sc-next" aria-label="Next screenshot">›</button>
                <div id="sc-shotdots"></div>
              </div>
              <div id="sc-info">
                <div id="sc-count"></div>
                <h2 id="sc-title"></h2>
                <div id="sc-stack"></div>
                <p id="sc-desc"></p>
                <div id="sc-tabs">
                  <a id="sc-demo" className="sc-tab" target="_blank" rel="noopener">Live Demo ↗</a>
                  <a id="sc-repo" className="sc-tab sc-tab-ghost" target="_blank" rel="noopener">GitHub Repo ↗</a>
                </div>
                <div id="sc-nav">
                  <button type="button" id="sc-navprev" className="sc-navbtn" aria-label="Previous project">‹ Prev</button>
                  <div id="sc-projdots"></div>
                  <button type="button" id="sc-navnext" className="sc-navbtn" aria-label="Next project">Next ›</button>
                </div>
              </div>
            </div>
            {/* decorative CRT overlays — never intercept clicks */}
            <div className="sc-scanlines" aria-hidden="true"></div>
            <div className="sc-vignette" aria-hidden="true"></div>
          </div>
        </div>
      </div>

      {/* ABOUT window — the hamster's cozy profile card (E at the About station) */}
      <div id="about-card" aria-hidden="true">
        <div className="ab-frame">
          <button type="button" id="ab-exit" className="ab-close"
            title="Close (Esc)" aria-label="Close about">✕</button>

          <div className="ab-head">
            <span className="ab-eyebrow">ABOUT</span>
            <span className="ab-eyebrow ab-eyebrow-strong">ME</span>
          </div>

          <div className="ab-body">
            <div className="ab-left">
              <h2 className="ab-name">Ansh Madaan</h2>
              <p className="ab-role">Full Stack Developer</p>
              <p className="ab-bio">
                Final-year CS student, part-time <em>gym rat</em>, and full-time
                can't-leave-a-half-built-idea-alone. Runs on <em>late nights</em>,
                too much coffee, and the same energy as this hamster — always
                moving, no idea how to stop.
              </p>
              <ul className="ab-facts">
                <li><b>B.E. CSE</b> · Thapar Institute of Engineering &amp; Technology</li>
                <li><b>CGPA</b> 9.12</li>
              </ul>

              {/* the hamster keeps running while you read — same wheel as the
                  launch loader (CSS lives in the site's index.css) */}
              <div className="ab-wheel">
                <div className="wheel-and-hamster" role="img" aria-label="Hamster running in a wheel">
                  <div className="wheel" />
                  <div className="hamster">
                    <div className="hamster__body">
                      <div className="hamster__head">
                        <div className="hamster__ear" />
                        <div className="hamster__eye" />
                        <div className="hamster__nose" />
                      </div>
                      <div className="hamster__limb hamster__limb--fr" />
                      <div className="hamster__limb hamster__limb--fl" />
                      <div className="hamster__limb hamster__limb--br" />
                      <div className="hamster__limb hamster__limb--bl" />
                      <div className="hamster__tail" />
                    </div>
                  </div>
                  <div className="spoke" />
                </div>
                <span className="ab-wheel-cap">still running…</span>
              </div>
            </div>

            <div className="ab-right">
              <div className="ab-photo">
                <img src="/lanyard/ansh.webp" alt="Ansh Madaan" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTACT window — get in touch (E at the Contact station) */}
      <div id="contact-card" aria-hidden="true">
        <div className="ct-frame">
          <button type="button" id="ct-exit" className="ab-close"
            title="Close (Esc)" aria-label="Close contact">✕</button>

          <div className="ab-head">
            <span className="ab-eyebrow">GET IN</span>
            <span className="ab-eyebrow ab-eyebrow-strong">TOUCH</span>
          </div>

          <div className="ctg-body">
            {/* LEFT — work together + all the links */}
            <div className="ctg-left">
              <h3 className="ctg-h">Let&rsquo;s Work Together</h3>
              <p className="ctg-p">
                I&rsquo;m currently open to internships, freelance work, and
                collaborative projects. Got an idea or an opportunity? Reach out —
                I&rsquo;d love to hear from you.
              </p>

              <div className="ctg-socials">
                {CONTACT_SOCIALS.map((l) => (
                  <a key={l.id} className="ctg-social" href={l.href}
                    target="_blank" rel="noopener" aria-label={l.label} title={l.label}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {l.icon}
                    </svg>
                  </a>
                ))}
              </div>

              <a className="ctg-mail" href={COMPOSE} target="_blank" rel="noopener">{EMAIL}</a>
            </div>

            {/* RIGHT — the message form */}
            <form className="ctg-form" id="ct-form" noValidate>
              <h3 className="ctg-h">Send a Message</h3>
              <div className="ctg-field">
                <label htmlFor="ctg-name">Name</label>
                <input id="ctg-name" name="name" type="text" placeholder="Your name" required />
              </div>
              <div className="ctg-field">
                <label htmlFor="ctg-email">Email</label>
                <input id="ctg-email" name="email" type="email" placeholder="you@email.com" required />
              </div>
              <div className="ctg-field">
                <label htmlFor="ctg-message">Message</label>
                <textarea id="ctg-message" name="message" rows="4" placeholder="Your message…" required />
              </div>
              <button type="submit" className="ctg-send" id="ct-send">Send Message ↗</button>
              <p className="ctg-status" id="ct-status" role="status" aria-live="polite"></p>
            </form>
          </div>
        </div>
      </div>

      {/* the site's own control: exit the game (bottom-right, same spot as launch) */}
      <button type="button" className="game-exit-btn" onClick={onExit}>✕ Exit game</button>
    </div>
  );
}
