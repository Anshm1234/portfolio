// ============================================================
// DESK EFFECTS — the live shader animations a .glb can't carry.
//
// The station GLB exports the geometry, materials, and BAKED steam-sway
// keyframes (played by an AnimationMixer). This module recreates the
// effects that can't be baked into a glTF:
//   • rising / dissipating steam   (Steam_* meshes → shader)
//   • monitor fire + flicker       (Monitor_Screen → shader)
//   • leaf flutter                 (Plant*_Foliage → per-frame sway)
//
// IMPORTANT: the steam meshes have NO UVs and the screen's UVs come from a
// messy auto-unwrap, so these shaders are driven by LOCAL POSITION (with a
// per-mesh axis picked by extent) — not by uv. That is the key fix vs. the
// uv-based version, which rendered blank steam.
//
// USAGE (this project): applyDeskEffects(gltf.scene, gltf.animations) after
// load; tick the returned .update(dt, elapsed) every frame. The mixer for
// the baked sway is created INSIDE here, so don't also make one outside.
// ============================================================
import * as THREE from 'three';

// shared cheap value-noise / fbm
const NOISE = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.02; a*=0.5; } return v; }
`;

// pick the mesh's dominant (vertical) and secondary axes from its bounding box,
// so it works no matter how glTF's +Y-up conversion oriented the local space.
function axesByExtent(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const size = new THREE.Vector3(); bb.getSize(size);
  const ranked = [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => b[1] - a[1]);
  const unit = (k) => k === 'x' ? new THREE.Vector3(1,0,0) : k === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
  const minOf = (k) => (k === 'x' ? bb.min.x : k === 'y' ? bb.min.y : bb.min.z);
  const sizeOf = (k) => (k === 'x' ? size.x : k === 'y' ? size.y : size.z);
  return {
    bigVec: unit(ranked[0][0]), bigMin: minOf(ranked[0][0]), bigSpan: sizeOf(ranked[0][0]),
    midVec: unit(ranked[1][0]),
  };
}

// --- Steam: a soft column that scrolls upward and fades as it rises ---
// up   = tallest local axis (the direction the wisp rises)
// side = second axis (used to vary the noise across the ribbon)
function makeSteamMaterial(up, side, upMin, upSpan) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
    uniforms: { uTime:{value:0}, uUp:{value:up}, uSide:{value:side}, uUpMin:{value:upMin}, uUpSpan:{value:upSpan} },
    vertexShader: `
      varying vec3 vPos;
      void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vPos;
      uniform float uTime, uUpMin, uUpSpan;
      uniform vec3 uUp, uSide;
      ${NOISE}
      void main(){
        float cu = dot(vPos, uUp);
        float cs = dot(vPos, uSide);
        float h  = clamp((cu - uUpMin) / max(uUpSpan, 1e-4), 0.0, 1.0);   // 0 at cup, 1 at top
        // scroll the noise upward over time = rising steam
        float n = fbm(vec2(cs * 90.0, h * 7.0 - uTime * 0.9));
        float density = smoothstep(0.32, 0.85, n);
        float top = smoothstep(1.0, 0.25, h);   // dissipate near the top
        float bot = smoothstep(0.0, 0.10, h);    // emerge from the cup
        float a = density * top * bot * 0.55;    // ← steam density/opacity knob
        gl_FragColor = vec4(vec3(0.96, 0.94, 0.90), a);
      }`,
  });
}

// --- Monitor: fire on one side → nebula on the other, licking + flickering ---
// horiz = widest local axis (fire→nebula gradient); vert = second axis (scroll)
function makeScreenMaterial(horiz, vert, hMin, hSpan) {
  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: { uTime:{value:0}, uH:{value:horiz}, uV:{value:vert}, uHMin:{value:hMin}, uHSpan:{value:hSpan} },
    vertexShader: `
      varying vec3 vPos;
      void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vPos;
      uniform float uTime, uHMin, uHSpan;
      uniform vec3 uH, uV;
      ${NOISE}
      void main(){
        float g = clamp((dot(vPos, uH) - uHMin) / max(uHSpan, 1e-4), 0.0, 1.0); // 0 fire → 1 nebula
        float v = dot(vPos, uV);
        vec3 fire = mix(vec3(1.0,0.42,0.08), vec3(0.85,0.11,0.02), smoothstep(0.0,0.45,g));
        vec3 mid  = vec3(0.03,0.02,0.05);
        vec3 neb  = mix(vec3(0.05,0.16,0.70), vec3(0.12,0.34,1.0), g);
        vec3 col  = mix(fire, mid, smoothstep(0.32,0.60,g));
        col = mix(col, neb, smoothstep(0.60,0.92,g));
        // animated flames, stronger on the fire side
        float flame = smoothstep(0.45,0.95, fbm(vec2(g*7.0, v*7.0 - uTime*0.7))) * (1.0 - g);
        col += vec3(1.0,0.45,0.12) * flame * 0.7;
        // sparse stars on the nebula side
        float stars = smoothstep(0.94,1.0, fbm(vec2(g*32.0+5.0, v*32.0))) * smoothstep(0.55,1.0,g);
        col += vec3(0.6,0.75,1.0) * stars;
        float flick = 0.86 + 0.10*sin(uTime*6.3) + 0.05*sin(uTime*15.7);   // ← flicker
        gl_FragColor = vec4(col * flick * 1.5, 1.0);                        // ← screen intensity knob
      }`,
  });
}

// Pass gltf.animations as the 2nd arg so the baked steam-sway actually plays.
export function applyDeskEffects(group, animations = []) {
  const steamMats = [];
  const screenMats = [];
  const leaves = [];
  const effectMeshes = new Set();

  // play the baked steam-sway clip(s)
  let mixer = null;
  if (animations && animations.length) {
    mixer = new THREE.AnimationMixer(group);
    animations.forEach((clip) => {
      const a = mixer.clipAction(clip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.play();
    });
  }

  group.traverse((o) => {
    const n = o.name || '';
    if (o.isMesh && /steam/i.test(n)) {
      const ax = axesByExtent(o.geometry);
      o.material = makeSteamMaterial(ax.bigVec, ax.midVec, ax.bigMin, ax.bigSpan);
      o.castShadow = false; o.receiveShadow = false; o.renderOrder = 10;
      steamMats.push(o.material); effectMeshes.add(o);
    } else if (o.isMesh && /screen/i.test(n)) {
      const ax = axesByExtent(o.geometry);
      o.material = makeScreenMaterial(ax.bigVec, ax.midVec, ax.bigMin, ax.bigSpan);
      o.castShadow = false;
      screenMats.push(o.material); effectMeshes.add(o);
    } else if (/foliage|leaf|leaves/i.test(n) &&
               !(o.parent && /foliage|leaf|leaves/i.test(o.parent.name || ''))) {
      // rotate the top foliage node (glTF may split a multi-material mesh into a group)
      o.userData.baseRotX = o.rotation.x;
      o.userData.baseRotZ = o.rotation.z;
      o.userData.swayPhase = Math.random() * Math.PI * 2;
      leaves.push(o);
    }
  });

  console.log('[desk-effects] matched — steam:', steamMats.length,
    '| screen:', screenMats.length, '| leaves:', leaves.length);

  let acc = 0;
  return {
    mixer, effectMeshes, steamMats, screenMats, leaves,
    // call every frame: update(delta, elapsed). elapsed is optional.
    update(dt, t) {
      dt = dt || 0.016;
      acc += dt;
      const time = (t !== undefined) ? t : acc;
      if (mixer) mixer.update(dt);
      for (const m of steamMats) m.uniforms.uTime.value = time;
      for (const m of screenMats) m.uniforms.uTime.value = time;
      for (const lf of leaves) {
        lf.rotation.x = lf.userData.baseRotX + Math.sin(time * 0.8 + lf.userData.swayPhase) * 0.04;
        lf.rotation.z = lf.userData.baseRotZ + Math.cos(time * 0.9 + lf.userData.swayPhase) * 0.04;
      }
    },
  };
}
