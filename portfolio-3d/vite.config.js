import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Only group the vendors that first paint ACTUALLY needs — rolldown
        // hoists every *manually grouped* vendor chunk into the entry HTML's
        // <link rel="modulepreload"> list. Grouping `three` (758KB) and
        // `physics` (2.4MB) here made the browser eagerly fetch 3.1MB of JS on
        // first paint, even though both are only reached via dynamic import.
        //   • react-vendor / gsap — used by the entry (Hero) → correct to preload
        //   • three / physics — NOT grouped, so rolldown emits them as async
        //     chunks that load on demand (game launch / lanyard scroll-in) and
        //     never touch first paint. three is shared by both the game and the
        //     lanyard, so rolldown keeps it in its own shared async chunk —
        //     the game no longer risks pulling in the rapier physics blob.
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
