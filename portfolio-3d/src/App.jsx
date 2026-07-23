import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Hero from './sections/Hero.jsx';
import Navbar from './components/Navbar.jsx';
import HamsterLoader from './components/HamsterLoader.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';

// Below-the-fold sections load as their own async chunks — the entry bundle
// carries only what first paint needs (Hero + navbar + the tiny loader).
// Each fallback keeps the section's id in the DOM so navbar anchor links and
// the scroll-spy still have a target while the chunk is in flight.
const About = lazy(() => import('./sections/About.jsx'));
const Journey = lazy(() => import('./sections/Journey.jsx'));
const Projects = lazy(() => import('./sections/Projects.jsx'));
const Contact = lazy(() => import('./sections/Contact.jsx'));
const GameLauncher = lazy(() => import('./components/GameLauncher.jsx'));

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

  // ---- welcome curtain: covers the site on first load, lifts to reveal it.
  //      Skipped when we're dropping straight back into the game (dev reload).
  const [showWelcome, setShowWelcome] = useState(!relaunch);

  // ---- hamster loader: covers the launch (until the game's assets are in)
  //      and the exit (a short beat while we swap back to the site)
  const [loader, setLoader] = useState(null);           // 'enter' | 'exit' | null
  const [loaderOut, setLoaderOut] = useState(false);    // fade-out in progress
  const timers = useRef([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const launchGame = () => {
    setLaunched(true); setGameOpen(true);
    setLoaderOut(false); setLoader('enter');
  };
  const exitGame = () => { setLoaderOut(false); setLoader('exit'); };

  // ENTER: the game boots underneath; hold until it fires `game:ready`
  // (all GLBs loaded), with a minimum run so the wheel reads, and a failsafe
  // so a broken asset can never strand the visitor on the loader.
  useEffect(() => {
    if (loader !== 'enter') return;
    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, 1600 - (performance.now() - start));
      timers.current.push(setTimeout(() => {
        setLoaderOut(true);
        timers.current.push(setTimeout(() => setLoader(null), 450));
      }, wait));
    };
    if (window.__gameReady) finish();                     // re-entry: already loaded
    else {
      addEventListener('game:ready', finish, { once: true });
      timers.current.push(setTimeout(finish, 15000));     // failsafe
    }
    return () => { removeEventListener('game:ready', finish); clearTimers(); };
  }, [loader]);

  // EXIT: cover the screen, swap back to the site beneath, fade off
  useEffect(() => {
    if (loader !== 'exit') return;
    timers.current.push(setTimeout(() => setGameOpen(false), 650));
    timers.current.push(setTimeout(() => {
      setLoaderOut(true);
      timers.current.push(setTimeout(() => setLoader(null), 450));
    }, 1500));
    return clearTimers;
  }, [loader]);

  // lock page scroll only while the game overlay is open
  useEffect(() => {
    document.body.classList.toggle('game-open', gameOpen);
    return () => document.body.classList.remove('game-open');
  }, [gameOpen]);

  return (
    <>
      {/* ---- Glass navbar — hidden while the game overlay is up ---- */}
      {!gameOpen && <Navbar />}

      {/* ---- Résumé button — fixed top-right, hidden during the game ---- */}
      {!gameOpen && (
        <a
          className="resume-btn"
          href="/Ansh_Resume_5july.pdf"
          target="_blank"
          rel="noopener"
          aria-label="View résumé (opens in a new tab)"
        >
          <span>Resume</span>
        </a>
      )}

      {/* ---- Traditional portfolio (always in the DOM; game overlays on top) ---- */}
      <main className="site">
        <Hero onPlay={launchGame} />
        <Suspense fallback={<section className="section" id="about" />}>
          <About />
        </Suspense>

        {/* hairline separating About from Journey */}
        <div className="section-divider" aria-hidden="true" />

        <Suspense fallback={<section className="section" id="journey" />}>
          <Journey />
        </Suspense>
        <Suspense fallback={<section className="section" id="projects" />}>
          <Projects onPlay={launchGame} />
        </Suspense>
        <Suspense fallback={<section className="section" id="contact" />}>
          <Contact />
        </Suspense>

        {/* hairline separating Contact from the footer — same diamond rule */}
        <div className="section-divider" aria-hidden="true" />

        {/* ---- Footer: a warm sign-off left, rights on the right ---- */}
        <footer className="site-footer">
          <span className="sf-thanks">~Thank you for visiting</span>
          <span className="sf-rights">© {new Date().getFullYear()} Ansh Madaan · All rights reserved</span>
        </footer>
      </main>

      {/* ---- Launch button, bottom-right, when the game is closed ---- */}
      {!gameOpen && (
        <button type="button" className="game-btn game-launch-btn" onClick={launchGame}>
          <span className="game-btn-halo" aria-hidden="true" />
          <span className="game-btn-scene" aria-hidden="true" />
          <span className="game-btn-label">
            <i className="gb-ham" aria-hidden="true">▶</i>
            Know me through a game
          </span>
        </button>
      )}

      {/* ---- The game overlay: mounted after first launch, hidden (not destroyed)
              when exited so its scene keeps running for instant re-entry ---- */}
      {launched && (
        <div className={gameOpen ? 'game-shell open' : 'game-shell'}>
          {/* the hamster loader covers this chunk's own load time */}
          <Suspense fallback={null}>
            <GameLauncher onExit={exitGame} />
          </Suspense>
        </div>
      )}

      {/* ---- Hamster wheel loader — over everything during enter/exit ---- */}
      {loader && (
        <HamsterLoader
          fading={loaderOut}
          label={loader === 'enter' ? 'LOADING WORLD' : 'LEAVING WORLD'}
        />
      )}

      {/* ---- Welcome curtain — over everything on first load, lifts to reveal ---- */}
      {showWelcome && <WelcomeScreen onDone={() => setShowWelcome(false)} />}
    </>
  );
}
