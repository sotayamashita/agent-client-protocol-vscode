/**
 * ACP VS Code extension entry: minimal client that connects to an
 * ACP-compliant agent over stdio via ClientSideConnection. The implementation
 * favors simplicity over features: small logs, no retries/timeouts, and
 * workspace-scoped file access.
 */
import { spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";
import { Readable, Writable } from "node:stream";
import * as vscode from "vscode";
// Bundle the ACP TS source directly via tsup/esbuild.
import { ClientSideConnection } from "@zed-industries/agent-client-protocol/typescript/acp.ts";

/** Shared output channel for human-readable logs. */
let output: vscode.OutputChannel;
/** Child process running the ACP agent (spawned on connect). */
let child: ChildProcess | undefined;
/**
 * Active JSON-RPC connection to the agent.
 * Note: This is a ClientSideConnection instance; typed as `any` to
 * avoid importing library types into the extension surface.
 */
let connection: any | undefined;
/** Session identifier returned by `session/new` (if connected). */
let currentSessionId: string | undefined;

/** QuickPick item carrying the underlying ACP permission `optionId`. */
interface PermissionItem extends vscode.QuickPickItem {
  optionId: string;
}

/**
 * Returns the filesystem path of the first workspace folder, if present.
 * Used as the CWD for ACP sessions and as an access boundary for FS methods.
 */
function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Guards actions that require a trusted workspace (spawn, file writes).
 * Shows a one-time warning and returns false if the workspace is untrusted.
 */
function ensureTrusted(): boolean {
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage(
      "Workspace is not trusted. ACP connection is disabled.",
    );
    return false;
  }
  return true;
}

/**
 * Validates that `absPath` is absolute and within the workspace root directory.
 * ACP requires absolute paths and this extension restricts access to the
 * opened workspace for safety.
 * @param absPath Absolute filesystem path provided by the agent.
 * @returns VS Code `Uri` pointing at the validated path.
 * @throws Error if the path is not absolute or outside the workspace.
 */
function assertAbsInsideWorkspace(absPath: string): vscode.Uri {
  if (!path.isAbsolute(absPath)) {
    throw new Error("Absolute paths are required by ACP.");
  }
  const ws = getWorkspaceRoot();
  if (!ws) {
    throw new Error("Open a workspace folder to enable file operations.");
  }
  const normWs = path.resolve(ws);
  const normFile = path.resolve(absPath);
  const isInside =
    normFile === normWs || normFile.startsWith(normWs + path.sep);
  if (!isInside) {
    throw new Error("Access outside of workspace is not allowed.");
  }
  return vscode.Uri.file(normFile);
}

/**
 * Minimal ACP Client implementation bridged to VS Code UI and FS APIs.
 * The agent invokes these methods via JSON-RPC.
 */
class VSCodeClient /* implements Client */ {
  constructor(private chan: vscode.OutputChannel) {}

  async requestPermission(params: any): Promise<any> {
    /**
     * Presents a single-choice permission dialog using QuickPick.
     * @param params Object with `options: { optionId, name, description }[]`.
     * @returns `{ outcome: { outcome: 'selected'|'cancelled', optionId? } }`.
     */
    const items: PermissionItem[] = (params?.options ?? []).map((opt: any) => ({
      label: opt.name ?? opt.optionId,
      description: opt.description,
      optionId: opt.optionId,
    }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: "Grant permission?",
    });
    return picked
      ? { outcome: { outcome: "selected", optionId: picked.optionId } }
      : { outcome: { outcome: "cancelled" } };
  }

  async sessionUpdate(params: any): Promise<void> {
    /** Logs session/update notifications for visibility. */
    this.chan.appendLine(`[session/update] ${JSON.stringify(params)}`);
  }

  async writeTextFile(params: any): Promise<any> {
    /**
     * Writes UTF-8 text to the given absolute path inside the workspace.
     * @param params Object with `path` (absolute) and `content` (string).
     * @returns `null` per ACP WriteTextFileResponse.
     */
    const uri = assertAbsInsideWorkspace(params.path);
    const data = Buffer.from(String(params.content ?? ""), "utf8");
    await vscode.workspace.fs.writeFile(uri, data);
    return null;
  }

