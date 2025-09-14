import { spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";
import { Readable, Writable } from "node:stream";
import * as vscode from "vscode";
import { ClientSideConnection } from "@zed-industries/agent-client-protocol/typescript/acp.js";

let output: vscode.OutputChannel;
let child: ChildProcess | undefined;
let connection: any | undefined; // ClientSideConnection instance
let currentSessionId: string | undefined;

interface PermissionItem extends vscode.QuickPickItem {
  optionId: string;
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function ensureTrusted(): boolean {
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage(
      "Workspace is not trusted. ACP connection is disabled.",
    );
    return false;
  }
  return true;
}

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

class VSCodeClient /* implements Client */ {
  constructor(private chan: vscode.OutputChannel) {}

  async requestPermission(params: any): Promise<any> {
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
    this.chan.appendLine(`[session/update] ${JSON.stringify(params)}`);
  }

  async writeTextFile(params: any): Promise<any> {
    const uri = assertAbsInsideWorkspace(params.path);
    const data = Buffer.from(String(params.content ?? ""), "utf8");
    await vscode.workspace.fs.writeFile(uri, data);
    return null;
  }

  async readTextFile(params: any): Promise<any> {
    const uri = assertAbsInsideWorkspace(params.path);
    const content = await vscode.workspace.fs.readFile(uri);
    return { content: Buffer.from(content).toString("utf8") };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
  proc.once("spawn", () => {
    output.appendLine(`[agent] spawned pid=${proc.pid ?? "n/a"}`);
  });
  proc.stderr?.on("data", (buf: Buffer) => {
    const s = buf.toString("utf8");
    for (const line of s.split(/\r?\n/)) {
      if (line.trim().length) output.appendLine(`[agent/stderr] ${line}`);
    }
  });
  proc.stdout?.on("data", (buf: Buffer) => {
    const s = buf.toString("utf8");
    for (const line of s.split(/\r?\n/)) {
      if (line.trim().length) output.appendLine(`[agent/stdout] ${line}`);
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
    await withTimeout(connection.initialize(initialize), 10000, "initialize");
  } catch (e) {
    output.appendLine(`[rpc] initialize error: ${String(e)}`);
    output.appendLine(
      '[hint] エージェントが ACP/stdio を話していない可能性があります。acp.agentArgs に "--stdio" 等が必要か確認してください。',
    );
    await disconnectAgent(false);
    vscode.window.showErrorMessage(
      "ACP: initialize がタイムアウト/失敗しました。Output を確認してください。",
    );
    return;
  }

  const cwd = getWorkspaceRoot() ?? process.cwd();
  const newSession = { mcpServers, cwd };
  output.appendLine(`[rpc] newSession cwd=${cwd}`);
  let newSessionRes: any;
  try {
    newSessionRes = await withTimeout(
      connection.newSession(newSession),
      10000,
      "newSession",
    );
  } catch (e) {
    output.appendLine(`[rpc] newSession error: ${String(e)}`);
    await disconnectAgent(false);
    vscode.window.showErrorMessage(
      "ACP: newSession がタイムアウト/失敗しました。Output を確認してください。",
    );
    return;
  }
  currentSessionId = newSessionRes?.sessionId ?? currentSessionId;
  output.appendLine(
    `[rpc] newSession ok sessionId=${currentSessionId ?? "n/a"}`,
  );

  vscode.window.showInformationMessage("ACP: Connected");
}

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
    if (
      e &&
      typeof e === "object" &&
      (e.code === -32000 || e.code === "AuthenticationRequired")
    ) {
      output.appendLine("[rpc] authenticate (stub)");
      try {
        await connection.authenticate?.({ methodId: "default" });
      } catch (authErr) {
        output.appendLine(`[rpc] authenticate error: ${String(authErr)}`);
      }
    }
  }
}

async function cancelPrompt(): Promise<void> {
  if (!connection || !currentSessionId) return;
  output.appendLine("[rpc] cancel");
  try {
    await connection.cancel({ sessionId: currentSessionId });
  } catch (err) {
    output.appendLine(`[rpc] cancel error: ${String(err)}`);
  }
}

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
        prompt: "Enter agent args (JSON array or space-separated)",
        value: current.length ? JSON.stringify(current) : "",
      });
      if (!input) return;
      let args: string[] = [];
      try {
        const parsed = JSON.parse(input);
        if (
          Array.isArray(parsed) &&
          parsed.every((a) => typeof a === "string")
        ) {
          args = parsed as string[];
        } else {
          throw new Error("not array");
        }
      } catch {
        // fallback: naive split by whitespace
        args =
          input.match(/\".*?\"|\S+/g)?.map((s) => s.replaceAll('"', "")) ?? [];
      }
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

export function deactivate() {
  if (child && !child.killed) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  child = undefined;
}
