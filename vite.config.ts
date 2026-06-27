import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// The Anthropic API key lives only on the server (see server/claudeServer.ts)
// and is never injected into the client bundle.
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: false,
  },
});
