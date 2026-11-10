import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `npm run dev` serves the UI only. API calls are proxied to `wrangler pages dev`
// (run `npm run preview` in another terminal) so the server functions run locally too.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8788' },
  },
});
