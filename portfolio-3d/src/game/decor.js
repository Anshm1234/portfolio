// ============================================================
// DECOR — orbiting planets + starfield, and the golden foot sparkles
// that trail the character.
//
// Each piece is a small factory: pass in the scene, get back an object
// with update(dt, t) that index.js ticks every frame. Nothing here
// knows about the player, physics, or game state.
// ============================================================
import * as THREE from 'three';
import { SPARK_N } from './config.js';

// --- Planets + starfield ---------------------------------------
// Colorful spheres drifting on tilted orbits high above the platform.
// Edit `defs` to add/remove/retune a planet.
export function createPlanets(scene) {
  const planets = [];
  // Low + far out: the corner camera only sees a band just above the
  // horizon, so the planets orbit there — drifting along the skyline.
  const defs = [
    // color, radius, orbit radius, height, speed (rad/s), tilt, has ring?
    { c: 0xff7b54, r: 2.4, orbit: 70,  y: 12, spd: 0.10,  tilt: 0.10,  ring: false },
    { c: 0x4fc3f7, r: 1.6, orbit: 85,  y: 18, spd: 0.07,  tilt: -0.12, ring: true  },
    { c: 0xba68c8, r: 3.2, orbit: 100, y: 15, spd: 0.05,  tilt: 0.08,  ring: false },
    { c: 0xffd166, r: 1.2, orbit: 62,  y: 20, spd: 0.14,  tilt: 0.15,  ring: false },
    { c: 0x81c784, r: 2.0, orbit: 110, y: 10, spd: 0.045, tilt: -0.06, ring: true  },
    { c: 0xf06292, r: 1.4, orbit: 78,  y: 22, spd: 0.09,  tilt: 0.12,  ring: false },
  ];
  for (const d of defs) {
    // a pivot carries the tilt of the orbit; the planet sits out at orbitR
    const pivot = new THREE.Group();
    pivot.rotation.x = d.tilt;
    scene.add(pivot);

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(d.r, 32, 24),
      new THREE.MeshStandardMaterial({
        color: d.c, emissive: d.c, emissiveIntensity: 0.35,
        roughness: 0.8, metalness: 0.1, fog: false })   // sky objects skip fog
    );
    pivot.add(planet);

    if (d.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(d.r * 1.4, d.r * 2.1, 48),
        new THREE.MeshBasicMaterial({ color: d.c, transparent: true,
          opacity: 0.35, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2 - 0.35;   // tip the ring so it reads as a disc
      planet.add(ring);
    }
    planets.push({ pivot, planet, ...d, angle: Math.random() * Math.PI * 2 });
  }

  // faint star field — a shell of points far out so the sky isn't empty
  const STAR_N = 600;
  const starPos = new Float32Array(STAR_N * 3);
  for (let s = 0; s < STAR_N; s++) {
    // random point on a large sphere, biased to the upper hemisphere
    const u = Math.random(), v = Math.random() * 0.5 + 0.15;
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
    const R = 120;
    starPos[s * 3]     = R * Math.sin(ph) * Math.cos(th);
    starPos[s * 3 + 1] = Math.abs(R * Math.cos(ph)) + 8;   // keep them overhead
    starPos[s * 3 + 2] = R * Math.sin(ph) * Math.sin(th);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xbcd0ff, size: 0.6, sizeAttenuation: true,
    transparent: true, opacity: 0.8, depthWrite: false }));
  stars.frustumCulled = false;
  scene.add(stars);

  return {
    update(dt) {
      for (const p of planets) {
        p.angle += p.spd * dt;
        p.planet.position.set(Math.cos(p.angle) * p.orbit, p.y, Math.sin(p.angle) * p.orbit);
        p.planet.rotation.y += 0.2 * dt;   // gentle self-rotation
      }
    },
  };
}

// --- Golden foot sparkles --------------------------------------
// A fixed pool of additive points, recycled — no per-frame allocation.
// index.js calls emit(x, z, n) as the character walks.
export function createSparkles(scene) {
  const pos   = new Float32Array(SPARK_N * 3);
  const vel   = new Float32Array(SPARK_N * 3);
  const life  = new Float32Array(SPARK_N);   // seconds remaining, 0 = dead
  const alpha = new Float32Array(SPARK_N);   // per-point opacity
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));

  // tiny round soft dot as the sprite, drawn as an additive glowing speck
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,240,190,1)');
    grd.addColorStop(0.4, 'rgba(255,205,90,0.8)');
    grd.addColorStop(1, 'rgba(255,190,60,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const mat = new THREE.PointsMaterial({
    size: 0.35, map: tex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: false });
  // fade each point by its own alpha via a small shader patch
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float alpha;\nvarying float vA;\n' +
      sh.vertexShader.replace('void main() {', 'void main() {\n  vA = alpha;');
    sh.fragmentShader = 'varying float vA;\n' +
      sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vA );');
  };

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0, dist = 0, prevX = 0, prevZ = 0;

  // spawn `count` sparkles at (x,z) on the floor with a little upward pop
  function emit(x, z, count) {
    for (let k = 0; k < count; k++) {
      const i = cursor;
      cursor = (cursor + 1) % SPARK_N;
      pos[i * 3]     = x + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = 0.05 + Math.random() * 0.1;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
      vel[i * 3]     = (Math.random() - 0.5) * 0.8;
      vel[i * 3 + 1] = 1.2 + Math.random() * 1.4;   // pop up
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      life[i] = 0.5 + Math.random() * 0.4;
    }
  }

  return {
    emit,
    // `walking` gates emission: only trail sparks while on the ground
    update(dt, t, player, walking) {
      if (walking) {
        dist += Math.hypot(player.position.x - prevX, player.position.z - prevZ);
        if (dist > 0.45) { dist = 0; emit(player.position.x, player.position.z, 5); }
      }
      prevX = player.position.x; prevZ = player.position.z;
      for (let k = 0; k < SPARK_N; k++) {
        if (life[k] <= 0) { alpha[k] = 0; continue; }
        life[k] -= dt;
        vel[k * 3 + 1] -= 4.5 * dt;                 // gravity
        pos[k * 3]     += vel[k * 3] * dt;
        pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
        pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
        alpha[k] = Math.max(0, Math.min(1, life[k] * 2));   // fade at end of life
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
    },
  };
}
