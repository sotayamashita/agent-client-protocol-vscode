#!/usr/bin/env node
// Minimal ACP-to-Claude bridge agent (stdio JSON-RPC)
// - Speaks ACP to the editor on stdio
// - Runs `claude -p --output-format json <prompt>` per turn
// - Streams a single agent_message_chunk with the final text, then end_turn

const { spawn } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');

function log(...a){ try { process.stderr.write(a.join(' ') + "\n"); } catch {}
}

// Parse args
const argv = process.argv.slice(2);
let CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';
let DEFAULT_MODEL = process.env.CLAUDE_MODEL || '';
for (const a of argv) {
  if (a.startsWith('--claude-path=')) CLAUDE_PATH = a.slice('--claude-path='.length);
  else if (a.startsWith('--model=')) DEFAULT_MODEL = a.slice('--model='.length);
}

function send(msg){ const s = JSON.stringify(msg) + "\n"; try { log('[bridge/send]', s.trim()); } catch{} process.stdout.write(s); }

let sessionId = undefined;
let sessionCwd = process.cwd();
let running = null; // { proc, killed }

function toTextPrompt(blocks){
  if (!Array.isArray(blocks)) return '';
  return blocks.filter(b => b && b.type === 'text').map(b => b.text || '').join('\n');
}

function reply(id, result){ send({ jsonrpc:'2.0', id, result }); }
function replyErr(id, code, message){ send({ jsonrpc:'2.0', id, error:{ code, message } }); }

async function onRequest({ id, method, params }){
  log('[bridge/req]', method);
  try {
    switch(method){
      case 'initialize': {
        return reply(id, { protocolVersion: 1, agentCapabilities: {}, authMethods: [] });
      }
      case 'session/new': {
        sessionId = 'acp-' + Math.random().toString(36).slice(2);
        sessionCwd = params?.cwd && path.isAbsolute(params.cwd) ? params.cwd : process.cwd();
        return reply(id, { sessionId, modes: null });
      }
      case 'session/prompt': {
        if (!sessionId) return replyErr(id, -32000, 'no session');
        const text = toTextPrompt(params?.prompt);
        const args = ['-p', '--output-format', 'json'];
        if (DEFAULT_MODEL) args.push('--model', DEFAULT_MODEL);
        args.push(text);
        log('[bridge/spawn]', CLAUDE_PATH, args.join(' '), 'cwd=', sessionCwd);
        const proc = spawn(CLAUDE_PATH, args, { cwd: sessionCwd, stdio:['ignore','pipe','pipe'], env:{ ...process.env } });
        running = { proc, killed:false };

        let outBuf = '';
        proc.stdout.on('data', (b)=>{ outBuf += b.toString('utf8'); });
        proc.stderr.on('data', (b)=>{ log('[claude/stderr]', b.toString('utf8').trim()); });
        proc.on('exit', (code, signal) => {
          log('[claude/exit]', code, signal||'');
          running = null;
          // Try to parse a single JSON object from outBuf
          let textOut = outBuf.trim();
          try {
            const j = JSON.parse(textOut);
            // Heuristic: j.text or j.response or j.output
            textOut = j.text || j.response || j.output || textOut;
          } catch{}
          // Stream one message chunk
          send({ jsonrpc:'2.0', method:'session/update', params:{
            sessionId,
            update:{ sessionUpdate:'agent_message_chunk', content:{ type:'text', text: String(textOut) } }
          }});
          // Finish
          reply(id, { stopReason:'end_turn' });
        });
        return;
      }
      default:
        if (method === 'session/cancel') {
          if (running?.proc && !running.killed) {
            try { running.proc.kill('SIGTERM'); running.killed = true; } catch{}
          }
          // Cancel is a notification in ACP, but handle defensively
          return reply(id, null);
        }
        return replyErr(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    log('[bridge/error]', String(e));
    return replyErr(id, -32603, 'internal error');
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line)=>{
  const s = line.trim();
  if (!s) return;
  try {
    const msg = JSON.parse(s);
    if (msg && typeof msg.method === 'string' && Object.prototype.hasOwnProperty.call(msg,'id')) {
      onRequest(msg);
    }
    // ignore notifications from client for this minimal bridge
  } catch (e) {
    log('[bridge/parse-error]', String(e));
  }
});

