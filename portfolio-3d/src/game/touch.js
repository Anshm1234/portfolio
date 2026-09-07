// ============================================================
// TOUCH CONTROLS — the phone / tablet input layer.
//
// The world is keyboard-driven (WASD to walk, E to interact), which leaves a
// touch device with no way to move or open anything at all. This adds the
// three affordances that gap needs:
//   • an analog thumbstick (bottom-left)
//   • taps on the existing "E — <station>" prompt, so interacting needs no
//     second control on screen
//   • pinch-to-zoom, since the wheel handler is otherwise the only zoom control
//
// Same factory shape as showcase/about/contact: the markup lives in
// GameLauncher (addressed by id), this module owns the behaviour, and index.js
// reads `.vec` each frame. Everything is opt-in on `(pointer: coarse)` — a
// desktop with a touchscreen keeps the keyboard UI it already has.
// ============================================================

// How far off-centre the thumb must travel before it counts as input. Without
// this a resting thumb drifts the character around by a pixel or two.
const DEADZONE = 0.16;

export function setupTouch({ onInteract, onZoom } = {}) {
  // `vec` is read every frame by index.js. x/z match the keyboard's axes:
  // +x = 'd', +z = 's' (screen-down is away from the corner camera).
  const vec = { x: 0, z: 0, active: false };
  const inert = { vec, enabled: false, setVisible() {} };

  const root = document.getElementById('touch-controls');
  if (!root || !matchMedia('(pointer: coarse)').matches) return inert;

  const stick = document.getElementById('tc-stick');
  const thumb = document.getElementById('tc-thumb');
  if (!stick || !thumb) return inert;

  root.classList.add('on');
  document.body.classList.add('touch-play');   // CSS retunes the exit button

  // the hint still reads "WASD / Arrows" — say what's actually on screen
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Drag to walk · tap E to interact · pinch to zoom';

  // ---- thumbstick -----------------------------------------------
  let id = null;              // the pointer currently driving the stick
  let cx = 0, cy = 0, radius = 1;

  const release = () => {
    id = null;
    vec.x = 0; vec.z = 0; vec.active = false;
    thumb.style.transform = 'translate(-50%, -50%)';
    stick.classList.remove('held');
  };

  const drive = (e) => {
    if (e.pointerId !== id) return;
    let dx = (e.clientX - cx) / radius;
    let dy = (e.clientY - cy) / radius;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }                  // clamp the thumb to the ring
    const idle = Math.hypot(dx, dy) < DEADZONE;
    vec.x = idle ? 0 : dx;
    vec.z = idle ? 0 : dy;
    vec.active = !idle;
    thumb.style.transform =
      `translate(calc(-50% + ${(dx * radius).toFixed(1)}px), calc(-50% + ${(dy * radius).toFixed(1)}px))`;
  };

  stick.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    radius = r.width / 2;
    id = e.pointerId;
    stick.setPointerCapture(id);                      // keep tracking past the ring
    stick.classList.add('held');
    drive(e);
  });
  stick.addEventListener('pointermove', drive);
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);

  // ---- interact --------------------------------------------------
  // No separate button: the existing "E — <station>" prompt IS the control on
  // touch. index.js already shows it exactly when a station is in reach, so
  // making it tappable keeps one affordance on screen instead of two, with
  // the pill's original look untouched. (CSS gives it pointer-events on
  // touch; it stays inert on desktop.)
  const prompt = document.getElementById('prompt');
  if (prompt) prompt.addEventListener('click', () => onInteract && onInteract());

  // ---- pinch to zoom --------------------------------------------
  // Scoped to the canvas so the two-finger tracking never fights the stick.
  const canvas = document.getElementById('game-canvas');
  if (canvas && onZoom) {
    const live = new Map();
    let span = 0;
    const spread = () => {
      const [a, b] = [...live.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    canvas.addEventListener('pointerdown', (e) => {
      live.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (live.size === 2) span = spread();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!live.has(e.pointerId)) return;
      live.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (live.size !== 2 || !span) return;
      const next = spread();
      onZoom(span / next);        // fingers apart → factor < 1 → camera moves in
      span = next;
    });
    const drop = (e) => { live.delete(e.pointerId); if (live.size < 2) span = 0; };
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
  }

  return {
    vec,
    enabled: true,
    // a full-screen window (showcase / about / contact) owns the screen —
    // get out of its way, and drop any input the stick was mid-way through
    setVisible(on) {
      root.classList.toggle('hidden', !on);
      if (!on) release();
    },
  };
}
