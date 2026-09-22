import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// API keys (Gemini / Anthropic) live only on the server (see server/llm.ts)
// and is never injected into the client bundle.
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: false,
  },
});
