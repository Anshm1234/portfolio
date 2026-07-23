// ============================================================
// JOURNEY — education & experience timeline, between About and Projects.
//   • a hand-drawn SVG spine runs down the centre of the section and
//     draws itself in as you scroll (stroke-dash scrub)
//   • milestones alternate left/right of the spine; each fades in from
//     the side as it arrives and fades back out toward the top once
//     passed (scroll-scrubbed opacity — the same in/out logic both ways)
//   • theme: eyebrow + rule header, ghost watermark, wood/ink palette
// ============================================================
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ---- the milestones, oldest first. Edit the «…» placeholders. ----
const MILESTONES = [
  {
    period: '2021',
    title: 'Class X',
    place: '«DAV Public School»',
    detail: '«88.4%» · CBSE',
  },
  {
    period: '2023',
    title: 'Class XII',
    place: '«DAV Public School»',
    detail: '«95.8%» · CBSE',
  },
  {
    period: '2023 — 2027',
    title: 'B.E. Computer Science & Engineering',
    place: '«Thapar Institute of Engineering & Technology, Patiala»',
    detail: 'CGPA «9.12»',
  },
  {
    period: 'Jun 2025 — Jul 2025',
    title: 'Research Intern',
    place: 'Thapar Institute of Engineering & Technology',
    detail: 'Summer research internship',
  },
];

// olive leaves scattered around the section — the welcome screen's vine
// motif drifting free. top/left in %, size in px, r = resting rotation.
const LEAVES = [
  { top: '5%',  left: '4%',  size: 28, r: -20, dur: 7 },
  { top: '3%',  left: '56%', size: 20, r: 80,  dur: 10 },
  { top: '8%',  left: '30%', size: 18, r: -60, dur: 9 },
  { top: '12%', left: '72%', size: 24, r: 20,  dur: 8 },
  { top: '15%', left: '88%', size: 32, r: 35,  dur: 9 },
  { top: '22%', left: '18%', size: 20, r: 110, dur: 10 },
  { top: '27%', left: '65%', size: 16, r: -35, dur: 7.5 },
  { top: '30%', left: '9%',  size: 22, r: 70,  dur: 8 },
  { top: '36%', left: '78%', size: 26, r: 60,  dur: 9.5 },
  { top: '40%', left: '92%', size: 24, r: -50, dur: 10 },
  { top: '46%', left: '26%', size: 18, r: 40,  dur: 8.5 },
  { top: '52%', left: '70%', size: 20, r: -95, dur: 7 },
  { top: '55%', left: '5%',  size: 30, r: 15,  dur: 7.5 },
  { top: '60%', left: '38%', size: 16, r: 75,  dur: 9 },
  { top: '63%', left: '86%', size: 20, r: 95,  dur: 8.5 },
  { top: '70%', left: '20%', size: 24, r: -15, dur: 10 },
  { top: '75%', left: '62%', size: 18, r: 130, dur: 8 },
  { top: '79%', left: '11%', size: 26, r: -75, dur: 9.5 },
  { top: '83%', left: '34%', size: 20, r: 25,  dur: 7.5 },
  { top: '87%', left: '90%', size: 28, r: 55,  dur: 7 },
  { top: '91%', left: '74%', size: 16, r: -45, dur: 9 },
  { top: '94%', left: '46%', size: 22, r: -30, dur: 8 },
];

export default function Journey() {
  const secRef = useRef(null);
  const pathRef = useRef(null);
  const cometRef = useRef(null);

  useLayoutEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduced) return;              // static: line drawn, items visible

      // ---- the spine draws in as the section scrolls through, with a
      //      golden ember riding its tip (the navbar's ember motif) ----
      const path = pathRef.current;
      const comet = cometRef.current;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: {
          trigger: secRef.current, start: 'top 62%', end: 'bottom 60%', scrub: 1,
          onUpdate: (self) => {
            const p = path.getPointAtLength(self.progress * len);
            comet.setAttribute('cx', p.x);
            comet.setAttribute('cy', p.y);
            comet.style.opacity = self.progress > 0.005 && self.progress < 0.995 ? 1 : 0;
          },
        },
      });

      // ---- each milestone: fade in arriving, fade out leaving at the top;
      //      its node lights up while the milestone is in the read zone ----
      secRef.current.querySelectorAll('.jn-item').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 50 }, {
          opacity: 1, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 68%', scrub: true },
        });
        gsap.fromTo(el, { opacity: 1, y: 0 }, {
          opacity: 0, y: -50, ease: 'none', immediateRender: false,
          scrollTrigger: { trigger: el, start: 'top 26%', end: 'top 5%', scrub: true },
        });
        ScrollTrigger.create({
          trigger: el, start: 'top 72%', end: 'top 18%',
          toggleClass: { targets: el.querySelector('.jn-dot'), className: 'on' },
        });
      });
    }, secRef);

    // this section lazy-mounts and pushes everything below it down — let the
    // pinned sections (Projects) recompute their scroll positions
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section className="journey-sec section section-wide" id="journey" ref={secRef}>
      {/* olive leaves drifting around the whole section, behind everything */}
      {LEAVES.map((l, i) => (
        <svg
          key={i} className="jn-scatter" viewBox="0 0 24 24" width={l.size} height={l.size}
          style={{ top: l.top, left: l.left, '--r': `${l.r}deg`, animationDuration: `${l.dur}s`, animationDelay: `${-i * 1.3}s` }}
          aria-hidden="true"
        >
          <path d="M2 22 C 2 10, 10 2, 22 2 C 22 12, 14 22, 2 22 Z" fill="currentColor" />
          <path d="M4 20 C 9 15, 15 9, 20 4" stroke="#3f4a2c" strokeWidth="1.2" fill="none" opacity=".55" />
        </svg>
      ))}

      {/* section announces itself — same motif as ABOUT ME */}
      <div className="journey-head">
        <span className="about-eyebrow-about">MY</span>
        <span className="about-eyebrow-me">JOURNEY</span>
      </div>

      <div className="jn-body">
        {/* the spine — gentle hand-drawn wave, stretched to the full height */}
        <svg className="jn-spine" viewBox="0 0 80 1200" preserveAspectRatio="none" aria-hidden="true">
          <path
            ref={pathRef}
            className="jn-path"
            d="M 40 0 C 56 140, 24 260, 40 400 C 56 540, 24 660, 40 800 C 56 940, 24 1060, 40 1200"
          />
          {/* golden ember riding the tip of the line as it draws */}
          <circle ref={cometRef} className="jn-comet" r="5" cx="40" cy="0" />
        </svg>

        {MILESTONES.map((m, i) => (
          <div className={`jn-item ${i % 2 ? 'right' : 'left'}`} key={m.title}>
            <span className="jn-dot" aria-hidden="true" />
            <div className="jn-card">
              <span className="jn-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="jn-period">{m.period}</span>
              <h3 className="jn-title">{m.title}</h3>
              <p className="jn-place">{m.place}</p>
              <p className="jn-detail">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
