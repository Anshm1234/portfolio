import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyDeskEffects } from './desk-effects.js';
import { setupShowcase } from './showcase.js';
import { STATIONS } from './stations.data.js';
import { createPlanets, createSparkles } from './decor.js';
import { createSky, createSun, createGrass, createClouds, createBirds, createStars, createBushes, createRocks } from './nature.js';
import { createPost } from './post.js';
import {
  DAY_PHASE,
  SKY_COLOR, TILE_A, TILE_B, FOG_NEAR, FOG_FAR,
  HEMI_SKY, HEMI_GROUND, HEMI_INTENSITY, SUN_COLOR, SUN_INTENSITY, SUN_POS, SPOT_INTENSITY,
  SIZE, HALF,
  INTERACT_RADIUS, SPEED, GRAVITY, SKY_GRAVITY, FALL_IMPACT, SKY_SPAWN_Y, CHAR_HEIGHT,
  CAM_OFF as CAM_OFF_XYZ, CAM_FOV, CAM_LOOK_UP, ZOOM_MIN, ZOOM_MAX,
} from './config.js';

// Tell the site when every queued asset (character + station GLBs) has
// arrived — the launch loader (hamster wheel) hides on this signal. All the
// GLTFLoaders here use THREE's DefaultLoadingManager, whose onLoad fires
// when its queue empties; we forward the FIRST firing as a window event.
let readyFired = false;
THREE.DefaultLoadingManager.onLoad = () => {
  if (readyFired) return;
  readyFired = true;
  window.__gameReady = true;                 // for listeners that attach late
  dispatchEvent(new Event('game:ready'));
};

// ============================================================
// 1. SCENE BASICS — the "canvas, camera, renderer" trinity.
//    scene = the world tree (like the DOM)
//    camera = the eye
//    renderer = the thing that draws 60x/second
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);   // haze hides the void edge

