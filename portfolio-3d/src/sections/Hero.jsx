// ============================================================
// Hero — scrollytelling intro, driven by GSAP ScrollTrigger.
//
// ScrollTrigger PINS the stage (no CSS sticky — this is what fixes the
// "stuck at top / no scrub" problem) and scrubs a frame counter from
// 0 → 239 as you scroll through 400% of viewport height. onUpdate
// draws the matching WebP frame to the canvas; the text beats are
// tweens on the same timeline, so everything stays in perfect sync.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 180;
const framePath = (i) => `/frames/frame_${String(i).padStart(3, '0')}.webp`;

export default function Hero({ onPlay }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const b1 = useRef(null), b2 = useRef(null), b3 = useRef(null), b4 = useRef(null);
  const frames = useRef(new Array(FRAME_COUNT).fill(null));
  const lastIdx = useRef(-1);
  const [loaded, setLoaded] = useState(false);

  // nearest loaded frame to `idx` — during the progressive load the exact
  // frame may not be in yet, so scrub with the closest neighbour we have
  const pick = (idx) => {
    if (frames.current[idx]) return frames.current[idx];
    for (let o = 1; o < FRAME_COUNT; o++) {
      if (frames.current[idx - o]) return frames.current[idx - o];
      if (frames.current[idx + o]) return frames.current[idx + o];
    }
    return null;
  };

  // ---- draw one frame, cover-fit, dpr-aware ----
  const lastImg = useRef(null);
  const ctxRef = useRef(null);
  const draw = (idx) => {
    const canvas = canvasRef.current;
    const img = pick(idx);
    if (!canvas || !img) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    const resized = canvas.width !== W || canvas.height !== H;
    // scrub fires every tick — repaint only when the image (or size) changed.
    // Comparing the IMAGE (not the index) lets a late-arriving exact frame
    // replace the neighbour that stood in for it.
    if (!resized && img === lastImg.current) return;
    lastIdx.current = idx;
    lastImg.current = img;
    // Resizing the canvas RESETS its 2d-context state, so (re)build + configure
    // the context only then — not every frame. `alpha:false` lets the compositor
    // skip transparency work, and 'medium' resampling is far cheaper than 'high'
    // yet invisible on a moving full-screen backdrop. This drawImage is the main
    // per-scroll cost, so these two knobs are what smooth the scrub.
    let ctx = ctxRef.current;
    if (resized || !ctx) {
      canvas.width = W; canvas.height = H;
      ctx = ctxRef.current = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
    }
    const s = Math.max(W / img.width, H / img.height);
    ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
  };

  // ---- progressive preload: don't pull all 13MB up front.
  //   wave 1 — every 6th frame (~2MB): the scrub works within seconds,
  //            stepping through neighbours where frames are missing
  //   wave 2 — everything else, in the background, upgrading the scrub
  //            to full smoothness as frames arrive
  useEffect(() => {
    let alive = true, ok = 0, bad = 0;

    const loadOne = (i, done) => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        frames.current[i] = img; ok++;
        if (i === 0) {
          // page bg = the render's backdrop → canvas blends seamlessly
          try {
            const c = document.createElement('canvas'); c.width = c.height = 4;
            const x = c.getContext('2d', { willReadFrequently: true });
            x.drawImage(img, 0, 0, 4, 4);
            const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
            document.documentElement.style.setProperty('--frame-bg', `rgb(${r} ${g} ${b})`);
          } catch { /* non-fatal */ }
          draw(0);
          setLoaded(true);
        }
        if ((ok + bad) === FRAME_COUNT) {
          console.info(`[hero] frames loaded: ${ok}/${FRAME_COUNT}` + (bad ? `, FAILED: ${bad}` : ''));
          // the network + main thread are free now — About waits on this before
          // pulling its heavy lanyard bundle, so the two never contend
          window.__heroFramesReady = true;
          dispatchEvent(new Event('hero:framesReady'));
        }
        done?.();
      };
      img.onerror = () => { if (++bad === 1) console.error('[hero] frame failed:', framePath(i)); done?.(); };
      img.src = framePath(i);
      // pre-warm the decoder — without this, each frame pays its decode cost
      // the FIRST time it's drawn mid-scroll, which reads as micro-stutter
      img.decode?.().catch(() => { /* onerror already reports */ });
    };

    const coarse = [], fine = [];
    for (let i = 0; i < FRAME_COUNT; i++) (i % 6 === 0 ? coarse : fine).push(i);

    // Load a list with LIMITED concurrency. Over HTTP/2 every request
    // multiplexes on one connection, so firing all ~150 frames at once splits
    // the bandwidth 150 ways — each trickles in and they all finish at the very
    // end. A small in-flight cap gives each frame the full pipe, so they land
    // fast and IN ORDER, and the scrub becomes usable almost immediately.
    const pool = (list, limit, onAll) => {
      let idx = 0, active = 0, done = 0;
      const pump = () => {
        while (alive && active < limit && idx < list.length) {
          active++;
          loadOne(list[idx++], () => {
            active--; done++;
            if (done === list.length) onAll?.();
            else pump();
          });
        }
      };
      pump();
    };

    // wave 1 — the coarse frames (every 6th) first, so the scrub works early
    pool(coarse, 6, () => {
      if (!alive) return;
      console.info('[hero] coarse frames in — loading the rest in the background');
      // wave 2 — the rest, once the browser is idle, still concurrency-capped
      const start = () => alive && pool(fine, 6);
      if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
      else setTimeout(start, 800);
    });

    return () => { alive = false; };
  }, []);

  // ---- GSAP: pin the stage and scrub everything on one timeline ----
  useEffect(() => {
    const ctx = gsap.context(() => {
      const counter = { frame: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=220%',          // shorter runway — the story plays out faster
          scrub: 1.6,             // heavier smoothing — each wheel notch glides
                                  // through its frames instead of stepping
          pin: stageRef.current,  // GSAP pins — no CSS sticky involved
          anticipatePin: 1,
        },
      });

      // the frame scrub — equivalent of your `gsap.to(video,{currentTime…})`
      tl.to(counter, {
        frame: FRAME_COUNT - 1,
        duration: 1,
        onUpdate: () => draw(Math.round(counter.frame)),
      }, 0);

      // text beats, positioned as fractions of the same timeline
      gsap.set([b2.current, b3.current, b4.current], { opacity: 0 });
      gsap.set(b1.current, { opacity: 1 });
      tl.to(b1.current, { opacity: 0, y: -60, duration: 0.08 }, 0.16)
        .fromTo(b2.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.07 }, 0.28)
        .to(b2.current, { opacity: 0, y: -40, duration: 0.07 }, 0.47)
        .fromTo(b3.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.07 }, 0.58)
        .to(b3.current, { opacity: 0, y: -40, duration: 0.07 }, 0.77)
        .fromTo(b4.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.08 }, 0.88);
    }, sectionRef);

    return () => ctx.revert();   // clean unmount (and StrictMode-safe)
  }, []);

  return (
    <section className="hero" id="home" ref={sectionRef}>
      <div className="hero-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="scrolly-canvas" />
        {!loaded && <div className="hero-loading">loading…</div>}
        <div className="overlay">
          {/* all beats sit on the LEFT — the render's empty side
              (character + desk occupy the right half of the frames) */}
          <div className="beat beat-left" ref={b1}>
            <p className="beat-eyebrow">Portfolio</p>
            <h1 className="beat-title">Ansh Madaan</h1>
            <p className="beat-sub">Full Stack Developer</p>
          </div>
          <div className="beat beat-left" ref={b2}>
            <h4 className="beat-eyebrow">I build creative and scalable</h4>
            <h2 className="beat-line">Full Stack applications.</h2>
          </div>
          <div className="beat beat-left" ref={b3}>
            <h2 className="beat-line">Bridging AI &amp; Engineering.</h2>
          </div>
          <div className="beat beat-left beat-final" ref={b4}>
            <h2 className="beat-line">Want to know me?</h2>
            <button type="button" className="game-btn invite-btn" onClick={onPlay}>
              {/* wood pill with lanyard-style stitching; the pulsing halo ring
                  (same invitation cue the game's stations use) marks it as the
                  door into the game */}
              <span className="game-btn-halo" aria-hidden="true" />
              <span className="game-btn-scene" aria-hidden="true" />
              <span className="game-btn-label">
                <i className="gb-ham" aria-hidden="true">▶</i>
                Know me through a game
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
