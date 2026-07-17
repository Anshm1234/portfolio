// ============================================================
// GAME LAUNCHER — mounts the untouched 3D game as a full-screen overlay.
//
// The game (../game/index.js) boots on import: it appends its canvas into
// #game-canvas (falling back to <body>) and drives the overlay DOM by id
// (#hint, #prompt, #panel*, #showcase*). So this component simply renders
// that exact DOM, then dynamically imports the game once, on launch.
//
// NOTE: the game has module-level state and no teardown, so we import it a
// single time and keep it alive; "Exit" hides the overlay rather than
// destroying the scene. (A future step can add real dispose/teardown.)
// ============================================================
import { useEffect, useRef } from 'react';

let gameBooted = false;   // module-level: import the game exactly once

export default function GameLauncher({ onExit }) {
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (!gameBooted) {
      gameBooted = true;
      // dynamic import → the game's setup side-effects run now, not on page load
      import('../game/index.js');
    }
  }, []);

  return (
    <div className="game-overlay">
      {/* the canvas mounts here (game appends renderer.domElement) */}
      <div id="game-canvas" className="game-canvas" />

      {/* the game's existing overlay UI, by the ids main.js/showcase.js expect */}
      <div id="hint">WASD / Arrows to move · E to interact · walk off the edge, I dare you</div>
      <div id="prompt"></div>
      <div id="panel">
        <span id="panel-close">✕</span>
        <h2 id="panel-title"></h2>
        <p id="panel-body"></p>
        <a id="panel-link" target="_blank" rel="noopener"></a>
      </div>

      <div id="showcase" aria-hidden="true">
        <button type="button" id="sc-exit" title="Back (Esc)" aria-label="Exit showcase">✕ Back</button>
        <div id="sc-frame">
          <div id="sc-gallery">
            <div id="sc-shots"></div>
            <button type="button" className="sc-arrow" id="sc-prev" aria-label="Previous screenshot">‹</button>
            <button type="button" className="sc-arrow" id="sc-next" aria-label="Next screenshot">›</button>
            <div id="sc-shotdots"></div>
          </div>
          <div id="sc-info">
            <div id="sc-count"></div>
            <h2 id="sc-title"></h2>
            <div id="sc-stack"></div>
            <p id="sc-desc"></p>
            <div id="sc-tabs">
              <a id="sc-demo" className="sc-tab" target="_blank" rel="noopener">Live Demo ↗</a>
              <a id="sc-repo" className="sc-tab sc-tab-ghost" target="_blank" rel="noopener">GitHub Repo ↗</a>
            </div>
            <div id="sc-nav">
              <button type="button" id="sc-navprev" className="sc-navbtn" aria-label="Previous project">‹ Prev</button>
              <div id="sc-projdots"></div>
              <button type="button" id="sc-navnext" className="sc-navbtn" aria-label="Next project">Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {/* the site's own control: exit the game (bottom-right, same spot as launch) */}
      <button type="button" className="game-exit-btn" onClick={onExit}>✕ Exit game</button>
    </div>
  );
}