const camera = new THREE.PerspectiveCamera(CAM_FOV, innerWidth / innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Mount into #game-canvas if React provided it, else fall back to <body>.
(document.getElementById('game-canvas') || document.body).appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ============================================================
// 2. LIGHTS — hemisphere = soft ambient sky/ground light,
//    directional = the "sun" (the only one that casts shadows)
// ============================================================
scene.add(new THREE.HemisphereLight(HEMI_SKY, HEMI_GROUND, HEMI_INTENSITY));
const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
sun.position.set(...SUN_POS);   // matches where the sun disc is drawn
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;  sun.shadow.camera.bottom = -18;
sun.shadow.camera.far = 60;
scene.add(sun);

// Follow spotlight — a white beam that tracks the player like a
// stage light, so the character stays readable in the dark scene.
const spot = new THREE.SpotLight(0xffffff, SPOT_INTENSITY, 50, Math.PI / 7, 0.45);
spot.position.set(0, 16, 0);
spot.castShadow = true;
scene.add(spot);
scene.add(spot.target);


// ============================================================
// 3. THE 30x30 PLATFORM — one InstancedMesh = 900 blocks drawn
//    in a single GPU call. dummy is a throwaway Object3D used
//    to compute each block's transform matrix.
// ============================================================
const blockGeo = new THREE.BoxGeometry(1, 1, 1);
const blockMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const platform = new THREE.InstancedMesh(blockGeo, blockMat, SIZE * SIZE);
platform.receiveShadow = true;

const dummy = new THREE.Object3D();
const cA = new THREE.Color(TILE_A), cB = new THREE.Color(TILE_B);
let i = 0;
for (let x = 0; x < SIZE; x++) {
  for (let z = 0; z < SIZE; z++) {
    dummy.position.set(x - HALF + 0.5, -0.5, z - HALF + 0.5);
    dummy.updateMatrix();
    platform.setMatrixAt(i, dummy.matrix);
    // subtle checkerboard turf so bare soil peeks through the grass
    platform.setColorAt(i, (x + z) % 2 ? cA : cB);
    i++;
  }
}
platform.instanceColor.needsUpdate = true;
scene.add(platform);

// --- World layers — each factory adds its objects to the scene and
//     returns { update } for the loop. Nature = the real-world skin
//     (sky, sun, grass, clouds, birds); decor = planets + foot sparkles.
// Each is wrapped so a single broken system can't blank the whole game —
// if one throws, we log it and substitute a no-op so the loop still runs.
const NOOP = { update() {} };
const safe = (name, make) => {
  try { return make(scene); }
  catch (e) { console.error(`[world] "${name}" failed to build:`, e); return NOOP; }
};
const sky      = safe('sky',      createSky);
const sunDisc  = safe('sun',      createSun);
const grass    = safe('grass',    createGrass);
const bushes   = safe('bushes',   createBushes);
safe('rocks', createRocks);          // static — nothing to tick
const clouds   = safe('clouds',   createClouds);
const birds    = safe('birds',    createBirds);
const stars    = DAY_PHASE === 'night' ? safe('stars', createStars) : NOOP;   // night sky only
const planets  = safe('planets',  createPlanets);
const sparkles = safe('sparkles', createSparkles);

// ============================================================
// 4. STATIONS — loads each prop from stations.data.js, auto-fits it,
//    and gives it a floor halo + approach glow. Add a station there.
// ============================================================
// How much a prop with no emissive parts self-lights at rest. Turn UP if props
// look drab/colourless in dim light; turn DOWN if they look flat and unlit.
const REST_GLOW = 0.45;

// Bounding box used for auto-fit + standing the prop on the ground. `ignore`
// skips meshes that shouldn't define the footprint: the tree's falling-leaf
// cards are scattered around it and some sit BELOW the trunk base, so they'd
// drag the box down and hoist the whole tree into the air.
function propBox(g, ignore) {
  if (!ignore) return new THREE.Box3().setFromObject(g);
  const box = new THREE.Box3();
  g.traverse((o) => { if (o.isMesh && !ignore.test(o.name)) box.expandByObject(o); });
  return box.isEmpty() ? new THREE.Box3().setFromObject(g) : box;
}

const stationLoader = new GLTFLoader();
for (const s of STATIONS) {
  s.glowMats = [];          // materials whose emissive the glow pulse drives
  if (s.model) {
    // Blender prop: load, auto-fit to `fit` units tall, feet at y=0, and
    // give a soft glow ring on the floor so it still reads as a station.
    stationLoader.load(s.model, (gltf) => {
      const g = gltf.scene;

      // Live shader effects the GLB can't bake (steam, monitor fire, leaf
      // sway) — only for props that have those parts, e.g. the desk. Do it
      // FIRST so we know which meshes now own a ShaderMaterial and must be
      // skipped by the glow pass below. It ALSO creates + plays the baked
      // sway mixer internally, so we don't make a separate one here.
      s.fx = s.effects ? applyDeskEffects(g, gltf.animations) : { effectMeshes: new Set(), update() {} };

      // Remember the monitor screen so the showcase can dolly to face it.
      g.traverse((o) => { if (o.isMesh && /screen/i.test(o.name)) s.screen = o; });

      // Keep the model's original colors. We clone each material so we can
      // safely animate ITS OWN emissive on approach (a glow-up, not a
      // recolor). Skip the shader-swapped effect meshes entirely.
      g.traverse((o) => {
        if (!o.isMesh || s.fx.effectMeshes.has(o)) return;
        o.castShadow = true; o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const cloned = mats.map((m) => {
          const c = m.clone();
          // The desk-top material (`Desk_Wood`) ships with no base color in
          // the GLB (defaults to flat white), so give it a natural, muted
          // oak. No saturation/brightness boost anymore — that was a
          // dark-scene hack; the daylight lighting reads true colors now.
          if (/desk[_ ]?wood|table/i.test(c.name || '') && !c.map) {
            c.color = new THREE.Color(0x9b7b55);   // natural oak
            if ('roughness' in c) c.roughness = 0.78;   // matte, real wood
          }
          // about_me's `HamsterFur` ships with NO base color (glTF defaults
          // it to flat white), so the body glows white. Give it the same
          // golden-tan the model uses for `ArmFur` so body + arms match.
          if (/hamsterfur/i.test(c.name || '')) c.color = new THREE.Color(0.74, 0.40, 0.16);

          // The signpost (direction.glb) ships its `AgedWood` and `SignPaint`
          // materials with NO base color either — everything but the moss
          // renders flat white. Paint them warm wooden shades (matching the
          // site's walnut palette): weathered walnut for the structure, a
          // lighter carved-oak for the raised board letters so they read.
          if (/agedwood/i.test(c.name || '')) {
            c.color = new THREE.Color(0x7a4f28);        // --wood-deep walnut
            if ('roughness' in c) c.roughness = 0.85;   // weathered, matte
          }
          if (/signpaint/i.test(c.name || '')) {
            c.color = new THREE.Color(0xcaa96e);        // lighter oak lettering
            if ('roughness' in c) c.roughness = 0.7;
          }

          // AUTHORED glow vs SEEDED glow:
          //  • The desk ships real emissive parts (Screen_Emit, Amber_LED…) —
          //    that glow is deliberate, so keep it at the level it was authored.
          //  • Everything else has no emissive at all. Seed it from the
          //    material's OWN colour so each part glows in its own hue, and let
          //    it self-light a little at rest. That lift is what keeps props
          //    vivid under dim sunset/night lighting — it's the look the
          //    workstation has always had.
          // The level matters: three defaults emissiveIntensity to 1, which is
          // fine for the desk (dark base colours add ~nothing) but blows out
          // light materials like the letterbox's white/gold into a flat, unlit
          // slab. REST_GLOW keeps the colour lift without the blowout.
          const authored = 'emissive' in c && (c.emissive.r + c.emissive.g + c.emissive.b) > 0;
          if (authored) {
            c.userData.baseEmissiveI = c.emissiveIntensity ?? 1;   // artist's intent, always on
          } else if ('emissive' in c) {
            c.emissive = c.color.clone();          // its own hue, never a wash of one accent
            // Textured props (the tree's bark/leaf atlas) carry their colour in
            // the MAP, not in .color — which is plain white. Glow through the
            // texture, or the whole thing self-lights as a flat white blob.
            if (c.map) c.emissiveMap = c.map;
            c.userData.baseEmissiveI = REST_GLOW;  // gentle always-on lift; pulses up on approach
          }
          s.glowMats.push(c);
          return c;
        });
        o.material = Array.isArray(o.material) ? cloned : cloned[0];
      });
      const box = propBox(g, s.ignore);
      const sz = new THREE.Vector3(); box.getSize(sz);
      const k = (s.fit || 2.6) / sz.y;
      g.scale.setScalar(k);
      // feet on the ground, plus an optional manual nudge
      g.position.set(s.x, -box.min.y * k + (s.y ?? 0), s.z);
      g.rotation.y = s.rotY ?? 0;              // per-station facing (radians)
      g.userData.baseScale = k;                // remember for the approach "pop"
      // baked clips (the tree's falling leaves). The desk's clips are consumed
      // by applyDeskEffects above, so this is only for `animate` props.
      if (s.animate && gltf.animations.length) {
        s.mixer = new THREE.AnimationMixer(g);
        for (const clip of gltf.animations) s.mixer.clipAction(clip).play();
      }
      scene.add(g);
      s.group = g;
    });
    // floor halo so the spot is visible before the model loads / from afar
    // (not for decor props — scenery shouldn't advertise itself)
    if (!s.decor) {
      const halo = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40),
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.25,
          blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(s.x, 0.03, s.z);
      scene.add(halo);
      s.halo = halo;
    }
  } else {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.6, 0.9),
      new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.5 })
    );
    pillar.position.set(s.x, 0.8, s.z);
    pillar.castShadow = true;
    scene.add(pillar);
    s.mesh = pillar;
    s.glowMats.push(pillar.material);
  }
}

