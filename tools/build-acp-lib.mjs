#!/usr/bin/env node
// Quick-and-dirty TypeScript transpile for ACP library (no typecheck)
// Transpiles only the needed files to ESM JS into the package's typescript folder.

import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pkgTsDir = path.resolve(__dirname, '..', 'node_modules', '@zed-industries', 'agent-client-protocol', 'typescript');

const files = ['schema.ts', 'acp.ts'];

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  sourceMap: false,
  esModuleInterop: true,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.Preserve,
};

async function transpile(inFile) {
  const inPath = path.join(pkgTsDir, inFile);
  const src = await fs.readFile(inPath, 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions,
    fileName: inPath,
    reportDiagnostics: false,
  });
  const outPath = inPath.replace(/\.ts$/, '.js');
  await fs.writeFile(outPath, outputText, 'utf8');
  return outPath;
}

const main = async () => {
  for (const f of files) {
    const out = await transpile(f);
    console.log('built', path.relative(process.cwd(), out));
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

