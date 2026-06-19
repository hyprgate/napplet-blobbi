import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from '@unocss/vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    UnoCSS(),
    svelte(),
    nip5aManifest({
      nappletType: 'blobbi',
      requires: ['identity', 'relay', 'ifc', 'storage'],
      artifactMode: 'single-file',
    }),
  ],
  resolve: {
    dedupe: ['svelte'],
  },
  server: {
    port: 5191,
    cors: true,
  },
  build: {
    outDir: 'dist',
  },
});
