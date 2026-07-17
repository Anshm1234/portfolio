// ============================================================
// NATURE — the real-world layer: gradient sky, a bright sun, a field
// of wind-blown grass on top of the island, drifting clouds, and birds.
//
// Same pattern as decor.js: each factory takes the scene, adds its
// objects, and returns { update(dt, t) } for index.js to tick.
//
// The grass is ~55k instanced blades drawn in ONE draw call, bent by a
// wind wave in the vertex shader — no per-frame CPU work at all.
// ============================================================
import * as THREE from 'three';
import { STATIONS } from './stations.data.js';
import {
  SIZE, HALF, SKY_COLOR, SKY_ZENITH, SUN_DISC, SUN_DISC_POS,
  GRASS_BLADES, GRASS_HEIGHT, GRASS_WIDTH, GRASS_BASE, GRASS_TIP,
  WIND_SPEED, WIND_STRENGTH, CLOUD_COUNT, BIRD_COUNT, BUSH_COUNT, ROCK_COUNT,
} from './config.js';

// --- Gradient sky dome -----------------------------------------
// A big inverted sphere: light at the horizon, deeper blue overhead.
export function createSky(scene) {
  const geo = new THREE.SphereGeometry(180, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uHorizon: { value: new THREE.Color(SKY_COLOR) },
      uZenith:  { value: new THREE.Color(SKY_ZENITH) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uHorizon, uZenith;
      varying vec3 vPos;
      void main() {
        // 0 at the horizon, 1 straight up — eased so the band sits high
        float h = clamp(normalize(vPos).y, 0.0, 1.0);
        gl_FragColor = vec4(mix(uHorizon, uZenith, pow(h, 0.65)), 1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -1;
  scene.add(dome);
  return { update() {} };
}

// --- The sun ---------------------------------------------------
// A glowing disc + soft halo, billboarded where the sunlight comes from.
export function createSun(scene) {
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0.00, 'rgba(255,255,250,1)');
    grd.addColorStop(0.18, 'rgba(255,248,224,1)');
    grd.addColorStop(0.34, 'rgba(255,236,170,0.55)');
    grd.addColorStop(1.00, 'rgba(255,225,150,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color: SUN_DISC, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false }));
  // hang the disc low over the far horizon — the corner camera can only
  // see a band just above the horizon, so that's where the sun must live
  const dir = new THREE.Vector3(...SUN_DISC_POS).normalize();
  sprite.position.copy(dir.multiplyScalar(150));
  sprite.scale.setScalar(40);
  sprite.renderOrder = 0;
  scene.add(sprite);
  return { update() {} };
}

// --- Grass -----------------------------------------------------
// One tapered blade, instanced across the island top. A vertex-shader
// wind wave (driven by each blade's world position) bends the tips.
export function createGrass(scene) {
  // ---- blade geometry: tapered strip, dark at the root, bright at the tip
  const SEG = 4;
  const pos = [], col = [], nor = [], idx = [];
  const cBase = new THREE.Color(GRASS_BASE), cTip = new THREE.Color(GRASS_TIP);
  const c = new THREE.Color();
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const y = t * GRASS_HEIGHT;
    const w = (GRASS_WIDTH * 0.5) * (1 - t);   // taper to a point
    const z = t * t * 0.05;                     // slight natural droop
    pos.push(-w, y, z,   w, y, z);
    c.copy(cBase).lerp(cTip, t);
    col.push(c.r, c.g, c.b,   c.r, c.g, c.b);
    // face the normal upward so blades catch the sun like a surface
    nor.push(0, 1, 0,   0, 1, 0);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 2, b = a + 1, d = a + 2, e = a + 3;
    idx.push(a, d, b,   b, d, e);
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  blade.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  blade.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  blade.setIndex(idx);

  // ---- material: standard lighting + injected wind bend
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       // 0 at the root, 1 at the tip — squared so only the top bends
       float bh = clamp(position.y / ${GRASS_HEIGHT.toFixed(3)}, 0.0, 1.0);
       float bend = bh * bh;
       // each blade's world position seeds the wave, so gusts travel
       vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       float w = sin(uTime * ${WIND_SPEED.toFixed(2)} + ip.x * 0.35 + ip.z * 0.28)
               + 0.5 * sin(uTime * ${(WIND_SPEED * 1.7).toFixed(2)} + ip.x * 0.7 - ip.z * 0.4);
       transformed.x += w * ${WIND_STRENGTH.toFixed(3)} * bend;
       transformed.z += w * ${(WIND_STRENGTH * 0.5).toFixed(3)} * bend;
      `);
  };

  const grass = new THREE.InstancedMesh(blade, mat, GRASS_BLADES);
  grass.receiveShadow = true;      // catches the character's shadow
  grass.castShadow = false;        // 55k shadow casters would be far too slow
  grass.frustumCulled = false;

  // ---- scatter blades across the island top, UNEVENLY.
  // A low-frequency wave over (x,z) makes the field clump into taller and
  // shorter patches, and blades dip slightly into the turf, so it reads as
  // an uneven meadow rather than a flat mown lawn.
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const patch = (x, z) =>                                 // 0..1 smooth height field
    0.5 + 0.5 * Math.sin(x * 0.55 + Math.cos(z * 0.4) * 1.3)
              * Math.cos(z * 0.5 - Math.sin(x * 0.3) * 1.1);
  for (let i = 0; i < GRASS_BLADES; i++) {
    const x = (Math.random() - 0.5) * SIZE;
    const z = (Math.random() - 0.5) * SIZE;
    const p = patch(x, z);                                // this spot's patch height
    dummy.position.set(x, -0.06 + Math.random() * 0.05, z);   // sink into the turf a bit
    dummy.rotation.y = Math.random() * Math.PI * 2;       // random facing
    dummy.rotation.z = (Math.random() - 0.5) * 0.55;      // stronger, varied lean
    dummy.rotation.x = (Math.random() - 0.5) * 0.35;      // tilt too — no uniform stand
    // length: patch clumping + a WIDE independent per-blade spread, plus a
    // few random tall outliers so the canopy is genuinely ragged
    let s = 0.45 + p * 0.8 + Math.random() * 0.9;
    if (Math.random() < 0.06) s += 0.6 + Math.random() * 0.5;   // occasional tall blade
    dummy.scale.set(0.8 + Math.random() * 0.5, s, 1);     // width varies as well
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    // color: each blade gets its own HUE, not just brightness — from dry
    // yellow-green through fresh green to deep blue-green, clumped by patch
    const hue = 0.21 + p * 0.09 + (Math.random() - 0.5) * 0.06;   // ~0.18..0.33
    const sat = 0.45 + Math.random() * 0.3;
    const lit = 0.38 + p * 0.14 + Math.random() * 0.16;
    tint.setHSL(hue, sat, lit);
    grass.setColorAt(i, tint);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  scene.add(grass);

  return {
    update(dt, t) { uniforms.uTime.value = t; },
  };
}

// --- Bushes ----------------------------------------------------
// No bush model, so they're grown from scratch. Two things make or break how
// natural these read:
//   1. SHAPE — a plain icosahedron is instantly recognisable as a geometric
//      ball, and rotating it doesn't hide that. So each blob's vertices are
//      pushed around by a few smooth sine lobes: organic lumps, not balls.
//      (Per-vertex random noise would read as spiky; lobes read as foliage.)
//   2. CLUMP FORM — blobs are packed into a DOME: big and tall in the middle,
//      smaller and lower toward the rim, bases sunk into the turf. A flat ring
//      of same-sized blobs just looks like a pile of balls.
// Four lump variants are pre-baked, one instanced draw call each. Colours come
// from the grass palette, so bushes follow the time-of-day phase for free.
const BUSH_VARIANTS = 4;

function bushBlobGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);   // 42 verts — enough to deform
  const pos = g.attributes.position;
  const v = new THREE.Vector3(), d = new THREE.Vector3();
  const shade = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    d.copy(v).normalize();
    const lump = 1
      + 0.26 * Math.sin(d.x * 3.1 + seed)
      + 0.20 * Math.sin(d.y * 2.7 + seed * 1.7)
      + 0.18 * Math.sin(d.z * 3.4 + seed * 2.3);
    v.multiplyScalar(lump);
    pos.setXYZ(i, v.x, v.y, v.z);
    // bake a soft top-lit gradient into the mesh: undersides sit in shadow
    const s = 0.55 + 0.45 * ((d.y + 1) * 0.5);
    shade.push(s, s, s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  g.computeVertexNormals();
  return g;
}

export function createBushes(scene) {
  // ---- pick clump spots. Rejection sampling keeps them off the spawn point,
  // off the stations (so nothing blocks a prop or its prompt), and spread apart.
  const spots = [];
  for (let tries = 0; tries < 900 && spots.length < BUSH_COUNT; tries++) {
    const x = (Math.random() - 0.5) * (SIZE - 4);
    const z = (Math.random() - 0.5) * (SIZE - 4);
    if (Math.hypot(x, z) < 3.5) continue;                                   // keep spawn clear
    if (STATIONS.some((s) => Math.hypot(x - s.x, z - s.z) < 4.5)) continue; // don't crowd props
    if (spots.some((p) => Math.hypot(x - p.x, z - p.z) < 2.8)) continue;    // spread out
    spots.push({ x, z, blobs: 6 + Math.floor(Math.random() * 5), s: 0.55 + Math.random() * 0.7 });
  }

  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       // sway the top of each blob, anchored at its base
       float bend = clamp((position.y + 1.0) * 0.5, 0.0, 1.0);
       vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       float w = sin(uTime * ${(WIND_SPEED * 0.6).toFixed(2)} + ip.x * 0.3 + ip.z * 0.25);
       transformed.x += w * ${(WIND_STRENGTH * 0.35).toFixed(3)} * bend;
       transformed.z += w * ${(WIND_STRENGTH * 0.18).toFixed(3)} * bend;
      `);
  };

  // build every blob, bucketed by which lump variant it uses
  const buckets = Array.from({ length: BUSH_VARIANTS }, () => []);
  const dummy = new THREE.Object3D(), tint = new THREE.Color(), hsl = {};
  const cBase = new THREE.Color(GRASS_BASE), cTip = new THREE.Color(GRASS_TIP);
  for (const b of spots) {
    for (let i = 0; i < b.blobs; i++) {
      const a = Math.random() * Math.PI * 2;
      const reach = 0.75 * b.s;
      const rad = Math.pow(Math.random(), 0.65) * reach;     // crowd toward the middle
      const fall = 1 - (rad / reach) * 0.5;                  // rim blobs: smaller + lower
      const bs = (0.34 + Math.random() * 0.26) * b.s * fall;
      dummy.position.set(
        b.x + Math.cos(a) * rad,
        bs * 0.45 + fall * 0.34 * b.s - 0.1 * b.s,           // dome, sunk into the turf
        b.z + Math.sin(a) * rad,
      );
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.scale.set(bs * (0.9 + Math.random() * 0.3),
                      bs * (0.7 + Math.random() * 0.35),     // squashed, never spheres
                      bs * (0.9 + Math.random() * 0.3));
      dummy.updateMatrix();
      tint.copy(cBase).lerp(cTip, 0.15 + Math.random() * 0.5);
      tint.getHSL(hsl);
      tint.setHSL(hsl.h + (Math.random() - 0.5) * 0.05,
                  Math.min(1, hsl.s * (0.8 + Math.random() * 0.4)),
                  hsl.l * (0.75 + Math.random() * 0.4));
      buckets[(Math.random() * BUSH_VARIANTS) | 0].push({ m: dummy.matrix.clone(), c: tint.clone() });
    }
  }

  buckets.forEach((list, vi) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(bushBlobGeo(vi * 7.13 + 1.3), mat, list.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    list.forEach((blob, i) => { im.setMatrixAt(i, blob.m); im.setColorAt(i, blob.c); });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    scene.add(im);
  });

  return { update(dt, t) { uniforms.uTime.value = t; } };
}

// --- Rocks -----------------------------------------------------
// Same lump trick as the bushes, but far fewer faces and a harsher squash, so
// they read as faceted boulders rather than foliage. Only a handful, so they're
// plain meshes — instancing would be pointless. Half-buried in the turf, which
// is what stops them looking like balls dropped on a lawn.
const ROCK_TONES = [0x8d887f, 0x7b756c, 0x9a938a, 0x6f6a63];

function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 0);   // 20 faces — chunky on purpose
  const pos = g.attributes.position;
  const v = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    d.copy(v).normalize();
    const lump = 1
      + 0.30 * Math.sin(d.x * 2.3 + seed)
      + 0.24 * Math.sin(d.y * 3.1 + seed * 1.4)
      + 0.20 * Math.sin(d.z * 2.7 + seed * 2.1);
    v.multiplyScalar(lump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createRocks(scene) {
  for (let i = 0, tries = 0; i < ROCK_COUNT && tries < 400; tries++) {
    const x = (Math.random() - 0.5) * (SIZE - 5);
    const z = (Math.random() - 0.5) * (SIZE - 5);
    if (Math.hypot(x, z) < 4) continue;                                     // keep spawn clear
    if (STATIONS.some((s) => Math.hypot(x - s.x, z - s.z) < 5)) continue;   // don't crowd props
    const r = 0.45 + Math.random() * 0.5;
    const rock = new THREE.Mesh(
      rockGeo(i * 5.7 + 2.1),
      new THREE.MeshStandardMaterial({
        color: ROCK_TONES[(Math.random() * ROCK_TONES.length) | 0],
        flatShading: true, roughness: 0.95, metalness: 0,
      }),
    );
    rock.position.set(x, r * 0.42, z);                    // sunk ~half its height
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.scale.set(r * (1 + Math.random() * 0.4), r * (0.6 + Math.random() * 0.25), r * (1 + Math.random() * 0.4));
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
    i++;
  }
  return { update() {} };
}

// --- Stars -----------------------------------------------------
// Only added at night. CRITICAL: the corner camera sits at (12,11,12) looking
// at (0,3.5,0) — a ~24° downward pitch — so with a 50° FOV the top of the
// frame is only ~1° above horizontal (~8° when zoomed right in). Anything
// higher than that is off-screen forever. So the stars live in a BAND hugging
// the horizon, exactly like the sun disc and clouds do. Points are fog:false
// so the haze never eats them.
const STAR_ELEV_MIN = -8;    // degrees — a little below horizontal (sky shows past the island edge)
const STAR_ELEV_MAX = 18;    // degrees — the top of what any zoom level can see
export function createStars(scene) {
  const N = 700;
  const pos = new Float32Array(N * 3);
  const r = 165;                                          // inside the 180 sky dome
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;            // all the way around
    const elev = (STAR_ELEV_MIN + Math.random() * (STAR_ELEV_MAX - STAR_ELEV_MIN)) * Math.PI / 180;
    const h = r * Math.cos(elev);                         // horizontal reach
    pos[i * 3]     = h * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(elev);                  // the band, around the horizon
    pos[i * 3 + 2] = h * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  // soft round dot so points aren't hard squares
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0.0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const mat = new THREE.PointsMaterial({
    map: tex, size: 2.4, sizeAttenuation: true, color: 0xffffff,
    transparent: true, opacity: 0.9, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  });
  const stars = new THREE.Points(geo, mat);
  stars.renderOrder = -1;                      // sits back with the sky dome
  scene.add(stars);

  return {
    update(dt, t) {
      stars.rotation.y += dt * 0.006;                    // very slow wheel overhead
      mat.opacity = 0.68 + 0.25 * Math.sin(t * 1.4);     // gentle collective twinkle
    },
  };
}

// --- Clouds ----------------------------------------------------
// Soft billboards drifting across the sky; they wrap around the island.
export function createClouds(scene) {
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    // a few overlapping soft blobs = one puffy cloud
    const puff = (x, y, r) => {
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.95)');
      grd.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    puff(90, 78, 46); puff(130, 62, 52); puff(172, 80, 44); puff(60, 86, 32);
    return new THREE.CanvasTexture(c);
  })();

  const clouds = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0.75, fog: false }));
    const scale = 14 + Math.random() * 22;
    sp.scale.set(scale * 2, scale, 1);
    // low band near the horizon — that's the part of the sky the corner
    // camera can actually see; they drift in x and wrap around
    sp.position.set(
      (Math.random() - 0.5) * 240,
      14 + Math.random() * 30,
      (Math.random() - 0.5) * 190
    );
    sp.renderOrder = 1;
    scene.add(sp);
    clouds.push({ sp, spd: 0.4 + Math.random() * 0.7 });
  }

  return {
    update(dt) {
      for (const c of clouds) {
        c.sp.position.x += c.spd * dt;
        if (c.sp.position.x > 130) c.sp.position.x = -130;   // wrap around
      }
    },
  };
}

