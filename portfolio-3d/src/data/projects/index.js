// ============================================================
// PROJECT REGISTRY — the order here is the order they appear.
//
// TO ADD A PROJECT:
//   1. Copy any file in this folder (e.g. career-ops.js) to a new name.
//   2. Edit its fields (title, description, shots, demo, repo, accent).
//   3. Import it below and add it to the PROJECTS array.
// That's it — the 3D showcase picks it up automatically.
// ============================================================
import careerOps from './career-ops.js';
import deepfake from './deepfake-detection.js';
import portfolio3d from './portfolio-3d.js';

export const PROJECTS = [
  careerOps,
  deepfake,
  portfolio3d,
];
