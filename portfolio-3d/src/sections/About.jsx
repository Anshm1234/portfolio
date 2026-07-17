// ============================================================
// ABOUT — editorial split layout.
//   header  eyebrow + hairline rule (the section announces itself)
//   LEFT    the physics Lanyard badge hanging free over a soft glow,
//           with a "grab the badge" hint so visitors find the toy
//   RIGHT   "STAY / CALM" (Milkyway + Inter) that corrupts under the
//           cursor, an editorial bio with highlighted phrases, and a
//           hand-signed sign-off
//   footer  infinite tech marquee, floating free of any strip
// Everything rises in with a staggered scroll reveal.
// The Lanyard stack (R3F + rapier) is lazy-loaded near the viewport.
// ============================================================
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const Lanyard = lazy(() => import('../components/lanyard/Lanyard.jsx'));

// If WebGL/physics ever fail on a device, show the flat card face instead of
// a blank box — and say WHY in the console so it's debuggable.
class LanyardBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error('[about] Lanyard failed — flat card fallback shown:', err); }
  render() {
    if (this.state.failed) {
      return this.props.face
        ? <img className="lanyard-flat" src={this.props.face} alt="ID card — Ansh Madaan" />
        : null;
    }
    return this.props.children;
  }
}

// Your photo (public/lanyard/). If the file is missing the card shows an
// "AM" monogram fallback instead — swap the path any time.
const PHOTO_SRC = '/lanyard/ansh_image.jpeg';

// ---- draw the badge's front face: photo window on cream, name plate below
function buildCardFace() {
  return new Promise((resolve) => {
    const W = 640, H = 960;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    const roundRect = (x, y, w, h, r) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };

    const drawFrame = (drawPhoto) => {
      g.fillStyle = '#e9ddcd';                       // --surface card body
      g.fillRect(0, 0, W, H);
      const px = 40, py = 56, pw = W - 80, ph = 620;
      g.save();
      roundRect(px, py, pw, ph, 26);
      g.clip();
      g.fillStyle = '#beb09e';                       // --bg behind the photo
      g.fillRect(px, py, pw, ph);
      drawPhoto(px, py, pw, ph);
      g.restore();
      g.fillStyle = '#7a4f28';                       // --wood-deep name plate
      g.fillRect(0, H - 216, W, 216);
      g.textAlign = 'center';
      g.fillStyle = '#dfd8cd';
      g.font = '800 62px Inter, system-ui, sans-serif';
      g.fillText('ANSH MADAAN', W / 2, H - 118);
      g.font = '600 26px Inter, system-ui, sans-serif';
      g.fillStyle = '#cdbfa5';
      g.fillText('F U L L   S T A C K   D E V E L O P E R', W / 2, H - 64);
      resolve(c.toDataURL('image/png'));
    };

    const img = new Image();
    img.onload = () => drawFrame((px, py, pw, ph) => {
      const s = Math.max(pw / img.width, ph / img.height);   // cover-fit
      g.drawImage(img, px + (pw - img.width * s) / 2, py + (ph - img.height * s) / 2,
        img.width * s, img.height * s);
    });
    img.onerror = () => drawFrame((px, py, pw, ph) => {
      g.fillStyle = '#2e2a26';                       // monogram fallback
      g.font = '800 220px Inter, system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('AM', px + pw / 2, py + ph / 2);
      g.textBaseline = 'alphabetic';
    });
    img.src = PHOTO_SRC;
  });
}

