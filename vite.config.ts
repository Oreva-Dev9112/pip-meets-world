import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Two pages: the game at / and the prototype sketch at /prototype/.
export default defineConfig({
  // Relative paths, so the build works from any folder it is served from.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: at('./index.html'),
        prototype: at('./prototype/index.html'),
      },
    },
  },
});
