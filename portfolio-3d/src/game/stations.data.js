// ============================================================
// STATIONS — the interactive spots on the platform.
//
// TO ADD A STATION: append one object here. The loader in index.js
// handles the rest (auto-fit, floor halo, approach glow, scale pop).
//
//   id      unique key ('projects' opens the PC showcase; others open the panel)
//   name    shown in the "E — <name>" prompt and the panel title
//   color   accent for the floor halo + panel title
//   x, z    position on the platform
//   y       optional manual height nudge (auto-fit already stands it on the ground)
//   model   optional .glb in public/models/ — omit for a placeholder pillar
//   fit     model height in world units (character is 2.6)
//   rotY    facing, in radians
//   effects true only for props with steam/fire/leaf parts (the desk)
//   animate true to play the GLB's baked clips (the tree's falling leaves)
//   ignore  regex of mesh names that must NOT define the footprint — see the
//           tree: its loose leaf cards sit below the trunk and would otherwise
//           become the "bottom" of the model and float it off the ground
//   body    panel copy
//   link    optional [label, url] button
// ============================================================

export const STATIONS = [
  {
    id: 'projects', name: 'PROJECTS', color: 0x35e0a8, x: -6, z: -6,
    model: '/models/projects-desk.glb', fit: 5.5, effects: true, rotY: Math.PI / 2,
    body: '• Career Ops — AI job discovery & matching\n   FastAPI · Next.js · Supabase · Gemini\n• Deepfake Detection — two-stream attention model',
    link: ['Open GitHub ↗', 'https://github.com/Anshm1234'],
  },
  {
    id: 'about', name: 'ABOUT ME', color: 0xffc93c, x: 9, z: -9,
    model: '/models/about_me.glb', fit: 4, rotY: -3 * Math.PI *4,   // face the corner camera
    body: 'Final-year CS @ Thapar · CGPA 9.16\nGeneral Secretary, ACM Student Chapter',
  },
  {
    id: 'contact', name: 'CONTACT', color: 0xc4392f, x: -2, z: 10,
    model: '/models/contact-letterbox.glb', fit: 5, rotY: (Math.PI/2)-0.3,
    body: 'Email — you@swap-this.dev\nGitHub — Anshm1234',
    link: ['GitHub ↗', 'https://github.com/Anshm1234'],
  },
  {
    // The corner camera looks from (+x,+z) toward the middle, so screen-right
    // is the (+x,-z) corner — that's this one. Platform edge is at ±17.5.
    id: 'tree', name: 'THE TREE', color: 0xe08a3c, x: 16.5, z: -15.5,
    model: '/models/autumn_tree_scene.glb', fit: 15, rotY: Math.PI,
    animate: true,        // 44 baked falling-leaf clips
    ignore: /^FLeaf/i,    // loose leaves must not define the ground (they float it)
    body: 'TODO — what should this station say?',
  },
];
