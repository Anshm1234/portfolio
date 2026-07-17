// ============================================================
// HAMSTER LOADER — full-screen overlay shown while the game world loads
// (and briefly on exit). Replica of the classic uiverse.io hamster-wheel
// loader (by Nawsome, MIT): a chubby orange-and-cream hamster galloping in
// a grey wheel, every part a CSS-animated div. Styles live in index.css.
// ============================================================
export default function HamsterLoader({ label = 'LOADING WORLD', fading = false }) {
  return (
    <div className={fading ? 'hamster-loader out' : 'hamster-loader'} role="status">
      <div aria-label="Hamster running in a wheel" role="img" className="wheel-and-hamster">
        <div className="wheel" />
        <div className="hamster">
          <div className="hamster__body">
            <div className="hamster__head">
              <div className="hamster__ear" />
              <div className="hamster__eye" />
              <div className="hamster__nose" />
            </div>
            <div className="hamster__limb hamster__limb--fr" />
            <div className="hamster__limb hamster__limb--fl" />
            <div className="hamster__limb hamster__limb--br" />
            <div className="hamster__limb hamster__limb--bl" />
            <div className="hamster__tail" />
          </div>
        </div>
        <div className="spoke" />
      </div>

      <div className="hl-label">
        {label}
        <span className="hl-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>
  );
}