// ============================================================
// 5. THE PLAYER — a Group (empty container) whose position we
//    move. The visible model goes INSIDE it. This separation is
//    key: physics moves the group; animation wiggles the model.
// ============================================================
const player = new THREE.Group();
scene.add(player);
let model = null;         // the visible character
let modelBaseY = 0;       // so bobbing has a home position
let mixer = null;         // plays the GLB's animation clips
const actions = {};       // lowercase clip name -> AnimationAction
let currentAction = null;

// Cross-fade to the named clip; falls back to the first clip if the
// requested one isn't in the GLB (e.g. no Walk exported yet).
function playClip(name) {
  const next = actions[name] || Object.values(actions)[0];
  if (!next || next === currentAction) return;
  if (currentAction) currentAction.fadeOut(0.2);
  next.reset().fadeIn(0.2).play();
  currentAction = next;
}

// Placeholder character (box-person) shown until your .glb exists
function makePlaceholder() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c });
  const part = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };
  part(0.7, 0.8, 0.45, 0x3e78e8, 0, 0.85, 0);    // torso
  part(0.85, 0.8, 0.8, 0xf2c992, 0, 1.75, 0);    // big head (Funko!)
  part(0.9, 0.28, 0.85, 0x33241a, 0, 2.2, 0);    // hair
  part(0.22, 0.45, 0.24, 0x2b2a52, -0.18, 0.22, 0); // legs
  part(0.22, 0.45, 0.24, 0x2b2a52, 0.18, 0.22, 0);
  return g;
}

