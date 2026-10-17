#!/usr/bin/env node
// Native Codex runtime probe, no real model: a deterministic loopback Responses
// fixture requests exactly one harmless shell write, then returns a fixed answer.
// All configuration, trust override and writes are confined to an isolated home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codex = process.env.CODEX_BIN || 'codex';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hook-kit-native-'));
const home = path.join(scratch, 'home');
fs.mkdirSync(home);
execFileSync(process.execPath, [path.join(root, 'install.mjs'), '--config-dir', home], { windowsHide: true });
const trace = path.join(scratch, 'hook-events.jsonl');
const wrapper = path.join(scratch, 'trace-hook.mjs');
fs.writeFileSync(wrapper, `import fs from 'node:fs'; import {spawnSync} from 'node:child_process'; const input=fs.readFileSync(0,'utf8'); const r=spawnSync(process.execPath,[${JSON.stringify(path.join(home, 'codex-hook-kit', 'hooks', 'read-ledger-gate.mjs'))},'--codex'],{input,encoding:'utf8',windowsHide:true}); fs.appendFileSync(${JSON.stringify(trace)},JSON.stringify({input:JSON.parse(input),code:r.status,stdout:r.stdout,stderr:r.stderr})+'\\n'); process.stdout.write(r.stdout||''); process.stderr.write(r.stderr||''); process.exit(r.status??1);`);
const registered = JSON.parse(fs.readFileSync(path.join(home, 'hooks.json'), 'utf8'));
if (process.argv.includes('--completion')) registered.hooks.Stop = [{ hooks: [{ type: 'command', command: 'node "' + path.join(home, 'codex-hook-kit', 'hooks', 'completion-gate.mjs').replaceAll('\\', '/') + '" --codex', timeout: 65 }] }];
for (const group of registered.hooks.PreToolUse) for (const hook of group.hooks) {
  if (hook.command.includes('read-ledger-gate.mjs')) hook.command = 'node "' + wrapper.replaceAll('\\', '/') + '"';
}
fs.writeFileSync(path.join(home, 'hooks.json'), JSON.stringify(registered));
const version = execFileSync(codex, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
const results = [];
const completion = process.argv.includes('--completion');
let active;
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!req.url.includes('/responses')) { res.writeHead(404); res.end(); return; }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    active.requests++;
    active.inputs.push(body.input);
    let output;
    if ((!completion && active.requests === 1) || (completion && active.requests === 2 && active.admitted)) {
      const name = 'exec_command';
      const tool = body.tools?.find(t => t.name === name);
      active.toolDefinition = tool;
      if (!tool) throw new Error('Expected tool ' + name + '; got ' + JSON.stringify(body.tools));
      output = { type: 'function_call', id: 'tool_1', call_id: 'call_1', name, arguments: JSON.stringify({ cmd: completion ? 'echo working > product.txt' : 'echo marker > marker.ts', workdir: active.project, max_output_tokens: 200 }), status: 'completed' };
    } else {
      output = { type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Fixture complete.', annotations: [] }] };
    }
    const response = { id: 'resp_' + active.requests, object: 'response', status: 'completed', model: 'fixture', output: [output], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } };
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const send = event => res.write('data: ' + JSON.stringify(event) + '\n\n');
    send({ type: 'response.created', response: { ...response, status: 'in_progress', output: [] } });
    send({ type: 'response.output_item.added', output_index: 0, item: output });
    if (output.type === 'message') send({ type: 'response.output_text.delta', item_id: output.id, output_index: 0, content_index: 0, delta: 'Fixture complete.' });
    send({ type: 'response.output_item.done', output_index: 0, item: output });
    send({ type: 'response.completed', response });
    res.end();
  } catch (error) {
    if (active) active.serverError = error.message;
    res.writeHead(500); res.end(error.message);
  }
});

