// ============================================================
// WELCOME — a full-screen curtain that covers the site while it loads.
// Sequence:
//   1. screen starts empty
//   2. vines grow in from two corners, then "Welcome" pops in the centre
//   3. a scroll cue appears; on scroll / click / key the curtain lifts up,
//      revealing the site that was loading underneath it the whole time
// Pure theme colours + Milkyway display type. One hand-drawn vine, mirrored
// to the opposite corner. GSAP drives the draw-on and the lift.
// ============================================================
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// a refined CORNER flourish: a fine primary sweep ending in a scroll, a
// smaller balancing scroll beneath it, slim leaves and two small berries —
// an engraved/filigree feel rather than a loose doodle. Drawn for the
// bottom-left corner; the CSS mirrors it into the other three.
const LEAF = 'M0 0 C 5 -8 5 -26 0 -34 C -5 -26 -5 -8 0 0 Z';   // slim almond
const LEAVES = [
  [72, 226, -44, 0.95], [112, 204, -22, 0.85], [144, 150, -4, 0.78],
];
const BERRIES = [[124, 86], [132, 233]];   // small terminals at the scroll ends

function Vine({ className }) {
  return (
    <svg className={`vine ${className}`} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      {/* primary sweep, terminating in an inward scroll */}
      <path
        className="vine-stem"
        d="M 0 240 C 78 234 138 206 156 148 C 170 100 150 60 116 60 C 92 60 82 86 100 100 C 112 109 126 101 124 86"
      />
      {/* smaller balancing scroll below it */}
      <path
        className="vine-stem"
        d="M 40 240 C 58 202 92 188 120 198 C 138 204 142 222 132 233"
      />
      {LEAVES.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path className="vine-leaf" d={LEAF} />
        </g>
      ))}
      {BERRIES.map(([x, y], i) => (
        <circle key={i} className="vine-berry" cx={x} cy={y} r="3.2" />
      ))}
    </svg>
  );
}

export default function WelcomeScreen({ onDone }) {
  const rootRef = useRef(null);
  const readyRef = useRef(false);    // intro finished → reveal is allowed
  const goneRef = useRef(false);     // reveal already fired (guard)

  // lock BOTH the root element and body — some browsers scroll the <html>
  // element, so body-only overflow:hidden lets the site creep behind the
  // curtain. Locking both freezes the site until we choose to release it.
  const lockScroll = (on) => {
    document.documentElement.classList.toggle('welcome-open', on);
    document.body.classList.toggle('welcome-open', on);
  };

  // ---- intro: draw the vines, pop the word, raise the scroll cue ----
  useEffect(() => {
    lockScroll(true);
    scrollTo(0, 0);                                // sit the site at the very top
    const ctx = gsap.context(() => {
      const stems = gsap.utils.toArray('.vine-stem');
      stems.forEach((p) => {
        const L = p.getTotalLength();
        gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
      });
      gsap.set('.vine-leaf', { scale: 0, transformOrigin: '0px 0px' });
      gsap.set('.vine-berry', { scale: 0, transformOrigin: 'center', opacity: 0 });
      gsap.set('.welcome-title', { scale: 0.82, opacity: 0, y: 20 });
      gsap.set('.welcome-sub', { opacity: 0, y: 12 });
      gsap.set('.welcome-scroll', { opacity: 0, y: 16 });

      // calmer, more deliberate timing — the flourish draws slowly, leaves
      // settle in without an exaggerated overshoot (a "serious" feel)
      gsap.timeline({ onComplete: () => { readyRef.current = true; } })
        .to(stems, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', stagger: 0.22 }, 0)
        .to('.vine-leaf', { scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 0.7)
        .to('.vine-berry', { scale: 1, opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.1 }, 1.2)
        .to('.welcome-title', { scale: 1, opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, 0.6)
        .to('.welcome-sub', { opacity: 1, y: 0, duration: 0.7 }, 1.1)
        .to('.welcome-scroll', { opacity: 1, y: 0, duration: 0.6 }, 1.6);
    }, rootRef);

    return () => { ctx.revert(); lockScroll(false); };
  }, []);

  // ---- the lift: curtain slides up, THEN the site takes over scrolling ----
  //  Scroll stays locked through the whole animation; only once the curtain is
  //  fully off-screen do we release it — so the site never scrolls underneath.
  const reveal = () => {
    if (goneRef.current || !readyRef.current) return;
    goneRef.current = true;
    gsap.timeline({
      onComplete: () => {
        scrollTo(0, 0);                 // guarantee the site opens at the top
        lockScroll(false);              // NOW the site's scroll is live
        dispatchEvent(new Event('resize'));   // let Hero's ScrollTrigger re-measure
        onDone?.();
      },
    })
      .to('.welcome-inner', { y: -50, opacity: 0, duration: 0.45, ease: 'power2.in' })
      .to(rootRef.current, { yPercent: -100, duration: 1.0, ease: 'power3.inOut' }, 0.15);
  };

  // triggers: wheel down, swipe up, arrow/enter/space, or the button
  useEffect(() => {
    const onWheel = (e) => { if (e.deltaY > 0) reveal(); };
    const onKey = (e) => {
      if (['ArrowDown', 'Enter', ' ', 'Spacebar', 'PageDown'].includes(e.key)) reveal();
    };
    let ty = 0;
    const onTouchStart = (e) => { ty = e.touches[0].clientY; };
    const onTouchMove = (e) => { if (ty - e.touches[0].clientY > 24) reveal(); };
    addEventListener('wheel', onWheel, { passive: true });
    addEventListener('keydown', onKey);
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKey);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div className="welcome" ref={rootRef}>
      <Vine className="vine-bl" />
      <Vine className="vine-br" />
      <Vine className="vine-tl" />
      <Vine className="vine-tr" />

      <div className="welcome-inner">
        <p className="welcome-sub">Ansh Madaan — Portfolio</p>
        <h1 className="welcome-title">Welcome</h1>
      </div>

      <button type="button" className="welcome-scroll" onClick={reveal} aria-label="Enter the site">
        <span>Scroll to enter</span>
        <span className="chev" aria-hidden="true" />
      </button>
    </div>
  );
}
