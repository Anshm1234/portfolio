// ============================================================
// PROJECTS — a horizontal gallery that matches the warm theme.
//   • DESKTOP: the section pins and the card track slides sideways as you
//     scroll down (GSAP ScrollTrigger). MOBILE: the pin is dropped and the
//     track becomes a native scroll-snap swipe strip.
//   • Each card is a themed panel with a cursor-tracking spotlight, grows on
//     hover, and carries GitHub / Live Demo links.
//   • Clicking a card EXPANDS IT IN PLACE (a FLIP grow from the card's own
//     rect) into a detail view: photos left; name, a moving tech-stack
//     marquee, description, and links on the right. Esc / ✕ / backdrop
//     collapses it back into the card.
// Projects come from ../data/projects (shared with the 3D game).
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { PROJECTS } from '../data/projects/index.js';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const techsOf = (stack) => (stack || '').split('·').map((s) => s.trim()).filter(Boolean);

// a project whose demo is the sentinel "game" launches the 3D world instead of
// opening a URL; its button label comes from demoLabel (fallback "Live Demo").
const isGameDemo = (p) => p.demo === 'game';

// a shot is either a resolved image ({ src, name } or a bare path string) or a
// { placeholder, hue } tile. srcOf pulls the image url; nameOf pulls a caption.
const srcOf = (shot) => (typeof shot === 'string' ? shot : shot?.src) || null;
const nameOf = (shot) => {
  const raw = shot?.name || (typeof shot === 'string' ? shot.split('/').pop() : shot?.placeholder) || '';
  return raw.replace(/\.[^.]+$/, '');   // drop the file extension for the caption
};

// one screenshot: a real image if the project provides one, otherwise a warm
// themed placeholder tile with the label (matches the site, ignores the data's
// cool default hues)
function Shot({ shot, className }) {
  const src = srcOf(shot);
  if (src) {
    return <img className={className} src={src} alt="" loading="lazy" />;
  }
  return (
    <div className={`${className} shot-ph`}>
      <span>{shot?.placeholder || 'Preview'}</span>
    </div>
  );
}

