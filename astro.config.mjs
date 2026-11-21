import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static site: pages are prerendered to dist/ and served by the Cloudflare Worker
// in worker/index.ts, which also handles /api/*.
export default defineConfig({
  site: 'https://palmreadings.ai',
  output: 'static',
  trailingSlash: 'always',
  // Keep the whitespace between text and inline tags; compression was eating the space before links.
  compressHTML: false,
  build: { format: 'directory' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    server: { proxy: { '/api': 'http://localhost:8787' } },
  },
});
