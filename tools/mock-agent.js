#!/usr/bin/env node
// Minimal ACP mock agent for local testing (JSON-RPC over stdio, newline-delimited)
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

function send(msg) {
  const s = JSON.stringify(msg) + "\n";
  try {
    process.stderr.write(`[mock] send ${s}`);
  } catch {}
  process.stdout.write(s);
}

let nextToolId = 0;
function handleRequest(req) {
  const { id, method, params } = req;
  if (id === undefined || id === null) return; // ignore if malformed (allow id=0)
  switch (method) {
    case "initialize": {
      return send({
        jsonrpc: "2.0",
        id,
        result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [] },
      });
    }
    case "session/new": {
      return send({
        jsonrpc: "2.0",
        id,
        result: { sessionId: "dev-session-1" },
      });
    }
    case "session/prompt": {
      const sessionId = params?.sessionId ?? "dev-session-1";
      const text = Array.isArray(params?.prompt)
        ? params.prompt
            .filter((b) => b && b.type === "text")
            .map((b) => b.text)
            .join(" ")
        : "";
      // Stream a simple agent message chunk
      send({
        jsonrpc: "2.0",
        method: "session/update",
        params: {
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: `Echo: ${text}` },
          },
        },
      });
      // Complete the turn
      return send({ jsonrpc: "2.0", id, result: { stopReason: "end_turn" } });
    }
    default: {
      return send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    }
  }
}

rl.on("line", (line) => {
  try {
    process.stderr.write(`[mock] recv ${line.length} bytes\n`);
  } catch {}
  const s = line.trim();
  if (!s) return;
  let msg;
  try {
    msg = JSON.parse(s);
  } catch (e) {
    try {
      process.stderr.write(`[mock] parse error: ${String(e)}\n`);
    } catch {}
    return; // ignore parse errors for simplicity
  }
  if (msg && msg.method && typeof msg.method === "string") {
    // request or notification
    if (Object.prototype.hasOwnProperty.call(msg, "id")) {
      try {
        process.stderr.write(`[mock] request ${msg.method}\n`);
      } catch {}
      handleRequest(msg);
    } else {
      // notification from client; accept cancel etc. silently
    }
  }
});
