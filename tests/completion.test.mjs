import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { evaluate } from '../lib/completion.mjs';
import { mkTemp, rimraf, writeText, writeJson, runHook, HOOKS } from './helpers.mjs';

function fixture(t) {
  const root = mkTemp('completion-');
  t.after(() => rimraf(root));
  writeText(path.join(root, 'product.txt'), 'working');
  writeText(path.join(root, 'accept.mjs'), `import fs from 'node:fs'; fs.appendFileSync('runs.txt','run\\n'); process.exit(fs.readFileSync('product.txt','utf8')==='working'?0:1);`);
  return { root, s: { taskId: 'one-authorized-task', inputs: ['product.txt', 'accept.mjs'], check: { command: process.execPath, args: ['accept.mjs'] } } };
}

test('completion executes acceptance; unchanged content reuses result; changed product fails despite fresh fake receipt', t => {
  const { root, s } = fixture(t);
  assert.deepEqual(evaluate(root, s), { pass: true, cached: false });
  assert.deepEqual(evaluate(root, s), { pass: true, cached: true });
  assert.equal(fs.readFileSync(path.join(root, 'runs.txt'), 'utf8'), 'run\n');
  writeText(path.join(root, 'product.txt'), 'broken');
  writeJson(path.join(root, 'receipt.json'), { status: 'PASS' });
  assert.match(evaluate(root, s).reason, /exit 1/);
  writeText(path.join(root, 'product.txt'), 'working');
  assert.equal(evaluate(root, s).pass, true);
});

test('reuse rejects accurate read ledger without destination code, wrong hash and changed upstream; accepts copied region', t => {
  const { root, s } = fixture(t);
  const region = 'export function sum(a, b) { return a + b; }';
  writeText(path.join(root, 'upstream.mjs'), region + '\n');
  writeText(path.join(root, 'adapter.mjs'), 'export const unrelated = true;');
  writeText(path.join(root, 'READ-LEDGER.md'), '- upstream.mjs - 1 lines');
  s.reuse = [{ source: 'upstream.mjs', destination: 'adapter.mjs', startLine: 1, endLine: 1, sha256: createHash('sha256').update(region).digest('hex') }];
  assert.match(evaluate(root, s).reason, /absent from destination/);
  writeText(path.join(root, 'adapter.mjs'), region + '\n// glue goes here');
  assert.equal(evaluate(root, s).pass, true);
  writeText(path.join(root, 'upstream.mjs'), region + ' // changed');
  assert.match(evaluate(root, s).reason, /Upstream region changed/);
});

test('three failures stop across new hook processes and session IDs; continuation cannot reset task budget', async t => {
  const { root, s } = fixture(t);
  writeText(path.join(root, 'product.txt'), 'broken');
  writeJson(path.join(root, '.codex', 'hook-kit.json'), { 'completion-gate': s });
  for (let n = 1; n <= 4; n++) {
    const r = await runHook(path.join(HOOKS, 'completion-gate.mjs'), { cwd: root, hook_event_name: 'Stop', session_id: 'session-' + n, stop_hook_active: n > 1 }, { args: ['--codex'] });
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    if (n < 3) assert.equal(out.decision, 'block');
    else assert.equal(out.continue, false);
  }
  assert.equal(fs.readFileSync(path.join(root, 'runs.txt'), 'utf8').trim().split('\n').length, 1, 'Do not rerun the same failing input for reassurance');
});

test('timeout and changing inputs during acceptance cannot pass', t => {
  const { root, s } = fixture(t);
  writeText(path.join(root, 'accept.mjs'), 'setTimeout(()=>{},10000)');
  s.check.timeoutMs = 100;
  assert.match(evaluate(root, s).reason, /ETIMEDOUT/);
  writeText(path.join(root, 'accept.mjs'), `import fs from 'node:fs'; fs.writeFileSync('product.txt','modified');`);
  s.check.timeoutMs = 1000;
  assert.match(evaluate(root, s).reason, /Inputs changed/);
});
