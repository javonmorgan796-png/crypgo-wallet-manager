import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname, 'src'), // <--- FRONTEND ROOT
  base: './', // important for deploy
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    outDir: path.resolve(__dirname, 'backend/dist'), // <--- output for backend
    emptyOutDir: true,
  },
  plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
