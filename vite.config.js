import { defineConfig } from 'vite';

// base './' makes the built app work from any sub-path,
// including GitHub Pages project sites (https://user.github.io/mountain-defense/)
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