// Try to load /public/character.glb; fall back to placeholder.
// When you finish Stage 2, just drop character.glb into public/
// and refresh — this code doesn't change.
new GLTFLoader().load(
  '/models/character.glb',
  (gltf) => {
    model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      // Make the colors pop: push each material's hue toward higher
      // saturation, let it self-glow with its own color, and lower
      // roughness so the spotlight catches vivid highlights. Hair is
      // left at its original color so it stays natural.
      const hsl = {};
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m) continue;
        const isHair = /hair/i.test(o.name) || /hair/i.test(m.name);
        if (m.color && !isHair) {
          m.color.getHSL(hsl);
          m.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.8), hsl.l);   // gentle saturation
        }
        if (m.color) { m.emissive = m.color.clone(); m.emissiveIntensity = isHair ? 0.2 : 0.35; }
        if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.emissiveMap = m.map; }
        if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 1, 0.6);
        if ('metalness' in m) m.metalness = Math.min(m.metalness ?? 0, 0.1);
        m.needsUpdate = true;
      }
    });
    // Auto-fit: whatever size you modeled at, scale to 2.6 units
    // tall and put feet at y=0. Kills the classic "my model is
    // 50x too big / underground" problem.
    const box = new THREE.Box3().setFromObject(model);
    const sizeV = new THREE.Vector3(); box.getSize(sizeV);
    const k = CHAR_HEIGHT / sizeV.y;
    model.scale.setScalar(k);
    model.position.y = -box.min.y * k;
    modelBaseY = model.position.y;
    player.add(model);
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      // when the one-shot Fall clip reaches its end, release the model
      // back to idle/walk (see playFall gate in the GROUND branch)
      mixer.addEventListener('finished', (e) => {
        if (e.action === actions['fall']) {
          playFall = false; currentAction = null;
          inputLocked = false;   // fall recovery done — hand control back
        }
      });
      for (const clip of gltf.animations)
        actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
      console.log('Clips found:', gltf.animations.map(c => c.name).join(', '));
      if (actions['walk']) actions['walk'].timeScale = 1.4;  // cadence matches SPEED=7
      if (actions['fall']) {
        // The Fall clip has two authored phases (see FALL_IMPACT):
        //   0 → 1.90s  descent (hips 2.32 → 0.41)
        //   1.90 → 4.50s  impact, head movement, stand back up.
        // We drive its .time by hand during the sky drop so the descent
        // stretches to fill the real air-time, then let it run at 1x on
        // landing so the impact/head part plays at its authored pace.
        actions['fall'].setLoop(THREE.LoopOnce);
        actions['fall'].clampWhenFinished = true;
      }
      if (actions['sit']) {
        // one-shot: sit down, then HOLD the seated pose until stand-up
        actions['sit'].setLoop(THREE.LoopOnce);
        actions['sit'].clampWhenFinished = true;
      }
      // If the model finished loading while the intro sky-drop is still in the
      // air, attach the Fall clip now (paused — the FALL/sky branch scrubs its
      // .time by height). Otherwise just stand idle.
      if (state === 'FALL' && fallMode === 'sky' && actions['fall']) {
        const f = actions['fall'];
        f.reset().play(); f.paused = true; f.time = 0;
        currentAction = f;
      } else {
        playClip('idle');
      }
    }
    console.log('Loaded your character ✔');
  },
  undefined,
  () => {
    model = makePlaceholder();
    modelBaseY = 0;
    player.add(model);
    console.log('No character.glb yet — using placeholder. That is fine for Stage 1.');
  }
);

