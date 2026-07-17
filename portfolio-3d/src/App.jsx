import { useState, useEffect } from 'react';
import Hero from './sections/Hero.jsx';
import About from './sections/About.jsx';
import Projects from './sections/Projects.jsx';
import Contact from './sections/Contact.jsx';
import GameLauncher from './components/GameLauncher.jsx';
import Navbar from './components/Navbar.jsx';

export default function App() {
  // 'intro'  → animated intro playing
  // 'site'   → traditional scrolling portfolio
  // once launched, the game stays mounted (kept alive) and we toggle visibility
  // In dev, the game forces a full reload when its files change (it can't
  // hot-rebuild its scene) and leaves this flag so we drop straight back in.
  const relaunch = typeof sessionStorage !== 'undefined'
    && sessionStorage.getItem('relaunchGame') === '1';
  if (relaunch) sessionStorage.removeItem('relaunchGame');

  const [launched, setLaunched] = useState(relaunch);   // has the game ever been started
  const [gameOpen, setGameOpen] = useState(relaunch);   // is the game overlay showing now

  const launchGame = () => { setLaunched(true); setGameOpen(true); };
  const exitGame = () => setGameOpen(false);

  // lock page scroll only while the game overlay is open
  useEffect(() => {
    document.body.classList.toggle('game-open', gameOpen);
    return () => document.body.classList.remove('game-open');
  }, [gameOpen]);

  return (
    <>
      {/* ---- Glass navbar — hidden while the game overlay is up ---- */}
      {!gameOpen && <Navbar />}

      {/* ---- Traditional portfolio (always in the DOM; game overlays on top) ---- */}
      <main className="site">
        <Hero onPlay={launchGame} />
        <About />
        <Projects />
        <Contact />
      </main>

      {/* ---- Launch button, bottom-right, when the game is closed ---- */}
      {!gameOpen && (
        <button type="button" className="game-launch-btn" onClick={launchGame}>
          ▶ Know me through a game
        </button>
      )}

      {/* ---- The game overlay: mounted after first launch, hidden (not destroyed)
              when exited so its scene keeps running for instant re-entry ---- */}
      {launched && (
        <div className={gameOpen ? 'game-shell open' : 'game-shell'}>
          <GameLauncher onExit={exitGame} />
        </div>
      )}
    </>
  );
}
