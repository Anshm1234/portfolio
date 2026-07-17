// ============================================================
// POST — postprocessing. Renders the scene through an EffectComposer
// and lays an animated FILM GRAIN over the whole frame for a filmic,
// textured look (replaces the old "just fade with fog" feel).
//
// Uses three's built-in addons — no new dependency. index.js calls
// post.render() instead of renderer.render(), and post.setSize() on resize.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// grain strength — raise for heavier grain, lower for subtle
const GRAIN_AMOUNT = 0.075;

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uAmount:  { value: GRAIN_AMOUNT },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAmount;
    varying vec2 vUv;
    // hash noise that changes every frame via uTime
    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      // luminance-aware: grain reads a touch stronger in midtones
      col.rgb += g * uAmount;
      gl_FragColor = col;
    }`,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const grain = new ShaderPass(GrainShader);
  composer.addPass(grain);   // last pass draws to screen

  return {
    render(t) {
      grain.uniforms.uTime.value = t;
      composer.render();
    },
    setSize(w, h) { composer.setSize(w, h); },
  };
}
