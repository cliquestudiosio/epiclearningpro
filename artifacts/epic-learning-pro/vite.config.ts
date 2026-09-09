import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Production deploy target is fixed: Cloudflare Workers at
// portfolio.cliquestudios.io/epiclearningpro. Default BASE_PATH to that so a
// `vite build` works out of the box — Cloudflare's dashboard "Runtime
// variables" don't reach this build step (they populate the deployed
// Worker's `env`, not `process.env` during CI), so relying on that env var
// alone left builds broken. It can still be overridden if ever needed.
const basePath = process.env.BASE_PATH || '/epiclearningpro/';

export default defineConfig(({ command }) => {
  // PORT is only meaningful for `vite dev`/`vite preview`, which actually
  // start a server. A production `vite build` never touches it, so it
  // shouldn't be able to fail the build.
  let port: number | undefined;
  if (command !== 'build') {
    const rawPort = process.env.PORT;
    if (!rawPort) {
      throw new Error(
        'PORT environment variable is required but was not provided.',
      );
    }
    port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
