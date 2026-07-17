// ============================================================
// WEBSITE ENTRY — the traditional React portfolio shell.
//
// The 3D GAME lives self-contained in ./game/ (index.js + showcase.js +
// desk-effects.js + game.css). This site renders the normal page and, on
// demand, LAUNCHES that game as a full-screen overlay by dynamically
// importing it. The game is never rewritten here — the site only calls in.
// ============================================================
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
