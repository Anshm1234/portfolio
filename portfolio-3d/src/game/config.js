// ============================================================
// CONFIG — every tuning knob for the 3D world, in one place.
// Change the look/feel here instead of hunting through index.js.
// ============================================================

// --- Time-of-day palette --------------------------------------
// The world is recoloured to match the visitor's LOCAL clock. This is pure
// data: config picks ONE palette at boot and exports its colours under the
// same names everything already imports — no runtime / per-frame logic, so it
// cannot destabilise the render loop. To pin a single look (e.g. keep the
// blush sunset always), set FORCE_PHASE below to that phase name.

// dawn (5–7am) — soft peach-pink horizon, cool pale sky, gentle light
// day (7am–5pm) — the original bright blue daylight
// sunset (5–7pm) — your blush-pink favorite, unchanged
// dusk (7–9pm) — deeper rose into periwinkle, low warm sun
// night (9pm–5am) — deep navy sky, cool dim moonlight
const FORCE_PHASE = 'null';   // TESTING — cycle: 'dawn'→'day'→'sunset'→'dusk'→'night', then back to null

const PALETTES = {
  //        horizon/fog  zenith      sunDisc      tileA/tileB          accent
  dawn:   { sky:0xf0cdbe, zenith:0xaeb6d6, sunDisc:0xffe6c0, tileA:0x82945e, tileB:0x71844f, accent:0xffcf8a,
            hemiSky:0xe6dce6, hemiGround:0x8a9068, hemiI:1.1,  sun:0xffeede, sunI:1.5, grassBase:0x5b6f44, grassTip:0xaec283 },
  day:    { sky:0xbfe3f2, zenith:0x8bc0e8, sunDisc:0xfff8e0, tileA:0x7d9a5e, tileB:0x6f8b52, accent:0xffd166,
            hemiSky:0xcfe6ff, hemiGround:0x8aa06a, hemiI:1.15, sun:0xfff6ea, sunI:1.9, grassBase:0x5f7d45, grassTip:0xafcc82 },
  sunset: { sky:0xe7c1b4, zenith:0x9a97bd, sunDisc:0xffdca2, tileA:0x8b8a54, tileB:0x77794a, accent:0xffb84d,
            hemiSky:0xf3d6cf, hemiGround:0x958566, hemiI:1.1,  sun:0xffe0c6, sunI:1.7, grassBase:0x5c6a41, grassTip:0xbec079 },
  dusk:   { sky:0xc98f9a, zenith:0x6a6494, sunDisc:0xffb877, tileA:0x6f7048, tileB:0x5f6240, accent:0xe89a5a,
            hemiSky:0xb9a2c0, hemiGround:0x6f6650, hemiI:0.95, sun:0xffc890, sunI:1.3, grassBase:0x4e5a3a, grassTip:0x9a9a64 },
  // moonlit night — cool blue, but bright enough to actually see the world
  night:  { sky:0x39406e, zenith:0x1c2246, sunDisc:0xeef2ff, tileA:0x49536e, tileB:0x3d4660, accent:0x9fc0ff,
            hemiSky:0x7385bd, hemiGround:0x40465e, hemiI:1.4,  sun:0xcdd8ff, sunI:1.05, grassBase:0x3c4a3a, grassTip:0x74855f },
};