// ---- the in-place expanding detail view (FLIP grow from the card) ----
function ProjectDetail({ project, originRect, onClose, onPlay }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const [shot, setShot] = useState(0);
  const [shotAR, setShotAR] = useState(null);   // natural aspect of the current shot
  const shots = project.shots || [];
  const techs = techsOf(project.stack);

  // measure the current screenshot's real proportions so the window frame
  // matches it exactly (no letterboxing, no crop)
  useEffect(() => {
    const src = srcOf(shots[shot]);
    if (!src) { setShotAR(null); return; }
    let live = true;
    const img = new Image();
    img.onload = () => { if (live) setShotAR(img.naturalWidth / img.naturalHeight); };
    img.src = src;
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, project]);
  // a fake address-bar label so the shot reads as a real desktop browser window
  const siteLabel = (() => {
    try {
      return project.demo ? new URL(project.demo).hostname.replace(/^www\./, '')
        : `${project.title.toLowerCase().replace(/\s+/g, '-')}.app`;
    } catch { return `${project.title.toLowerCase().replace(/\s+/g, '-')}.app`; }
  })();

  // FLIP open: start the panel sized/placed over the clicked card, then grow
  useLayoutEffect(() => {
    document.body.classList.add('pd-open');
    const panel = panelRef.current;
    const p = panel.getBoundingClientRect();
    const o = originRect;
    const dx = (o.left + o.width / 2) - (p.left + p.width / 2);
    const dy = (o.top + o.height / 2) - (p.top + p.height / 2);
    gsap.set(panel, { transformOrigin: 'center center', x: dx, y: dy, scaleX: o.width / p.width, scaleY: o.height / p.height });
    gsap.set(contentRef.current, { opacity: 0 });
    gsap.set(overlayRef.current, { opacity: 0 });
    const tl = gsap.timeline();
    tl.to(overlayRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
      .to(panel, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: 'power3.inOut' }, 0)
      .to(contentRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.32);
    return () => document.body.classList.remove('pd-open');
  }, [originRect]);

  // collapse back into the card, then unmount
  const close = () => {
    const panel = panelRef.current;
    const p = panel.getBoundingClientRect();
    const o = originRect;
    const dx = (o.left + o.width / 2) - (p.left + p.width / 2);
    const dy = (o.top + o.height / 2) - (p.top + p.height / 2);
    gsap.timeline({ onComplete: onClose })
      .to(contentRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .to(panel, { x: dx, y: dy, scaleX: o.width / p.width, scaleY: o.height / p.height, duration: 0.5, ease: 'power3.inOut' }, 0.06)
      .to(overlayRef.current, { opacity: 0, duration: 0.3 }, '<0.15');
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pd-overlay" ref={overlayRef} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="pd-panel" ref={panelRef} style={{ '--accent': 'var(--wood)' }}>
        <button type="button" className="pd-close" onClick={close} aria-label="Close">✕</button>
        <div className="pd-content" ref={contentRef}>
          {/* LEFT — title above the browser window, then the shot + thumbs */}
          <div className="pd-left">
            <h3 className="pd-title">{project.title}</h3>
            <div className="pd-browser" style={{ '--shot-ar': shotAR ?? 1900 / 900 }}>
              <div className="pd-browser-bar" aria-hidden="true">
                <i className="pd-dot" /><i className="pd-dot" /><i className="pd-dot" />
                <span className="pd-url">
                  <svg className="pd-lock" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" />
                  </svg>
                  {siteLabel}
                </span>
              </div>
              <Shot shot={shots[shot]} className="pd-hero" />
            </div>
            {shots.length > 1 && (
              <div className="pd-thumbs">
                {shots.map((s, i) => (
                  <div className="pd-thumb-wrap" key={i}>
                    <button
                      type="button"
                      className={`pd-thumb ${i === shot ? 'on' : ''}`}
                      onClick={() => setShot(i)}
                      aria-label={`View ${nameOf(s) || `shot ${i + 1}`}`}
                    >
                      <Shot shot={s} className="pd-thumb-img" />
                    </button>
                    <span className="pd-thumb-name" title={nameOf(s)}>{nameOf(s)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — overview: stack, description, links */}
          <div className="pd-right">
            <span className="pd-eyebrow">Overview</span>
            <div className="pd-stack" aria-label="Tech stack">
              <div className="pd-stack-track">
                {[0, 1].map((dup) => (
                  <div className="pd-stack-set" key={dup} aria-hidden={dup === 1}>
                    {techs.map((t) => <span className="pd-chip" key={t}>{t}</span>)}
                  </div>
                ))}
              </div>
            </div>

            <p className="pd-desc">{project.description}</p>

            <div className="pd-links">
              {project.repo && (
                <a className="pd-link" href={project.repo} target="_blank" rel="noopener">GitHub ↗</a>
              )}
              {isGameDemo(project) ? (
                <button
                  type="button"
                  className="pd-link pd-link-solid"
                  onClick={() => { onClose?.(); onPlay?.(); }}
                >
                  {project.demoLabel || 'Live Demo'} ▶
                </button>
              ) : project.demo && (
                <a className="pd-link pd-link-solid" href={project.demo} target="_blank" rel="noopener">Live Demo ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- a single project card in the track ----
function ProjectCard({ project, index, onOpen, onPlay }) {
  const ref = useRef(null);
  const techs = techsOf(project.stack).slice(0, 4);
  const cover = (project.shots && project.shots[0]) || null;

  // cursor-tracking spotlight (Magic Card idea, hand-rolled)
  const onMove = (e) => {
    const el = ref.current, r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const open = () => onOpen(index, ref.current.getBoundingClientRect());

  return (
    <article
      className="proj-card2"
      ref={ref}
      onMouseMove={onMove}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.title} details`}
    >
      {/* cover preview — makes the card visual, with a big ghost index */}
      <div className="pc-cover">
        <Shot shot={cover} className="pc-cover-img" />
        <span className="pc-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="pc-hint">View details →</span>
      </div>

      <div className="pc-body">
        <h3 className="pc-title">{project.title}</h3>
        <p className="pc-desc">{project.description}</p>
        <div className="pc-chips">
          {techs.map((t) => <span className="pc-chip" key={t}>{t}</span>)}
        </div>
        <div className="pc-links" onClick={(e) => e.stopPropagation()}>
          {project.repo && (
            <a className="pc-link" href={project.repo} target="_blank" rel="noopener">GitHub ↗</a>
          )}
          {isGameDemo(project) ? (
            <button type="button" className="pc-link pc-link-btn" onClick={onPlay}>
              {project.demoLabel || 'Live'} ▶
            </button>
          ) : project.demo && (
            <a className="pc-link" href={project.demo} target="_blank" rel="noopener">Live ↗</a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects({ onPlay }) 
{
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const titleRef = useRef(null);
  const [detail, setDetail] = useState(null);   // { project, rect } | null

  const openDetail = (index, rect) => setDetail({ project: PROJECTS[index], rect });

  // ---- WORK IN PEACE: characters near the cursor corrupt into glyphs, then
  //      scramble back — the same effect as About's STAY CALM ----
  useEffect(() => {
    const el = titleRef.current;
    const split = SplitText.create(el, { type: 'chars' });
    for (const ch of split.chars) ch.dataset.orig = ch.textContent;
    const RADIUS = 130;
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

  // ---- desktop: pin the section, slide the track sideways on vertical scroll.
  //      mobile: no pin (CSS makes the track a native swipe strip).
  useEffect(() => {
    const section = sectionRef.current, track = trackRef.current;
    if (!section || !track) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 760px)', () => {
      const amount = () => Math.max(0, track.scrollWidth - section.offsetWidth);
      if (amount() <= 0) return;                 // everything fits — no scroll needed
      const tween = gsap.to(track, {
        x: () => -amount(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + amount(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); gsap.set(track, { clearProps: 'x' }); };
    });
    // the pin-spacer this section inserts shifts everything below it — make
    // sure every other trigger recomputes against the new page height
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, []);

  return (
    <section className="projects-sec" id="projects" ref={sectionRef}>
      <div className="proj-viewport">
        <div className="proj-track" ref={trackRef}>
          {/* intro title panel — "WORK IN PEACE", styled like About's STAY CALM */}
          <div className="proj-intro">
            <h2 className="work-peace" ref={titleRef} aria-label="Work in peace">
              <span className="wp-1">WORK</span>
              <span className="wp-2">IN PEACE</span>
            </h2>
            <span className="wp-hint">scroll →&nbsp;&nbsp;·&nbsp;&nbsp;hover the words</span>
          </div>

          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.title} project={p} index={i} onOpen={openDetail} onPlay={onPlay} />
          ))}
          <div className="proj-end" aria-hidden="true">
            <span>More soon...</span>
          </div>
        </div>
      </div>

      {/* horizontal scroll progress (desktop) */}
      <div className="proj-progress" aria-hidden="true">
        <span className="proj-progress-fill" ref={progressRef} />
      </div>

      {detail && (
        <ProjectDetail
          project={detail.project}
          originRect={detail.rect}
          onClose={() => setDetail(null)}
          onPlay={onPlay}
        />
      )}
    </section>
  );
}
