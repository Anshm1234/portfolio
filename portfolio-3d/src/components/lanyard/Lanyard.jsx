/* eslint-disable react/no-unknown-property */
// ============================================================
// LANYARD — the ID-badge swinging on a strap.
// Adapted from React Bits' Lanyard (reactbits.dev, by David Haz, MIT).
//
// Physics: a lightweight VERLET rope (a handful of point masses linked by
// distance constraints) solved in useFrame — NO WebAssembly. This replaces
// the original @react-three/rapier implementation, whose Rapier WASM was
// ~944 KB gzipped (base64-inlined into the bundle). Verlet gives the same
// hang-and-swing feel in ~60 lines and a fraction of the bytes.
//
// Local changes from the original:
//   • JSX (types stripped), assets served from /public/lanyard/
//   • the strap texture is GENERATED — a wood-deep band with cream edge
//     stitching and the site's name woven in, to match the warm theme
//   • `frontImage` composites onto the card's front UV atlas (photo card)
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

const CARD_GLB = '/lanyard/card.glb';
useGLTF.preload(CARD_GLB);

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas, the back face to the RIGHT half (measured from card.glb).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT  = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ---- the strap, drawn to match the website: wood-deep band, cream edge
//      stitching, the name woven in like a real conference lanyard ----
const makeStrap = () => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4f28';                       // --wood-deep
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(0,0,0,.14)';               // subtle weave shading
  for (let x = -64; x < 256; x += 16) {
    g.beginPath();
    g.moveTo(x, 64); g.lineTo(x + 32, 0); g.lineTo(x + 40, 0); g.lineTo(x + 8, 64);
    g.fill();
  }
  g.fillStyle = '#dfd8cd';                       // --cream edge stitching
  g.fillRect(0, 3, 256, 3); g.fillRect(0, 58, 256, 3);
  g.font = '700 26px Inter, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#dfd8cd';
  g.fillText('A N S H', 128, 34);
  return c.toDataURL('image/png');
};
let strapURL = null;
const getStrapURL = () => (strapURL ??= makeStrap());

