import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the static build can be hosted from any sub-path (e.g. gh-pages).
export default defineConfig({
  base: './',
  plugins: [react()],
});
