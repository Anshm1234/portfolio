import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Only group the vendors that first paint ACTUALLY needs — rolldown
        // hoists every *manually grouped* vendor chunk into the entry HTML's
        // <link rel="modulepreload"> list. Grouping `three` (758KB) here made
        // the browser eagerly fetch it on first paint, even though it's only
        // reached via dynamic import.
        //   • react-vendor / gsap — used by the entry (Hero) → correct to preload
        //   • three — NOT grouped, so rolldown emits it as an async chunk that
        //     loads on demand (game launch / lanyard scroll-in) and never
        //     touches first paint. It's shared by both the game and the
        //     lanyard, so rolldown keeps it in its own shared async chunk.
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'gsap', test: /node_modules[\\/]gsap[\\/]/ },
          ],
        },
      },
    },
  },
});
