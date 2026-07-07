import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lantern-balloon-game/', // GitHub Pages project site
  server: { host: true },
  build: { target: 'es2022' },
});