export default function Lanyard({
  // camera sits much closer than the reactbits default (z=30) so the badge
  // reads BIG in a compact column (the column is only as tall as the intro
  // text beside it, so there's no dead space); the strap's anchor (y=4) still
  // sits just above the frame's top edge, so the rope hangs in from offscreen
  position = [0, 0, 15],
  gravity = [0, -40, 0],
  fov = 20,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardWidth = 1,
}) {
  const [isMobile, setIsMobile] = useState(() => innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(innerWidth < 768);
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <ambientLight intensity={Math.PI} />
        <Band
          isMobile={isMobile}
          gravity={gravity}
          frontImage={frontImage}
          backImage={backImage}
          imageFit={imageFit}
          lanyardWidth={lanyardWidth}
        />
        {/* soft studio light strips so the card's clearcoat catches highlights */}
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

// world-space anchor the strap hangs from (just above the visible top edge)
const ANCHOR = new THREE.Vector3(0, 4, 0);
const SEG = 1;          // rest length between rope nodes
const NODES = 4;        // node 0 = fixed anchor … node 3 = card attach point
const ITER = 16;        // constraint relaxation passes per frame

function Band({ isMobile = false, gravity, frontImage, backImage, imageFit, lanyardWidth }) {
  const band = useRef(null);
  const cardGroup = useRef(null);          // the swinging card (pivots at its top)
  const { camera, pointer } = useThree();

  const { nodes, materials } = useGLTF(CARD_GLB);
  const strap = useTexture(getStrapURL());
  // useTexture must be called unconditionally — blank pixel when no image
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  // Composite the photo/name face into the card's baked atlas (front = left
  // half, back = right half), aspect-preserving.
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;
    if (!frontImage && !backImage) return baseMap;
    const baseImg = baseMap.image;
    const W = baseImg.width, H = baseImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    ctx.drawImage(baseImg, 0, 0, W, H);   // keep the baked edges

    const drawFitted = (img, rect) => {
      const rx = rect.x * W, ry = rect.y * H, rw = rect.w * W, rh = rect.h * H;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
      ctx.drawImage(img, rx + (rw - dw) / 2, ry + (rh - dh) / 2, dw, dh);
      ctx.restore();
    };
    if (frontImage && frontTex.image) drawFitted(frontTex.image, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);

  // ---- the verlet rope: node positions + their previous positions ----
  const rope = useMemo(() => {
    const pos = [], prev = [];
    for (let i = 0; i < NODES; i++) {
      const p = new THREE.Vector3(0, ANCHOR.y - i * SEG, 0);
      pos.push(p); prev.push(p.clone());
    }
    return { pos, prev };
  }, []);

  const [curve] = useState(() => new THREE.CatmullRomCurve3(
    [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  curve.curveType = 'chordal';

  const drag = useRef(null);               // Vector3 grab-offset while dragging
  const [dragging, setDragging] = useState(false);
  const [hovered, hover] = useState(false);
  const spin = useRef(0);                  // card y-rotation (settles facing front)
  const spinVel = useRef(0);

  // gravity as a world vector (scaled — verlet reaches the same hang, this
  // just sets how briskly it swings)
  const G = useMemo(
    () => new THREE.Vector3(gravity[0], gravity[1], gravity[2]).multiplyScalar(0.9),
    [gravity],
  );

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragging ? 'grabbing' : 'grab';
      return () => { document.body.style.cursor = 'auto'; };
    }
  }, [hovered, dragging]);

  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 60);
    const { pos, prev } = rope;

    // integrate free nodes (skip the fixed anchor at index 0)
    for (let i = 1; i < NODES; i++) {
      const p = pos[i], pr = prev[i];
      tmp.copy(p);
      p.addScaledVector(tmp.clone().sub(pr), 0.94);   // inertia w/ damping
      p.addScaledVector(G, dt * dt);                  // gravity
      pr.copy(tmp);
    }

    // where the card is being dragged to (a point on the camera-facing plane)
    let target = null;
    if (drag.current) {
      tmp.set(pointer.x, pointer.y, 0.5).unproject(camera);
      dir.copy(tmp).sub(camera.position).normalize();
      tmp.copy(camera.position).addScaledVector(dir, camera.position.length());
      target = tmp.clone().sub(drag.current);
    }

    // satisfy the distance constraints (and the pinned endpoints)
    for (let k = 0; k < ITER; k++) {
      pos[0].copy(ANCHOR);
      if (target) pos[NODES - 1].copy(target);
      for (let i = 0; i < NODES - 1; i++) {
        const a = pos[i], b = pos[i + 1];
        dir.copy(b).sub(a);
        const d = dir.length() || 1e-5;
        const f = (d - SEG) / d;                        // how far off rest length
        const pinA = i === 0;
        const pinB = i + 1 === NODES - 1 && target;
        if (pinA && pinB) continue;
        if (pinA) b.addScaledVector(dir, -f);
        else if (pinB) a.addScaledVector(dir, f);
        else { a.addScaledVector(dir, f * 0.5); b.addScaledVector(dir, -f * 0.5); }
      }
    }

    // draw the strap through the smoothed rope (anchor → card)
    curve.points[0].copy(pos[NODES - 1]);
    curve.points[1].copy(pos[2]);
    curve.points[2].copy(pos[1]);
    curve.points[3].copy(pos[0]);
    band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));

    // pose the card: pivot at the last node, tilt with the strap's end
    // direction, and a damped y-spin that keeps settling to face the viewer
    const end = pos[NODES - 1], above = pos[NODES - 2];
    cardGroup.current.position.copy(end);
    dir.copy(end).sub(above);                           // points down the strap
    const zRot = Math.atan2(dir.x, -dir.y);
    const xRot = Math.atan2(dir.z, Math.hypot(dir.x, -dir.y));
    const hVel = end.x - prev[NODES - 1].x;             // horizontal swing speed
    spinVel.current += -spin.current * 0.10 + hVel * 0.5;
    spinVel.current *= 0.86;
    spin.current += spinVel.current;
    cardGroup.current.rotation.set(xRot * 0.5, spin.current, zRot);
  });

  strap.wrapS = strap.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group ref={cardGroup}>
        {/* the pivot (cardGroup) sits at the strap's clip; the card body hangs
            below it. The extra ~1.45 drop replaces Rapier's spherical-joint
            offset so the strap attaches at the CLIP, not through the card. */}
        <group
          scale={2.25}
          position={[0, -2.65, -0.05]}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
          onPointerUp={(e) => { e.target.releasePointerCapture(e.pointerId); drag.current = null; setDragging(false); }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.target.setPointerCapture(e.pointerId);
            drag.current = new THREE.Vector3().copy(e.point).sub(cardGroup.current.position);
            setDragging(true);
          }}
        >
          <mesh geometry={nodes.card.geometry}>
            <meshPhysicalMaterial
              map={cardMap}
              map-anisotropy={16}
              clearcoat={isMobile ? 0 : 1}
              clearcoatRoughness={0.15}
              roughness={0.9}
              metalness={0.8}
            />
          </mesh>
          <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
          <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
        </group>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={strap}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}