  async readTextFile(params: any): Promise<any> {
    /**
     * Reads UTF-8 text from the given absolute path inside the workspace.
     * @param params Object with `path` (absolute).
     * @returns `{ content: string }` per ACP ReadTextFileResponse.
     */
    const uri = assertAbsInsideWorkspace(params.path);
    const content = await vscode.workspace.fs.readFile(uri);
    return { content: Buffer.from(content).toString("utf8") };
  }
}

/**
 * Spawns the configured agent executable and establishes a JSON-RPC
 * connection over stdio, then performs `initialize` and `newSession`.
 * Stores the returned `sessionId` for subsequent calls.
 */
async function connectAgent(): Promise<void> {
  // Always bring Output to front for visibility
  output.show(true);
  output.appendLine("[connect] start");
  if (!ensureTrusted()) return;

  const cfg = vscode.workspace.getConfiguration("acp");
  const agentPath = cfg.get<string>("agentPath");
  const agentArgs = cfg.get<string[]>("agentArgs") ?? [];
  const mcpServers = cfg.get<any[]>("mcpServers") ?? [];

  if (!agentPath) {
    const msg = 'Set "acp.agentPath" to the agent executable.';
    output.appendLine(`[connect] ${msg}`);
    vscode.window.showErrorMessage(msg);
    return;
  }

  if (child && currentSessionId) {
    output.appendLine("[connect] already connected; skip");
    vscode.window.showInformationMessage("ACP: Already connected.");
    return;
  }

  if (child && !currentSessionId) {
    output.appendLine(
      "[connect] Detected running agent without session. Resetting...",
    );
    await disconnectAgent(false);
  }

  output.appendLine(`[spawn] ${agentPath} ${agentArgs.join(" ")}`);
  const proc = spawn(agentPath, agentArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });
  child = proc;
  proc.stderr?.on("data", (buf: Buffer) => {
    const s = buf.toString("utf8");
    for (const line of s.split(/\r?\n/)) {
      if (line.trim().length) output.appendLine(`[agent/stderr] ${line}`);
    }
  });

  proc.on("exit", (code, signal) => {
    output.appendLine(`[agent] exit code=${code} signal=${signal ?? ""}`);
    child = undefined;
  });
  proc.on("error", (err) => {
    output.appendLine(`[agent] error: ${String(err)}`);
  });

  const toAgent = Writable.toWeb(proc.stdin!) as unknown as WritableStream<Uint8Array>;
  const fromAgent = Readable.toWeb(proc.stdout!) as unknown as ReadableStream<Uint8Array>;

  // The constructor signature follows the spec: (toClient, input, output)
  connection = new ClientSideConnection(
    () => new VSCodeClient(output),
    toAgent,
    fromAgent,
  );

  const initialize = {
    protocolVersion: 1,
    clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
  };
  output.appendLine("[rpc] initialize");
  try {
    await connection.initialize(initialize);
  } catch (e) {
    output.appendLine(`[rpc] initialize error: ${String(e)}`);
    await disconnectAgent(false);
    vscode.window.showErrorMessage(
      "ACP: initialize failed. Check the Output panel.",
    );
    return;
  }

  const cwd = getWorkspaceRoot() ?? process.cwd();
  const newSession = { mcpServers, cwd };
  output.appendLine(`[rpc] newSession cwd=${cwd}`);
  let newSessionRes: any;
  try {
    newSessionRes = await connection.newSession(newSession);
  } catch (e) {
    output.appendLine(`[rpc] newSession error: ${String(e)}`);
    await disconnectAgent(false);
    vscode.window.showErrorMessage(
      "ACP: newSession failed. Check the Output panel.",
    );
    return;
  }
  currentSessionId = newSessionRes?.sessionId ?? currentSessionId;
  output.appendLine(
    `[rpc] newSession ok sessionId=${currentSessionId ?? "n/a"}`,
  );

  vscode.window.showInformationMessage("ACP: Connected");
}

/**
 * Prompts the user for a text input and sends it to the agent via
 * `session/prompt`, then logs the final response.
 */
