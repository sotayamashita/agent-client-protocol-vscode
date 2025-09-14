# Repository Guidelines

## Project Structure & Module Organization

- `src/` – VS Code extension sources (`extension.ts`).
- `tools/` – Local agents for E2E checks: `mock-agent.js`, `claude-acp-agent.js` (both ESM).
- `.vscode/` – Debug and task configs (`Run Extension` launches an Extension Host).
- `out/` – Build output (generated). Do not edit.
- `node_modules/@zed-industries/agent-client-protocol/typescript/` – ACP library sources; build step generates `acp.js` and `schema.js` here for runtime import.
- Docs: `01-spec.md`, `02-task.md`, `memo.md`.

## Build, Test, and Development Commands

- `pnpm install` – Install dependencies.
- `pnpm build` – Transpile ACP TS → ESM JS, then compile extension.
- `pnpm watch` – TypeScript watch build.
- Run locally: VS Code → Run and Debug → `Run Extension`.
- Minimal E2E: set `ACP: Set Agent Path` to `tools/mock-agent.js`, run `ACP: Connect Agent` → `ACP: Send Prompt`.

## Coding Style & Naming Conventions

- ESM project: `type: module`, `module: NodeNext`. Use `import` (CommonJS files must be `.cjs`).
- TypeScript strict; 2‑space indentation; avoid default exports; PascalCase classes, camelCase vars/functions; kebab‑case scripts.
- Prettier config: `prettier.config.mjs` with organize‑imports and packagejson plugins.

## Testing Guidelines

- No formal test runner configured yet. Validate via mock/bridge agents and the `ACP` Output channel.
- When adding tests, keep filenames descriptive and colocate near the code or under `tests/` (proposed). Document how to run them.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` with optional scope, e.g. `docs(readme): …`, `chore(esm): …`.
- PRs should include: purpose, changes, testing steps (mock/bridge), screenshots/log snippets if UI/Output changes, and linked issues.

## Security & Configuration Tips

- Workspace Trust is required; file operations are restricted to absolute paths inside the opened workspace.
- Be explicit with `acp.agentPath` and `acp.agentArgs`. Review external binaries you launch.
- The ACP lib is imported from `@zed-industries/agent-client-protocol/typescript/acp.js`. If upstream ships `dist/`, simplify imports and drop the build helper.
