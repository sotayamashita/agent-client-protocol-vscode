import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  outDir: 'out',
  splitting: false, // produce a single file for VS Code main
  sourcemap: true,
  clean: true,
  treeshake: true,
  dts: false,
  // VS Code provides this at runtime; do not bundle
  external: ['vscode'],
  // Bundle the ACP library from TS sources in node_modules
  noExternal: ['@zed-industries/agent-client-protocol'],
});