function phaseForHour(h) {
  if (h >= 5  && h < 7)  return 'dawn';
  if (h >= 7  && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'sunset';
  if (h >= 19 && h < 21) return 'dusk';
  return 'night';
}

// Only a REAL palette name pins the phase — null, 'NULL', a typo, anything
// else falls through to the clock. (Guards the silent 'NULL' → sunset trap.)
export const DAY_PHASE = PALETTES[FORCE_PHASE] ? FORCE_PHASE : phaseForHour(new Date().getHours());
const P = PALETTES[DAY_PHASE];
console.log(`[game] time-of-day theme: ${DAY_PHASE}` + (PALETTES[FORCE_PHASE] ? ' (forced)' : ' (by clock)'));

// --- Sky -------------------------------------------------------
export const SKY_COLOR   = P.sky;      // horizon / fog
export const SKY_ZENITH  = P.zenith;   // overhead
export const SUN_DISC    = P.sunDisc;  // the visible sun/moon sprite

// --- Ground ----------------------------------------------------
// The blocky island shows between grass blades and along the cliff
// edges, so these read as soft soil/turf under the grass.
export const TILE_A      = P.tileA;    // checkerboard light square
export const TILE_B      = P.tileB;    // checkerboard dark square
export const ACCENT      = P.accent;   // warm accent (station halos default)

// --- Fog -------------------------------------------------------
export const FOG_NEAR = 55;
export const FOG_FAR  = 130;

// --- Lights ----------------------------------------------------
export const HEMI_SKY    = P.hemiSky,      // bounce from the sky (phase-tinted)
             HEMI_GROUND = P.hemiGround,   // bounce off the grass
             HEMI_INTENSITY = P.hemiI;
// Key light colour + strength come from the phase (warm ivory at sunset,
// bright at midday, cool + dim moonlight at night).
export const SUN_COLOR   = P.sun, SUN_INTENSITY = P.sunI;
// Light comes from the far side (-x,-z) so shadows fall toward the camera
// and the sun DISC hangs on the horizon the camera actually looks at.
export const SUN_POS      = [-38, 46, -25];  // the LIGHT (high, good shading)
export const SUN_DISC_POS = [-100, 24, -66]; // the visible disc (low, in frame)
export const SPOT_INTENSITY = 2;       // subtle follow-highlight on the character

// --- Platform --------------------------------------------------
export const SIZE = 35;                // platform is SIZE x SIZE blocks
export const HALF = SIZE / 2;          // all edge/fall math derives from this

// --- Grass -----------------------------------------------------
export const GRASS_BLADES = 27000;     // instanced blades (one draw call) — scaled to the 35x35 platform
export const GRASS_HEIGHT = 0.38;      // blade length (world units)
export const GRASS_WIDTH  = 0.045;     // blade width at the base
export const GRASS_BASE   = P.grassBase;  // colour at the blade root (phase-tinted)
export const GRASS_TIP    = P.grassTip;   // colour at the blade tip (phase-tinted)
export const WIND_SPEED   = 1.6;       // how fast the wind wave travels
export const WIND_STRENGTH = 0.22;     // how far the tips bend

// --- Sky life --------------------------------------------------
export const CLOUD_COUNT = 14;
export const BIRD_COUNT  = 4;

// --- Bushes / rocks --------------------------------------------
export const BUSH_COUNT = 16;          // clumps scattered over the platform
export const ROCK_COUNT = 3;           // boulders, half-buried in the turf

// --- Sparkles --------------------------------------------------
export const SPARK_N = 90;             // particle pool size

// --- Player / physics ------------------------------------------
export const INTERACT_RADIUS = 3.8;  // how close (units) "E" reaches a station
export const SPEED        = 7;       // walk speed (units/sec)
export const GRAVITY      = 20;        // edge-fall gravity
export const SKY_GRAVITY  = 7;         // respawn drop floats so the Fall clip reads
export const FALL_IMPACT  = 1.90;      // sec into Fall clip where feet hit the ground
export const SKY_SPAWN_Y  = 16;        // respawn height
export const CHAR_HEIGHT  = 2.6;       // character auto-fit height

// --- Camera ----------------------------------------------------
// Offset is lower + gaze lifted (CAM_LOOK_UP) so the horizon and sky
// are actually in frame — with the old 40°-down view, the sun, clouds
// and birds could never be seen at all.
export const CAM_OFF  = [12, 11, 12]; // corner offset (lower than before)
export const CAM_FOV  = 50;            // was 40 — wider to fit ground + sky
export const CAM_LOOK_UP = 3.5;        // look this far above the player's feet
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 3.5;