const run = (args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(codex, args, { cwd, windowsHide: true, env: { ...process.env, CODEX_HOME: home, OPENAI_API_KEY: '', CODEX_API_KEY: '', RUST_LOG: 'error' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', b => { stdout += b; });
  child.stderr.on('data', b => { stderr += b; });
  child.on('error', reject);
  const timer = setTimeout(() => child.kill(), 30000);
  child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr, pid: child.pid }); });
});

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  for (const kind of ['shell']) {
    for (const admitted of [false, true]) {
      const project = path.join(scratch, kind + '-' + admitted);
      fs.mkdirSync(path.join(project, '.codex'), { recursive: true });
      fs.writeFileSync(path.join(project, '.codex', 'hook-kit.json'), JSON.stringify(completion ? {
        'completion-gate': { taskId: 'native-probe', inputs: ['product.txt', 'accept.mjs'], check: { command: process.execPath, args: ['accept.mjs'] } }
      } : { 'read-ledger-gate': { upstreamRoots: ['.'] } }));
      if (completion) {
        fs.writeFileSync(path.join(project, 'product.txt'), 'broken');
        fs.writeFileSync(path.join(project, 'accept.mjs'), `import fs from 'node:fs'; fs.appendFileSync('checks.txt','check\\n'); process.exit(fs.readFileSync('product.txt','utf8').trim()==='working'?0:1);`);
      }
      fs.writeFileSync(path.join(project, 'upstream.ts'), 'export const upstream = true;\n');
      if (admitted) fs.writeFileSync(path.join(project, '.codex', 'READ-LEDGER.md'), '- upstream.ts - 1 lines\n');
      active = { kind, project, admitted, requests: 0, inputs: [] };
      const args = ['--no-daemon', '-a', 'never', '--dangerously-bypass-hook-trust', 'exec', '--skip-git-repo-check', '--ephemeral', '--json', '-C', project, '-s', 'danger-full-access', '-m', 'fixture',
        '-c', 'model_provider="fixture"', '-c', 'model_providers.fixture.name="Local deterministic hook test"',
        '-c', 'model_providers.fixture.base_url="http://127.0.0.1:' + server.address().port + '/v1"',
        '-c', 'model_providers.fixture.wire_api="responses"', '-c', 'model_providers.fixture.requires_openai_auth=false',
        '-c', 'features.code_mode=false', '-c', 'features.code_mode_only=false', 'Run the single fixture tool call.'];
      const result = await run(args, project);
      if (completion) {
        const continued = JSON.stringify(active.inputs).includes('completion-gate');
        const repaired = fs.readFileSync(path.join(project, 'product.txt'), 'utf8').trim() === 'working';
        const checks = fs.existsSync(path.join(project, 'checks.txt')) ? fs.readFileSync(path.join(project, 'checks.txt'), 'utf8').trim().split('\n').length : 0;
        if (!continued || result.code !== 0) console.error(JSON.stringify({ result, inputs: active.inputs, serverError: active.serverError }));
        assert.equal(result.code, 0);
        assert.ok(continued, 'Real Codex must continue after failed acceptance');
        assert.equal(repaired, admitted);
        assert.equal(checks, admitted ? 2 : 1, 'Check corrected input once; cache an unchanged failure through bounded continuations');
        assert.equal(active.requests, 3, 'No extra review or unbounded continuation');
        results.push({ kind: 'completion', repaired, continued, checks, modelRequests: active.requests, pid: result.pid, processExited: true });
        console.log(JSON.stringify(results.at(-1)));
        continue;
      }
      const markerExists = fs.existsSync(path.join(project, 'marker.ts'));
      const blockObserved = JSON.stringify(active.inputs).includes('read-ledger-gate');
      if (result.code !== 0 || markerExists !== admitted || (!admitted && !blockObserved)) console.error(JSON.stringify({ result, toolDefinition: active.toolDefinition, inputs: active.inputs.slice(1).map(items => items?.filter(item => item.type?.includes('output'))), events: fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8') : 'NO HOOK EVENTS', serverError: active.serverError }, null, 2));
      assert.equal(result.code, 0, active.serverError || result.stderr || result.stdout);
      assert.equal(active.serverError, undefined, 'Fixture protocol must succeed');
      assert.ok(active.requests >= 2, 'Fixture must observe the tool result');
      assert.equal(markerExists, admitted, kind + ': marker side effect');
      if (!admitted) assert.ok(blockObserved, 'Denial must name read-ledger-gate, not an unrelated failure');
      results.push({ kind, ledgerValid: admitted, markerExists, blockObserved, exitCode: result.code, pid: result.pid, processExited: true });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  const receipt = { checkedAt: new Date().toISOString(), runtime: version, model: 'deterministic loopback fixture; no provider call', desktopUIVerified: false, nativePatchVerified: false, hookOutput: completion ? 'Stop JSON block continues; continue:false ends at the shared task limit' : 'JSON deny with exit 0; exit 2 alone did not block in this build', results };
  const arg = process.argv.indexOf('--receipt');
  if (arg >= 0 && process.argv[arg + 1]) fs.writeFileSync(path.resolve(process.argv[arg + 1]), JSON.stringify(receipt, null, 2) + '\n');
} finally {
  await new Promise(resolve => server.close(resolve));
  // Only the mkdtemp-created fixture directory is removed.
  fs.rmSync(scratch, { recursive: true, force: true });
}
