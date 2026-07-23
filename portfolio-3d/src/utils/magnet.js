// ============================================================
// MAGNETIC PULL — elements ease toward the cursor while it's within
// `radius` of their centre, and spring back elastically when it leaves.
// (The Lightswind "Magnetic Button" behaviour, re-done with GSAP so it
// matches the site's one animation library.) One shared pointermove
// listener serves all the elements passed in.
// ============================================================
import gsap from 'gsap';

export function attachMagnet(els, { strength = 0.32, radius = 70 } = {}) {
  const list = els.filter(Boolean);
  if (!list.length || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }
  const items = list.map((el) => ({
    el,
    xTo: gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' }),
    yTo: gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' }),
    held: false,
  }));
  const onMove = (e) => {
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < radius) {
        it.held = true;
        it.xTo(dx * strength);
        it.yTo(dy * strength);
      } else if (it.held) {
        it.held = false;
        gsap.to(it.el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
      }
    }
  };
  addEventListener('pointermove', onMove, { passive: true });
  return () => {
    removeEventListener('pointermove', onMove);
    items.forEach((it) => gsap.set(it.el, { x: 0, y: 0 }));
  };
}
