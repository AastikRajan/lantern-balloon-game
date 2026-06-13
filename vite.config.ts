import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths so it runs on itch.io and any subfolder host
  server: { host: true },
  build: { target: 'es2022' },
});
