import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'out',
  // Produce a single file for VS Code main
  splitting: false, 
  sourcemap: true,
  clean: true,
  treeshake: true,
  dts: false,
  // VS Code provides this at runtime; do not bundle
  external: ['vscode'],
  // Bundle the ACP library from TS sources in node_modules
  // Use a RegExp; tsdown only treats exact string matches as noExternal.
  noExternal: [/^@zed-industries\/agent-client-protocol(\/|$)/],
});
