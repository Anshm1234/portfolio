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

// one screenshot: a real image if the project provides a path, otherwise a
// warm themed placeholder tile with the label (matches the site, ignores the
// data's cool default hues)
function Shot({ shot, className }) {
  if (typeof shot === 'string') {
    return <img className={className} src={shot} alt="" loading="lazy" />;
  }
  return (
    <div className={`${className} shot-ph`}>
      <span>{shot?.placeholder || 'Preview'}</span>
    </div>
  );
}

// ---- the in-place expanding detail view (FLIP grow from the card) ----
function ProjectDetail({ project, originRect, onClose }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const [shot, setShot] = useState(0);
  const shots = project.shots || [];
  const techs = techsOf(project.stack);
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
          {/* LEFT — photos, framed as a desktop browser window (16:9) */}
          <div className="pd-left">
            <div className="pd-browser">
              <div className="pd-browser-bar" aria-hidden="true">
                <i className="pd-dot" /><i className="pd-dot" /><i className="pd-dot" />
                <span className="pd-url">{siteLabel}</span>
              </div>
              <Shot shot={shots[shot]} className="pd-hero" />
            </div>
            {shots.length > 1 && (
              <div className="pd-thumbs">
                {shots.map((s, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`pd-thumb ${i === shot ? 'on' : ''}`}
                    onClick={() => setShot(i)}
                    aria-label={`View shot ${i + 1}`}
                  >
                    <Shot shot={s} className="pd-thumb-img" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — name, moving stack, description, links */}
          <div className="pd-right">
            <h3 className="pd-title">{project.title}</h3>

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
              {project.demo && (
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
function ProjectCard({ project, index, onOpen }) {
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
          {project.demo && (
            <a className="pc-link" href={project.demo} target="_blank" rel="noopener">Live ↗</a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
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
            <ProjectCard key={p.title} project={p} index={i} onOpen={openDetail} />
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
        />
      )}
    </section>
  );
}
