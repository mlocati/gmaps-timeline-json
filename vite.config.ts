import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath} from 'url';

// https://vite.dev/config/
export default defineConfig({
  // Use relative paths, so that the built app works whatever the URL it's served from
  // (for example https://mlocati.github.io/gmaps-timeline-json/)
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import'],
        quietDeps: true,
      },
    },
  },
});