// ============================================================
// 6. INPUT
// The game lives inside the website as a hidden-not-destroyed overlay,
// so its window-level listeners exist even while the visitor browses
// the site. Every handler must bail unless the game is actually open —
// otherwise it eats the page's scroll wheel and arrow keys ("site
// frozen after exiting the game" bug).
// ============================================================
const gameIsOpen = () => document.body.classList.contains('game-open');
const keys = {};
addEventListener('keydown', (e) => {
  if (!gameIsOpen()) return;             // browsing the site — don't intercept
  if (e.key.startsWith('Arrow')) e.preventDefault();
  const k = e.key.toLowerCase();
  // while the PC showcase is open it captures navigation + exit
  if (state === 'PROJECT') {
    if (k === 'escape') return exitProject();
    if (k === 'arrowright' || k === 'arrowdown') return showcaseUI && showcaseUI.nextProject();
    if (k === 'arrowleft'  || k === 'arrowup')   return showcaseUI && showcaseUI.prevProject();
    return;                              // swallow other keys so the player stays put
  }
  if ((k === 'e' || k === 'enter') && !e.repeat) return interact();
  if (k === 'escape') { standUp(); return closePanel(); }
  keys[k] = true;
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });   // always safe: only clears

// ============================================================
// 7. UI PANEL
// ============================================================
const promptEl = document.getElementById('prompt');
const panel = document.getElementById('panel');
const pTitle = document.getElementById('panel-title');
const pBody = document.getElementById('panel-body');
const pLink = document.getElementById('panel-link');
document.getElementById('panel-close').onclick = closePanel;
let panelOpen = false;

