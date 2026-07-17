// Glass-pill navbar with two behaviours, both hand-rolled:
//   • dock pop — links swell + lift as the cursor nears, with a smooth
//     cosine falloff so neighbours react too (rAF + lerp, no libraries)
//   • comet underline — on click the active bar stretches toward the target
//     link, snaps into place, and sheds tiny golden ember sparks on the way
//     (the same gold as the game's foot sparkles)
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const LINKS = [
  ['Home', '#home'],
  ['About', '#about'],
  ['Projects', '#projects'],
  ['Contact', '#contact'],
];

const POP_RADIUS = 90;   // px — how far the cursor's influence reaches
const POP_SCALE  = 0.3;  // max extra scale at zero distance (1 → 1.3)
const POP_LIFT   = 5;    // px the hovered link rises
const BAR_W      = 24;   // resting underline width

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef(null);       // positioning context for bar + sparks
  const barRef = useRef(null);
  const linkRefs = useRef([]);
  const activeRef = useRef(0);        // live index (state lags mid-animation)
  const animating = useRef(false);

  useEffect(() => { activeRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  // underline x so the bar sits centred under a link (layout coords,
  // via offsetLeft — unaffected by the pop-scale transforms)
  const barX = (i) => {
    const li = linkRefs.current[i]?.parentElement;
    return li ? li.offsetLeft + (li.offsetWidth - BAR_W) / 2 : 0;
  };

  // ---- dock pop: one rAF loop eases every link toward its target ----
  useEffect(() => {
    const menu = menuRef.current;
    const pop = LINKS.map(() => 0);   // current 0..1 "pop" per link
    let mx = Infinity, raf = 0, running = false;

    const tick = () => {
      const menuLeft = menu.getBoundingClientRect().left;
      let settled = true;
      linkRefs.current.forEach((a, i) => {
        const li = a?.parentElement;
        if (!li) return;
        let target = 0;
        if (mx !== Infinity) {
          const center = menuLeft + li.offsetLeft + li.offsetWidth / 2;
          const d = Math.abs(mx - center);
          if (d < POP_RADIUS) target = Math.cos((d / POP_RADIUS) * Math.PI / 2);
        }
        pop[i] += (target - pop[i]) * 0.18;
        if (Math.abs(target - pop[i]) > 0.002) settled = false;
        li.style.transform =
          `translateY(${(-POP_LIFT * pop[i]).toFixed(2)}px) scale(${(1 + POP_SCALE * pop[i]).toFixed(3)})`;
      });
      if (settled && mx === Infinity) { running = false; return; }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
    const move = (e) => { mx = e.clientX; wake(); };
    const leave = () => { mx = Infinity; wake(); };

    menu.addEventListener('mousemove', move);
    menu.addEventListener('mouseleave', leave);
    return () => {
      menu.removeEventListener('mousemove', move);
      menu.removeEventListener('mouseleave', leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // place the bar under "Home" before first paint; re-place on resize
  useLayoutEffect(() => {
    const place = () => {
      if (!animating.current)
        gsap.set(barRef.current, { x: barX(activeRef.current), opacity: 1 });
    };
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, []);

  // one golden ember, shed from the bar's trailing edge while it flies
  const shedSpark = (dir) => {
    const bar = barRef.current, menu = menuRef.current;
    const s = document.createElement('span');
    s.className = 'nav-spark';
    const x = Number(gsap.getProperty(bar, 'x'));
    s.style.left = `${dir > 0 ? x + 3 : x + bar.offsetWidth - 3}px`;
    s.style.top = `${bar.offsetTop + 1}px`;
    menu.appendChild(s);
    gsap.to(s, {
      x: (Math.random() - 0.5) * 24,
      y: 6 + Math.random() * 16,
      opacity: 0,
      scale: 0.3,
      duration: 0.45 + Math.random() * 0.3,
      ease: 'power1.out',
      onComplete: () => s.remove(),
    });
  };

  // ---- comet underline: stretch toward the target, snap, shed sparks ----
  const flyTo = (index) => {
    const bar = barRef.current;
    if (index === activeRef.current || animating.current || !bar) return;
    animating.current = true;

    const startX = Number(gsap.getProperty(bar, 'x'));
    const endX = barX(index);
    const dir = endX > startX ? 1 : -1;
    const stretch = Math.min(Math.abs(endX - startX) + BAR_W, 140);
    let lastSpark = 0;

    gsap.timeline({
      onUpdate: () => {
        const now = performance.now();
        if (now - lastSpark > 28) { lastSpark = now; shedSpark(dir); }
      },
      onComplete: () => {
        animating.current = false;
        setActiveIndex(index);
      },
    })
      // stretch: leading edge reaches out, trailing edge stays anchored
      .to(bar, {
        width: stretch,
        x: dir > 0 ? startX : startX + BAR_W - stretch,
        duration: 0.18,
        ease: 'power2.out',
      })
      // snap: collapse onto the target link
      .to(bar, { width: BAR_W, x: endX, duration: 0.3, ease: 'power2.inOut' });
  };

  const onSelect = (e, index, hash) => {
    e.preventDefault();
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    flyTo(index);
  };

  // scroll-spy: as sections cross the viewport's middle the bar glides along
  // (plain glide — the comet show is saved for clicks)
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const idx = LINKS.findIndex(([, h]) => h === `#${entry.target.id}`);
        if (idx < 0 || idx === activeRef.current || animating.current) continue;
        setActiveIndex(idx);
        gsap.to(barRef.current, { x: barX(idx), duration: 0.35, ease: 'power2.out' });
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    LINKS.forEach(([, h]) => {
      const el = document.querySelector(h);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav className={scrolled ? 'nav scrolled' : 'nav'}>
      <div className="nav-menu" ref={menuRef}>
        <ul className="nav-links">
          {LINKS.map(([label, hash], i) => (
            <li key={hash} className={i === activeIndex ? 'active' : ''}>
              <a
                href={hash}
                ref={(el) => { linkRefs.current[i] = el; }}
                onClick={(e) => onSelect(e, i, hash)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-underline" ref={barRef} />
      </div>
    </nav>
  );
}
