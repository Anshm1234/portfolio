import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Split stable vendor code into named chunks:
        //  • caching — visitors re-download only what changed (our code
        //    changes never invalidate the react/gsap chunks)
        //  • parallelism — the browser fetches these alongside the entry
        //    instead of one fat file
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'gsap', test: /node_modules[\\/]gsap[\\/]/ },
            // three MUST be its own chunk: it's shared by the game AND the
            // Lanyard — without this group it gets swallowed into `physics`,
            // and launching the game would download 3MB of rapier for nothing
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            // the rapier physics engine (inlined WASM) is the huge one —
            // keep it separate from drei/meshline so the Lanyard's pieces
            // download in parallel when About scrolls near
            { name: 'physics', test: /node_modules[\\/](@dimforge|@react-three[\\/]rapier)[\\/]/ },
          ],
        },
      },
    },
  },
});