function nearestStation() {
  let best = null, bd = INTERACT_RADIUS;
  for (const s of STATIONS) {
    if (s.decor) continue;               // scenery — never interactive
    const d = Math.hypot(player.position.x - s.x, player.position.z - s.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
// --- Sitting (the tree) ---------------------------------------
// A station with `action: 'sit'` doesn't open a panel — E sits the character
// down (one-shot Sit clip, held at the seated pose). E again, Escape, or any
// movement key stands back up.
let sitting = false;
function sitDown() { sitting = true; playClip('sit'); }
function standUp() { if (sitting) { sitting = false; playClip('idle'); } }

function interact() {
  if (state === 'PROJECT') return;       // already inside the showcase
  if (panelOpen) return closePanel();
  if (sitting) return standUp();
  const s = nearestStation();
  if (!s) return;
  if (s.action === 'sit') return sitDown();
  // the workstation opens the interactive PC showcase instead of a panel
  if (s.id === 'projects' && s.group) return enterProject();
  pTitle.textContent = s.name;
  pTitle.style.color = '#' + s.color.toString(16).padStart(6, '0');
  pBody.textContent = s.body;
  if (s.link) { pLink.textContent = s.link[0]; pLink.href = s.link[1]; }
  else { pLink.textContent = ''; pLink.removeAttribute('href'); }
  panel.style.display = 'block';
  panelOpen = true;
}
function closePanel() { panel.style.display = 'none'; panelOpen = false; }

// ============================================================
// 8. THE STATE MACHINE — the heart of your idea.
//    GROUND: walk around; step past the edge -> FALL
//    FALL:   gravity + tumble; fall past -20 -> teleport to the
//            SKY above center, still in FALL, so the same landing
//            check handles both the death-fall and the re-entry.
// ============================================================
// The game opens on the intro sky-drop: the player free-falls in from above
// center, and the Fall clip runs through to the stand-up on landing.
let state = 'FALL';
let fallMode = 'sky';       // 'edge' = cartoon tumble off the rim, 'sky' = respawn/intro drop
let skyStartY = SKY_SPAWN_Y; // height the sky drop begins at, to map descent → clip time
let playFall = false;       // true while the post-impact Fall phase owns the model
let inputLocked = false;    // when true, movement keys are ignored (e.g. during fall recovery)
let vy = -2;                // vertical velocity (already descending for the intro drop)
player.position.set(0, SKY_SPAWN_Y, 0);   // begin mid-air
let walkT = 0;              // walk-cycle clock for the bob
let squashT = 0;            // landing squash timer
// speeds/gravity/heights live in config.js
const CAM_OFF = new THREE.Vector3(...CAM_OFF_XYZ);    // "top corner of the cube"
const camYaw = Math.atan2(CAM_OFF.x, CAM_OFF.z);      // 45° — used to rotate input
const UP = new THREE.Vector3(0, 1, 0);
const camTarget = new THREE.Vector3();
const moveDir = new THREE.Vector3();
camera.position.copy(CAM_OFF);

// Scroll-wheel zoom — scales the camera's corner offset. 1 = default,
// larger = farther away. `zoom` is the smoothed value the loop reads;
// `zoomTarget` is where the wheel is driving it.
let zoom = 1, zoomTarget = 1;
addEventListener('wheel', (e) => {
  if (!gameIsOpen()) return;   // let the website scroll normally
  e.preventDefault();
  // Touchpads emit streams of tiny deltas (~2–20px) where one mouse-wheel
  // notch is ~100px, so zooming felt glacial on a trackpad. Boost fine
  // deltas; real wheel notches (≥60px) pass through unchanged.
  const d = e.deltaY * (Math.abs(e.deltaY) < 60 ? 4.5 : 1);
  zoomTarget = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomTarget * (1 + d * 0.001)));
}, { passive: false });
const scaledOff = new THREE.Vector3();               // CAM_OFF * zoom, reused each frame

// ============================================================
// PC SHOWCASE — cinematic dolly into the workstation monitor, then
// hand off to the DOM overlay (see setupShowcase / projects.js).
// state === 'PROJECT' owns the camera; on exit we restore GROUND.
// ============================================================
const camGoal = new THREE.Vector3();     // where the camera is dollying to
const lookGoal = new THREE.Vector3();    // where it should look during the dolly
let dollyActive = false;                 // true while animating in/out
let showcaseUI = null;                   // the overlay controller (set below)
const _wp = new THREE.Vector3(), _wq = new THREE.Quaternion(), _fwd = new THREE.Vector3();

// Compute a camera position that frames the monitor screen head-on.
function computeMonitorShot(station) {
  const screen = station.screen;
  if (!screen) return false;
  screen.getWorldPosition(_wp);          // screen center in world space
  screen.getWorldQuaternion(_wq);
  // the screen faces along its local +Z; pull the camera out along that
  _fwd.set(0, 0, 1).applyQuaternion(_wq).normalize();
  lookGoal.copy(_wp);
  camGoal.copy(_wp).addScaledVector(_fwd, 3.4).add(new THREE.Vector3(0, 0.15, 0));
  return true;
}

function enterProject() {
  const s = STATIONS.find((x) => x.id === 'projects');
  if (!s || !s.group) return;            // model not loaded yet
  if (!computeMonitorShot(s)) return;
  state = 'PROJECT';
  dollyActive = true;
  panelOpen = false; panel.style.display = 'none';
  promptEl.style.display = 'none';
  showcaseUI && showcaseUI.open();       // fade the overlay in as we arrive
}

function exitProject() {
  showcaseUI && showcaseUI.close();   // always hide the overlay
  if (state === 'PROJECT') {
    state = 'GROUND';
    dollyActive = true;               // animate the pull-back to the follow-cam
  }
}

function lerpAngle(a, b, t) {
  const d = (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return a + d * Math.min(1, t);
}

function update(dt, t) {
  if (mixer) mixer.update(dt);
  if (state === 'GROUND') {
    let ix = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let iz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (panelOpen || inputLocked) ix = iz = 0;   // no movement while a panel is open or fall recovery plays
    if (sitting && (ix || iz)) standUp();        // any movement key stands you up
    const moving = ix !== 0 || iz !== 0;
    // hold off idle/walk while the post-impact Fall phase plays, or while seated
    if (!playFall && !sitting) playClip(moving ? 'walk' : 'idle');

    if (moving) {
      // Camera sits at a 45° corner, so rotate the input by the
      // camera's yaw — that makes W mean "up the screen".
      moveDir.set(ix, 0, iz).normalize().applyAxisAngle(UP, camYaw);
      player.position.addScaledVector(moveDir, SPEED * dt);
      // face the direction of travel (models face +Z by convention)
      player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(moveDir.x, moveDir.z), 12 * dt);
      walkT += dt;
    }

    // Stage-1 "animation": bob while walking, breathe while idle.
    // Only used for the placeholder — real GLB clips come from the
    // mixer instead, so skip the fake bob when one is playing.
    if (model && !mixer) {
      model.position.y = modelBaseY +
        (moving ? Math.abs(Math.sin(walkT * 10)) * 0.09 : Math.sin(t * 2) * 0.02);
      model.rotation.x = moving ? 0.06 : 0;   // tiny forward lean
    }

    // landing squash recovery
    if (squashT > 0) {
      squashT -= dt;
      const q = Math.max(0, squashT / 0.18);
      player.scale.set(1 + 0.25 * q, 1 - 0.3 * q, 1 + 0.25 * q);
    } else player.scale.set(1, 1, 1);

    // walked off the edge?
    if (Math.abs(player.position.x) > HALF || Math.abs(player.position.z) > HALF) {
      state = 'FALL';
      fallMode = 'edge';
      vy = 2.5;                     // little cartoon hop before the drop
    }
  } else { // FALL
    vy -= (fallMode === 'sky' ? SKY_GRAVITY : GRAVITY) * dt;
    player.position.y += vy * dt;
    if (fallMode === 'edge') {
      // classic cartoon tumble off the rim
      if (model) { model.rotation.x += 3.5 * dt; model.rotation.z += 1.5 * dt; }
    } else if (actions['fall']) {
      // sky respawn — scrub the clip's DESCENT phase (0 → FALL_IMPACT) so
      // it stretches to match however long the drop actually takes. Map
      // the player's height (spawn → ground) onto that clip window.
      const f = actions['fall'];
      const p = Math.min(1, Math.max(0, (skyStartY - player.position.y) / skyStartY));
      f.time = p * FALL_IMPACT;
      mixer.update(0);            // re-evaluate the paused action at the new .time
    }

    // fell into the void -> reappear in the SKY above center,
    // still falling. Same landing check below catches it.
    if (player.position.y < -20) {
      player.position.set(0, SKY_SPAWN_Y, 0);
      vy = -2;
      fallMode = 'sky';
      skyStartY = SKY_SPAWN_Y;
      if (model) { model.rotation.x = 0; model.rotation.z = 0; }  // un-tumble for the clip
      // start the Fall clip from the top, frozen — we scrub it by hand
      if (actions['fall']) {
        currentAction && currentAction.fadeOut(0.15);
        const f = actions['fall'];
        f.reset().play();
        f.paused = true;      // we set .time manually until landing
        f.time = 0;
        currentAction = f;
      }
    }

    // touched down inside the platform?
    if (player.position.y <= 0 && vy < 0 &&
        Math.abs(player.position.x) <= HALF && Math.abs(player.position.z) <= HALF) {
      player.position.y = 0;
      state = 'GROUND';
      squashT = 0.18;
      if (model) { model.rotation.x = 0; model.rotation.z = 0; }
      // sky drop: on impact, hand the Fall clip back to the mixer so the
      // impact → head-movement → stand-up phase runs at its authored 1x.
      // playFall keeps GROUND from switching to idle/walk until it ends.
      if (fallMode === 'sky' && actions['fall']) {
        const f = actions['fall'];
        f.paused = false;
        f.time = FALL_IMPACT;   // resume exactly at the impact frame
        playFall = true;
        inputLocked = true;     // freeze movement until the clip finishes
      }
    }
  }

  // spotlight follows the player from directly overhead
  spot.position.set(player.position.x, 16, player.position.z);
  spot.target.position.copy(player.position);

  // world layers — grass wind, drifting clouds, circling birds, orbiting
  // planets, and the foot sparkles that trail the character on the ground
  grass.update(dt, t);
  bushes.update(dt, t);
  clouds.update(dt, t);
  birds.update(dt, t);
  stars.update(dt, t);
  planets.update(dt, t);
  sparkles.update(dt, t, player, state === 'GROUND');

  // station glow + prompt — as the player nears a station it lights up:
  // its materials glow (from their OWN base emissive, so colors are kept),
  // the floor halo swells, and a GLB prop gives a subtle scale "pop".
  const near = state === 'GROUND' && !panelOpen ? nearestStation() : null;
  for (const s of STATIONS) {
    if (s.fx) s.fx.update(dt, t);            // baked sway + live steam/fire/leaf shaders
    if (s.mixer) s.mixer.update(dt);         // baked clips (tree's falling leaves)
    // smooth 0..1 "activation" that eases toward 1 when this is the near one
    s.act = (s.act ?? 0) + (((s === near) ? 1 : 0) - (s.act ?? 0)) * (1 - Math.exp(-9 * dt));
    const pulse = 1.0 + 0.4 * Math.sin(t * 7);
    for (const m of s.glowMats) {
      const base = m.userData.baseEmissiveI ?? 0.45;
      m.emissiveIntensity = base + (pulse - base) * s.act;   // lift toward the pulse
    }
    if (s.halo) {
      s.halo.material.opacity = 0.22 + (0.35 + 0.08 * Math.sin(t * 4)) * s.act;
      const hs = 1 + 0.5 * s.act;                            // halo swells on approach
      s.halo.scale.set(hs, hs, hs);
    }
    if (s.group && s.group.userData.baseScale) {
      const k = s.group.userData.baseScale * (1 + 0.06 * s.act);   // gentle pop
      s.group.scale.setScalar(k);
    }
  }
  if (near) { promptEl.textContent = 'E — ' + near.name; promptEl.style.display = 'block'; }
  else promptEl.style.display = 'none';

  // camera
  if (state === 'PROJECT') {
    // cinematic dolly toward the monitor, easing in and holding there
    const k = 1 - Math.exp(-3.2 * dt);
    camera.position.lerp(camGoal, k);
    camTarget.lerp(lookGoal, k);
    camera.lookAt(camTarget);
  } else {
    // anchored to the corner offset (scaled by zoom), but never dives
    // below the platform when you fall — it watches you drop. Cinema.
    zoom += (zoomTarget - zoom) * (1 - Math.exp(-8 * dt));   // smooth toward wheel target
    scaledOff.copy(CAM_OFF).multiplyScalar(zoom);
    const anchorY = Math.max(player.position.y, 0);
    const goal = new THREE.Vector3(player.position.x, anchorY, player.position.z).add(scaledOff);
    // during the exit dolly, ease a little slower so it feels like a pull-back
    const k = 1 - Math.exp((dollyActive ? -3.2 : -5) * dt);
    camera.position.lerp(goal, k);
    camTarget.lerp(new THREE.Vector3().copy(player.position).setY(player.position.y + CAM_LOOK_UP), k);
    camera.lookAt(camTarget);
    if (dollyActive && camera.position.distanceTo(goal) < 0.05) dollyActive = false;
  }
}

// PC showcase overlay lives in ./showcase.js; wire its exit to our dolly-out.
showcaseUI = setupShowcase(exitProject);

// ============================================================
// 9. THE LOOP
// ============================================================
// film-grain post; if it fails to build, fall back to plain rendering
let post = null;
try {
  post = createPost(renderer, scene, camera);
  addEventListener('resize', () => post.setSize(innerWidth, innerHeight));
} catch (e) { console.error('[post] film grain disabled:', e); }

const clock = new THREE.Clock();
let loopErrored = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  try {
    update(dt, clock.elapsedTime);
    if (post) post.render(clock.elapsedTime);   // scene + film grain
    else renderer.render(scene, camera);
  } catch (e) {
    if (!loopErrored) { loopErrored = true; console.error('[loop] frame error:', e); }
    renderer.render(scene, camera);   // keep drawing the scene regardless
  }
});

// ============================================================
// 10. DEV HOT-RELOAD
// This module builds the whole scene once at import time and has no
// teardown, so a hot update can't rebuild it — edits to config.js /
// stations.data.js / decor.js would silently do nothing until a manual
// refresh. Force a full page reload instead so changes always show.
// ============================================================
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    sessionStorage.setItem('relaunchGame', '1');   // reopen the game after reload
    location.reload();
  });
}