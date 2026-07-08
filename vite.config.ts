import { defineConfig } from 'vite';

/** GitHub Pages project site: https://k8rvin.github.io/midtownworker/ */
const pagesBase = '/midtownworker/';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? pagesBase : './',
  server: { port: 5173, open: true },
  build: { outDir: 'dist', assetsDir: 'assets' },
});