// ---- the card's BACK face — without this the flip reveals React Bits'
//      dark stock design. Cream field, wood monogram ring, a small wink.
function buildCardBack() {
  const W = 640, H = 960;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#e9ddcd';                                   // --surface
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#b07a45'; g.lineWidth = 6;                // --wood frame
  g.strokeRect(26, 26, W - 52, H - 52);
  g.strokeStyle = '#7a4f28'; g.lineWidth = 10;               // monogram ring
  g.beginPath(); g.arc(W / 2, H / 2 - 60, 130, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#7a4f28';
  g.font = '800 110px Inter, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('AM', W / 2, H / 2 - 60);
  g.textBaseline = 'alphabetic';
  g.font = '600 26px Inter, system-ui, sans-serif';
  g.fillStyle = '#5b544c';
  g.fillText('N I C E   F L I P  ✦', W / 2, H / 2 + 160);
  return c.toDataURL('image/png');
}

// ---- one count-up stat: animates from 0 when it scrolls into view
function Stat({ value, decimals = 0, suffix = '', label }) {
  const numRef = useRef(null);
  useEffect(() => {
    const el = numRef.current;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const counter = { v: 0 };
      gsap.to(counter, {
        v: value, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = counter.v.toFixed(decimals) + suffix; },
      });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, decimals, suffix]);
  return (
    <div className="stat">
      <div className="stat-num" ref={numRef}>0{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const STACK = ['React', 'Three.js', 'Node.js', 'FastAPI', 'Next.js', 'Supabase', 'Python', 'PyTorch', 'Blender' , 'Typescript', 'JavaScript', 'Tailwind', 'CSS', 'HTML'];

export default function About() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const [nearView, setNearView] = useState(false);   // gate the heavy Lanyard
  const [face, setFace] = useState(null);            // the card's front image
  const [back] = useState(buildCardBack);            // themed back (synchronous)

  useEffect(() => { buildCardFace().then(setFace); }, []);

  // mount the Lanyard only when the section approaches the viewport
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearView(true); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // ---- scroll reveal: the right column rises in, staggered; the lanyard
  //      and marquee fade in around it
  useEffect(() => {
    const ctx = gsap.context(() => {
      // immediateRender:false = FAIL VISIBLE. A plain gsap.from() hides its
      // targets the instant it's created and only restores them when the
      // ScrollTrigger fires — if that trigger ever miscomputes (the hero's
      // pin-spacer shifts page height), the whole column stays invisible.
      // This way content is always shown; the reveal is pure garnish.
      const reveal = (targets, vars, start = 'top 72%') => gsap.from(targets, {
        ...vars, ease: 'power3.out', immediateRender: false,
        scrollTrigger: { trigger: sectionRef.current, start, once: true },
      });
      reveal('.about-head', { opacity: 0, y: 20, duration: 0.7 });
      reveal('.about-right > *', { opacity: 0, y: 40, stagger: 0.14, duration: 0.9 });
      reveal('.about-left', { opacity: 0, duration: 1.2 });
      reveal('.about-marquee', { opacity: 0, y: 24, duration: 0.8 }, 'top 45%');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // ---- STAY / CALM: characters near the cursor corrupt into random
  //      glyphs, then scramble back to themselves as it moves away
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

  return (
    <section className="section section-wide about-sec" id="about" ref={sectionRef}>
      {/* -------- the section announces itself -------- */}
      <div className="about-head">
        <span className="about-eyebrow-about">About</span><span className="about-eyebrow-me">Me</span>
        <span className="about-rule" />
      </div>

      <div className="about-grid">
        {/* -------- left: the badge, hanging free -------- */}
        <div className="about-left">
          {nearView && face && (
            <LanyardBoundary face={face}>
              <Suspense fallback={<div className="lanyard-loading">…</div>}>
                <Lanyard frontImage={face} backImage={back} />
              </Suspense>
            </LanyardBoundary>
          )}
          <div className="about-hint">psst — grab the badge</div>
        </div>

        {/* -------- right: STAY CALM + the about proper -------- */}
        <div className="about-right">
          <div className="stay-wrap">
            <h2 className="stay-calm" ref={titleRef} aria-label="Stay calm">
              <span className="stay">STAY</span>
              <span className="calm">CALM</span>
            </h2>
            {/* same voice as the badge hint — tells visitors the title is a toy */}
            <span className="stay-hint" aria-hidden="true">← wave your cursor through it</span>
          </div>

          <p className="about-bio">
           I'm <em>Ansh Madaan</em>, a final-year <em>Computer Science</em> student passionate about building <em>scalable software</em> and <em>AI-powered solutions</em> that solve real-world problems. I enjoy creating <em>full-stack applications</em>, exploring new technologies, and turning ideas into products with meaningful impact. I'm driven by <em>curiosity</em>, <em>continuous learning</em>, and a desire to build software that people genuinely enjoy using.
          </p>

          {/* hand-signed close to the bio, set in the same face as STAY */}
          <p className="about-sign" aria-hidden="true">~ Ansh</p>
        </div>
      </div>

      {/* -------- tech stack, always in motion -------- */}
      <div className="about-marquee" aria-label="Tech stack">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div className="marquee-set" key={dup} aria-hidden={dup === 1}>
              {STACK.map((t) => (
                <span className="marquee-item" key={t}>{t}<i>✦</i></span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
