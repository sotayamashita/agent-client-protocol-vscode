# ACP VS Code Extension (Scaffold)

- Desktop-only: uses `child_process` to launch the agent.
- Configure `acp.agentPath` and optional `acp.agentArgs` in Settings.
- Commands:
  - `ACP: Connect Agent`
  - `ACP: Send Prompt`
  - `ACP: Cancel Prompt`

Build and run:
- Install deps with pnpm (see below), then `pnpm run build`.
- Press F5 (Run Extension) to launch an Extension Development Host.

Dependency install (pnpm):
- `pnpm add @zed-industries/agent-client-protocol`
- `pnpm add -D typescript @types/node @types/vscode`
  - Note: the `vscode` npm package is deprecated in favor of `@types/vscode` and `vscode-test`.

Notes:
- Absolute paths only for FS operations; access is limited to the current workspace.
- Workspace Trust must be enabled to connect and write files.
