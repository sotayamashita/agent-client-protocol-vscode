# Development Notes (Vertical Slice Implementation and Connectivity Verification)

**Overview**
- Purpose: Establish a minimal vertical slice of an ACP‑compatible VS Code extension as quickly as possible and verify connectivity with Claude Code (CLI).
- Result: Using the mock (`tools/mock-agent.js`) and the bridge (`tools/claude-acp-agent.js`), confirmed round‑trips for initialize → newSession → prompt. Because the Claude CLI does not speak ACP directly, we operate via the bridge.

**Key Implementations**
- Extension scaffold
  - `package.json` (`main: ./out/src/extension.js`, `engines:^1.88.0`, `contributes.configuration`, `capabilities.untrustedWorkspaces`, command registrations)
  - `tsconfig.json` (`target: ES2023`, `lib: [ES2023, DOM]`, `rootDir: .`)
  - `.vscode/launch.json` / `.vscode/tasks.json` / `.gitignore` / `README.md`
- Commands
  - Core: `acp.connect` / `acp.prompt` / `acp.cancel`
  - Ops: `acp.setAgentPath` / `acp.setAgentArgs` / `acp.showConfig` / `acp.disconnect` / `acp.reconnect`
- Connection and process management
  - Use `child_process.spawn(stdio: ['pipe','pipe','pipe'])`, `Readable.toWeb` / `Writable.toWeb`
  - Stage logs to the Output channel (`[connect]`, `[spawn]`, `[agent] spawned`, `[rpc] ...`)
  - Wire child stderr/stdout as `[agent/stderr]` / `[agent/stdout]` for visibility
  - Apply timeouts around `initialize` / `newSession` (10s in early iterations; now handled natively with errors)
  - Ensure process termination on `deactivate`/`dispose`; add `disconnect`/`reconnect`
- FS/Permission (Client implementation)
  - `readTextFile` / `writeTextFile` (UTF‑8)
  - Enforce absolute paths and block access outside the workspace
  - Minimal `requestPermission` via Quick Pick (`PermissionItem { optionId }`)
- ACP library usage
  - Use official `@zed-industries/agent-client-protocol` (extension is ESM)
  - Bundle TypeScript sources with tsup (esbuild, target node20) using `noExternal`
  - Import at runtime from `@zed-industries/agent-client-protocol/typescript/acp.ts`

**Bridge / Mock**
- `tools/mock-agent.js`
  - Minimal ACP agent. Initially dropped `id===0`; fixed with `if (id === undefined || id === null)`.
  - Echo line protocol by logging I/O to stderr.
- `tools/claude-acp-agent.js`
  - Accepts ACP requests; internally runs `claude -p --output-format json <prompt>`.
  - Relays a single `agent_message_chunk` and returns `stopReason: end_turn`.
  - Supports `--claude-path=` and optional `--model=` arguments.

**Configuration and Operations**
- If settings UI is not visible, check the Extension Development Host window (F5 opens a separate window).
- Update `acp.agentPath` / `acp.agentArgs` via commands (file picker + JSON array input is safest).
- Dump current values with "ACP: Show Config".
- Workspace Trust is required (connection is blocked when untrusted).
- CWD tracks the opened workspace root (falls back to `/` only when none is open).

**Debugging History (Highlights)**
- Initial initialize timeouts occurred because the agent did not speak ACP over stdio.
- Introduced the mock to validate wiring; fixed `id=0` handling to complete round‑trips.
- Since the Claude CLI does not speak ACP, inserted the bridge (`claude-acp-agent.js`) to provide stdio JSON‑RPC.
- Common misconfiguration: pointing `agentPath` at the Claude binary and passing the bridge as an arg (wrong). Correct: set `agentPath` to the bridge, and pass `--claude-path=...` as an arg.

**Known Pitfalls**
- Space‑separating `agentArgs` can break paths; input as a JSON array instead.
- Ensure the `main` path in the manifest matches the bundled output (`out/src/extension.js`).
- pnpm store inconsistencies → resolve with `pnpm install` or `pnpm config set store-dir ...`.
- TypeScript: prefer `ChildProcess` over `ChildProcessWithoutNullStreams` to avoid type mismatches and access safely.

**Commit History (Summary)**
- feat(acp-vscode): Vertical slice implementation for the VS Code extension
  - Scaffold, connection, commands, vendor, mock/bridge.
- chore(prettier): Introduce Prettier and format repo‑wide (no functional changes).

**Next Refactoring Directions (Proposal)**
- Separate concerns
  - `processManager.ts` (spawn/kill/streams/logging)
  - `acpClient.ts` (wrap `ClientSideConnection`; initialize/newSession/prompt/cancel)
  - `vscodeUi.ts` (Output/Quick Pick/error dialogs)
  - `configService.ts` (read/update/validate settings)
- Unify logging policy (levels; toggle JSON/text)
- Improve `session/update` rendering (messages/tools/plan)
- Strengthen the bridge
  - Consider `--output-format stream-json` for streaming relay
  - Map models/settings and improve error handling
- Vendor strategy
  - Replace with upstream dist once available, or use a submodule
- Testing
  - E2E using the mock agent (initialize → newSession → prompt)
  - Isolate hard‑to‑unit‑test VS Code codepaths and test functions directly

**Steps (Recap)**
- Connect via the Claude bridge
  - "ACP: Set Agent Path" → `tools/claude-acp-agent.js`
  - "ACP: Set Agent Args" → `["--claude-path=/Users/.../claude","--model=sonnet"]` (optional)
  - "ACP: Reconnect Agent" → "ACP: Send Prompt"
- Verify wiring with the mock
  - "ACP: Set Agent Path" → `tools/mock-agent.js`
  - "ACP: Reconnect Agent" → "ACP: Send Prompt"

---
This memo summarizes the current state and serves as a reference for the next phase of refactoring (separating responsibilities, adding streaming, tightening logging, etc.).
