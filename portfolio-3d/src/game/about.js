// ============================================================
// ABOUT WINDOW — the DOM overlay controller for the About station.
//
// The content is static (rendered by GameLauncher), so this module only
// owns show/hide and the exit affordances: the ✕ button, a click on the
// dim backdrop, and (wired in index.js) the Esc/E keys. The 3D side passes
// an `onExit` callback so it can hand control back to the player.
// ============================================================
export function setupAbout(onExit) {
  const root = document.getElementById('about-card');
  const exitBtn = document.getElementById('ab-exit');
  if (!root) return null;

  exitBtn.onclick = () => onExit && onExit();
  // tapping the dim backdrop (but not the card) exits
  root.onclick = (e) => { if (e.target === root) onExit && onExit(); };

  return {
    open() { root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); },
    close() { root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); },
  };
}
