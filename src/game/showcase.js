// ============================================================
// PC SHOWCASE UI — the DOM overlay controller. Reads PROJECTS and
// renders the gallery, arrows, dots, and tabs. Two independent indices:
//   pi = current project, si = current screenshot. Both nav wraps around.
//
// This module owns only the DOM. It knows nothing about Three.js; the 3D
// side passes an `onExit` callback (invoked by the Back button, the dim
// backdrop, and Esc) so the camera can dolly back out.
// ============================================================
import { PROJECTS } from '../data/projects/index.js';

export function setupShowcase(onExit) {
  const el = (id) => document.getElementById(id);
  const root = el('showcase');
  const shotsBox = el('sc-shots'), shotDots = el('sc-shotdots'), projDots = el('sc-projdots');
  const titleEl = el('sc-title'), stackEl = el('sc-stack'), descEl = el('sc-desc');
  const countEl = el('sc-count'), demoEl = el('sc-demo'), repoEl = el('sc-repo');
  let pi = 0, si = 0;

  // Build a screenshot element: a real <img> if a path is given, else a
  // labelled gradient placeholder so the layout works before real images.
  function makeShot(shot) {
    const d = document.createElement('div');
    d.className = 'sc-shot';
    if (typeof shot === 'string' || shot.src) {
      const img = document.createElement('img');
      img.src = typeof shot === 'string' ? shot : shot.src;
      img.alt = ''; img.loading = 'lazy';
      d.appendChild(img);
    } else {
      const hue = shot.hue ?? 210;
      d.style.background =
        `linear-gradient(135deg, hsl(${hue} 55% 22%), hsl(${(hue + 40) % 360} 60% 30%))`;
      d.textContent = shot.placeholder || 'Screenshot';
    }
    return d;
  }

  function setTab(a, url) {
    if (url) { a.href = url; a.classList.remove('hidden'); }
    else { a.removeAttribute('href'); a.classList.add('hidden'); }
  }

  function renderShot() {
    const shots = shotsBox.querySelectorAll('.sc-shot');
    shots.forEach((n, idx) => n.classList.toggle('active', idx === si));
    shotDots.querySelectorAll('.dot').forEach((n, idx) => n.classList.toggle('on', idx === si));
  }

  function renderProject() {
    const p = PROJECTS[pi];
    root.style.setProperty('--accent', p.accent || '#35e0a8');
    countEl.textContent = `Project ${pi + 1} / ${PROJECTS.length}`;
    titleEl.textContent = p.title;
    stackEl.textContent = p.stack || '';
    descEl.textContent = p.description || '';

    // screenshots
    shotsBox.querySelectorAll('.sc-shot').forEach((n) => n.remove());
    shotDots.innerHTML = '';
    p.shots.forEach((shot, idx) => {
      shotsBox.appendChild(makeShot(shot));
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.onclick = () => { si = idx; renderShot(); };
      shotDots.appendChild(dot);
    });
    const multi = p.shots.length > 1;
    el('sc-prev').style.display = multi ? '' : 'none';
    el('sc-next').style.display = multi ? '' : 'none';
    shotDots.style.display = multi ? '' : 'none';

    setTab(demoEl, p.demo);
    setTab(repoEl, p.repo);

    // project dots
    projDots.innerHTML = '';
    PROJECTS.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'dot' + (idx === pi ? ' on' : '');
      dot.onclick = () => { pi = idx; si = 0; renderProject(); };
      projDots.appendChild(dot);
    });

    si = 0; renderShot();
  }

  // screenshot nav (wraps)
  function nextShot() { const n = PROJECTS[pi].shots.length; si = (si + 1) % n; renderShot(); }
  function prevShot() { const n = PROJECTS[pi].shots.length; si = (si - 1 + n) % n; renderShot(); }
  // project nav (wraps)
  function nextProject() { pi = (pi + 1) % PROJECTS.length; si = 0; renderProject(); }
  function prevProject() { pi = (pi - 1 + PROJECTS.length) % PROJECTS.length; si = 0; renderProject(); }

  el('sc-next').onclick = nextShot;
  el('sc-prev').onclick = prevShot;
  el('sc-navnext').onclick = nextProject;
  el('sc-navprev').onclick = prevProject;
  el('sc-exit').onclick = () => onExit && onExit();
  // tapping the dim backdrop (but not the frame) exits
  root.onclick = (e) => { if (e.target === root) onExit && onExit(); };

  // touch swipe on the gallery: left = next shot, right = prev shot
  let tx = 0;
  shotsBox.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  shotsBox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) (dx < 0 ? nextShot : prevShot)();
  }, { passive: true });

  renderProject();
  return {
    open() { root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); },
    close() { root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); },
    nextProject, prevProject,
  };
}