// --- Birds -----------------------------------------------------
// Simple procedural birds: a body + two flapping wings, circling the
// island on lazy orbits. (A Blender bird with a real flap cycle could
// drop straight in here later — see notes in the chat.)
export function createBirds(scene) {
  const bodyGeo = new THREE.ConeGeometry(0.09, 0.62, 6);
  bodyGeo.rotateX(Math.PI / 2);                       // point along +Z
  const wingGeo = new THREE.PlaneGeometry(0.66, 0.2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2b2b33, roughness: 0.8, side: THREE.DoubleSide });

  const birds = [];
  for (let i = 0; i < BIRD_COUNT; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyGeo, mat));

    const wl = new THREE.Mesh(wingGeo, mat);
    wl.position.x = -0.34;
    const wr = new THREE.Mesh(wingGeo, mat);
    wr.position.x = 0.34;
    g.add(wl, wr);
    scene.add(g);

    birds.push({
      g, wl, wr,
      radius: 18 + Math.random() * 40,
      y:      7 + Math.random() * 9,          // low enough for the camera to see
      spd:    0.10 + Math.random() * 0.14,
      flap:   7 + Math.random() * 4,
      angle:  Math.random() * Math.PI * 2,
      dir:    Math.random() < 0.5 ? 1 : -1,   // some circle the other way
    });
  }

  return {
    update(dt, t) {
      for (const b of birds) {
        b.angle += b.spd * dt * b.dir;
        const x = Math.cos(b.angle) * b.radius;
        const z = Math.sin(b.angle) * b.radius;
        // gentle bob so they don't fly on rails
        b.g.position.set(x, b.y + Math.sin(t * 0.6 + b.angle * 2) * 1.4, z);
        // face along the tangent of the circle
        b.g.rotation.y = -b.angle * b.dir + (b.dir > 0 ? 0 : Math.PI);
        // flap
        const f = Math.sin(t * b.flap + b.angle) * 0.6;
        b.wl.rotation.z = f;
        b.wr.rotation.z = -f;
      }
    },
  };
}