async function sendPrompt(): Promise<void> {
  if (!connection || !currentSessionId) {
    vscode.window.showWarningMessage(
      'ACP: Not connected. Run "ACP: Connect Agent" first.',
    );
    return;
  }
  const prompt = await vscode.window.showInputBox({
    prompt: "Send prompt to agent",
  });
  if (!prompt) return;
  output.appendLine(`[rpc] prompt: ${prompt}`);
  try {
    const res = await connection.prompt({
      sessionId: currentSessionId,
      prompt: [{ type: "text", text: prompt }],
    });
    output.appendLine(`[rpc] prompt result: ${JSON.stringify(res)}`);
  } catch (err) {
    const e = err as any;
    output.appendLine(`[rpc] prompt error: ${e?.message ?? String(e)}`);
  }
}

/** Sends a `session/cancel` notification for the current session, if any. */
async function cancelPrompt(): Promise<void> {
  if (!connection || !currentSessionId) return;
  output.appendLine("[rpc] cancel");
  try {
    await connection.cancel({ sessionId: currentSessionId });
  } catch (err) {
    output.appendLine(`[rpc] cancel error: ${String(err)}`);
  }
}

/**
 * Tears down the active connection and attempts to stop the child process.
 * @param showMsg When true, shows a user-facing notification.
 */
async function disconnectAgent(showMsg = true): Promise<void> {
  try {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  } catch {}
  connection = undefined;
  currentSessionId = undefined;
  child = undefined;
  if (showMsg) vscode.window.showInformationMessage("ACP: Disconnected");
}

/**
 * VS Code activation entry point. Creates the Output channel and registers
 * all extension commands used to drive the ACP connection.
 */
export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("ACP");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("acp.connect", connectAgent),
    vscode.commands.registerCommand("acp.prompt", sendPrompt),
    vscode.commands.registerCommand("acp.cancel", cancelPrompt),
    vscode.commands.registerCommand("acp.disconnect", () =>
      disconnectAgent(true),
    ),
    vscode.commands.registerCommand("acp.reconnect", async () => {
      await disconnectAgent(false);
      await connectAgent();
    }),
    vscode.commands.registerCommand("acp.setAgentArgs", async () => {
      const current =
        vscode.workspace.getConfiguration("acp").get<string[]>("agentArgs") ??
        [];
      const input = await vscode.window.showInputBox({
        prompt: "Enter agent args as JSON array (e.g. [\"--flag\",\"value\"])",
        value: current.length ? JSON.stringify(current) : "[]",
        validateInput: (val) => {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) && parsed.every((a) => typeof a === "string")
              ? null
              : "Must be a JSON array of strings";
          } catch {
            return "Invalid JSON";
          }
        },
      });
      if (!input) return;
      const parsed = JSON.parse(input) as string[];
      const args = parsed;
      await vscode.workspace
        .getConfiguration("acp")
        .update("agentArgs", args, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `ACP: agentArgs set to ${JSON.stringify(args)}`,
      );
    }),
    vscode.commands.registerCommand("acp.showConfig", async () => {
      const cfg = vscode.workspace.getConfiguration("acp");
      const agentPath = cfg.get<string>("agentPath");
      const agentArgs = cfg.get<string[]>("agentArgs") ?? [];
      const mcpServers = cfg.get<any[]>("mcpServers") ?? [];
      output.show(true);
      output.appendLine(`[config] agentPath=${agentPath ?? "<unset>"}`);
      output.appendLine(`[config] agentArgs=${JSON.stringify(agentArgs)}`);
      output.appendLine(`[config] mcpServers=${JSON.stringify(mcpServers)}`);
    }),
    vscode.commands.registerCommand("acp.setAgentPath", async () => {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Select Agent Executable",
      });
      if (!picked?.length) return;
      const fsPath = picked[0].fsPath;
      await vscode.workspace
        .getConfiguration("acp")
        .update("agentPath", fsPath, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`ACP: agentPath set to ${fsPath}`);
    }),
  );

  context.subscriptions.push({
    dispose: () => {
      if (child && !child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {}
      }
      child = undefined;
    },
  });
}

/** VS Code deactivation hook: best-effort termination of the child process. */
export function deactivate() {
  if (child && !child.killed) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  child = undefined;
}
