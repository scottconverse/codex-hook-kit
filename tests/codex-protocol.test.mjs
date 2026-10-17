import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HOOKS, ROOT, makeProject, rimraf, runHook, writeText, writeJson, mkTemp } from './helpers.mjs';
import { buildHookEntries, isKitCommand } from '../lib/hook-entries.mjs';
import { patchChanges } from '../lib/tool-input.mjs';

const run = (name, project, input) => runHook(path.join(HOOKS, name + '.mjs'), { cwd: project.cwd, hook_event_name: 'PreToolUse', ...input }, { cwd: project.cwd });
const patch = command => ({ tool_name: 'apply_patch', tool_input: { command } });

test('all nine original hooks emit their intended Codex protocol response when triggered', async () => {
  const p = makeProject({
    'inject-rules': { rulesFile: 'rules.txt' },
    'deploy-gate': { commandPattern: 'deploy-now', repoDir: '.', gatesDir: 'gates', shaFrom: 'HEAD' },
    'walk-brief-guard': { pathPattern: 'brief.md', requiredLines: [{ pattern: 'REQUIRED' }] },
    'read-ledger-gate': {},
    'db-write-guard': { clientPattern: 'psql', port: 5433, databases: ['testlive'], okFile: 'approval.txt' },
    'no-idle': { runsDir: 'runs' },
    'double-check': {},
    'measure-gate': { codeDirs: ['src'], receiptFile: 'missing-receipt.json' },
    wake: { runsDir: 'runs', minutes: 1 }
  });
  try {
    writeText(path.join(p.root, 'rules.txt'), 'RULE-FIXTURE');
    writeText(path.join(p.root, 'src', 'a.mjs'), 'export const value = 1;');
    writeText(path.join(p.root, 'runs', '.rewake-seconds'), '1');
    writeText(path.join(p.root, 'runs', 'worker', 'run.jsonl'), '{"type":"turn.completed"}\n');
    const inputs = {
      'inject-rules': { hook_event_name: 'SessionStart' },
      'deploy-gate': { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'deploy-now' } },
      'walk-brief-guard': { hook_event_name: 'PreToolUse', ...patch('*** Begin Patch\n*** Add File: brief.md\n+incomplete\n*** End Patch') },
      'read-ledger-gate': { hook_event_name: 'PreToolUse', ...patch('*** Begin Patch\n*** Add File: x.ts\n+x\n*** End Patch') },
      'db-write-guard': { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'psql -p 5433 -d testlive -c "DROP TABLE x"' } },
      'no-idle': { hook_event_name: 'Stop' },
      'double-check': { hook_event_name: 'Stop' },
      'measure-gate': { hook_event_name: 'Stop', session_id: p.root },
      wake: { hook_event_name: 'Stop' }
    };
    for (const [name, input] of Object.entries(inputs)) {
      const r = await runHook(path.join(HOOKS, name + '.mjs'), { cwd: p.root, ...input }, { args: ['--codex'] });
      assert.equal(r.code, 0, name);
      const out = JSON.parse(r.stdout);
      if (name === 'inject-rules') assert.match(out.hookSpecificOutput.additionalContext, /RULE-FIXTURE/);
      else if (name === 'wake') assert.match(out.systemMessage, /FINISHED-NOT-HANDLED/);
      else if (input.hook_event_name === 'PreToolUse') assert.equal(out.hookSpecificOutput.permissionDecision, 'deny', name);
      else assert.equal(out.decision, 'block', name);
    }
  } finally { rimraf(p.root); }
});

test('Codex: installed --codex mode emits explicit denial JSON and Stop continuation JSON', async () => {
  const p = makeProject({ 'read-ledger-gate': {}, 'double-check': {} });
  try {
    const deny = await runHook(path.join(HOOKS, 'read-ledger-gate.mjs'), { cwd: p.cwd, hook_event_name: 'PreToolUse', ...patch('*** Begin Patch\n*** Add File: x.ts\n+x\n*** End Patch') }, { args: ['--codex'] });
    assert.equal(deny.code, 0);
    assert.equal(JSON.parse(deny.stdout).hookSpecificOutput.permissionDecision, 'deny');
    const stop = await runHook(path.join(HOOKS, 'double-check.mjs'), { cwd: p.cwd, hook_event_name: 'Stop' }, { args: ['--codex'] });
    assert.equal(stop.code, 0);
    assert.equal(JSON.parse(stop.stdout).decision, 'block');
  } finally { rimraf(p.root); }
});

test('Codex: missing ledger blocks a multi-file patch even after an exempt doc', async () => {
  const p = makeProject({ 'read-ledger-gate': {} });
  try {
    const result = await run('read-ledger-gate', p, patch('*** Begin Patch\n*** Add File: README.md\n+hi\n*** Add File: src/a.ts\n+x\n*** End Patch'));
    assert.equal(result.code, 2);
    assert.match(result.stderr, /src\/a.ts/);
  } finally { rimraf(p.root); }
});

test('Codex: checked ledger admits the same patch; wrong line count denies it', async () => {
  const p = makeProject({ 'read-ledger-gate': { upstreamRoots: ['.'], mustMention: ['upstream'] } });
  try {
    writeText(path.join(p.root, 'upstream', 'source.ts'), 'one\ntwo\n');
    const ledger = path.join(p.root, '.codex', 'READ-LEDGER.md');
    writeText(ledger, '- upstream/source.ts - 2 lines\n');
    const input = patch('*** Begin Patch\n*** Add File: src/app.ts\n+x\n*** End Patch');
    assert.equal((await run('read-ledger-gate', p, input)).code, 0);
    writeText(ledger, '- upstream/source.ts - 3 lines\n');
    assert.equal((await run('read-ledger-gate', p, input)).code, 2);
  } finally { rimraf(p.root); }
});

test('Codex: deletion and move into a code path are gated, paths with spaces retained', async () => {
  const p = makeProject({ 'read-ledger-gate': {} });
  try {
    for (const body of ['*** Delete File: src/a.ts', '*** Update File: notes.txt\n*** Move to: src/with space.ts\n@@\n-old\n+new']) {
      assert.equal((await run('read-ledger-gate', p, patch('*** Begin Patch\n' + body + '\n*** End Patch'))).code, 2);
    }
  } finally { rimraf(p.root); }
});

test('Codex: raw patch string and cmd shell argument replay are normalized', async () => {
  const p = makeProject({ 'read-ledger-gate': {} });
  try {
    for (const input of [
      { tool_name: 'apply_patch', tool_input: '*** Begin Patch\n*** Add File: x.ts\n+x\n*** End Patch' },
      { tool_name: 'exec_command', tool_input: { cmd: 'Set-Content src/app.ts x' } },
      { tool_name: 'Bash', tool_input: { command: 'echo x > src/app.ts' } },
    ]) assert.equal((await run('read-ledger-gate', p, input)).code, 2);
    assert.equal((await run('read-ledger-gate', p, { tool_name: 'Bash', tool_input: { command: 'Get-Content src/app.ts' } })).code, 0);
  } finally { rimraf(p.root); }
});

test('Codex: patch brief checks added text, not deleted text; full additions require sections', async () => {
  const p = makeProject({ 'walk-brief-guard': { pathPattern: 'walk-.*[.]md', bannedPatterns: [{ pattern: 'do not publish' }], requiredSections: [{ pattern: '^EVERY DOOR:', onlyFullBody: true }] } });
  try {
    assert.equal((await run('walk-brief-guard', p, patch('*** Begin Patch\n*** Add File: walk-a.md\n+incomplete\n*** End Patch'))).code, 2);
    assert.equal((await run('walk-brief-guard', p, patch('*** Begin Patch\n*** Update File: walk-a.md\n@@\n-do not publish\n+publish\n*** End Patch'))).code, 0);
    assert.equal((await run('walk-brief-guard', p, patch('*** Begin Patch\n*** Update File: other.md\n*** Move to: walk-a.md\n@@\n+do not publish\n*** End Patch'))).code, 2);
  } finally { rimraf(p.root); }
});

test('Codex: turn IDs reset measurement count but Stop continuation IDs do not', async () => {
  const p = makeProject({ 'measure-gate': { receiptDir: 'receipts', maxBlocks: 2 } });
  try {
    writeText(path.join(p.root, 'src', 'x.ts'), 'x');
    const event = { hook_event_name: 'Stop', session_id: 'native-' + process.pid, turn_id: 'a' };
    assert.equal((await run('measure-gate', p, event)).code, 2);
    assert.equal((await run('measure-gate', p, { ...event, turn_id: 'b', stop_hook_active: true })).code, 2);
    const exhausted = await run('measure-gate', p, { ...event, turn_id: 'c', stop_hook_active: true });
    assert.equal(exhausted.code, 0);
    const payload = JSON.parse(exhausted.stdout);
    assert.equal(payload.continue, false);
    assert.match(payload.systemMessage, /still stale/);
    assert.equal((await run('measure-gate', p, { ...event, turn_id: 'new-user' })).code, 2);
  } finally { rimraf(p.root); }
});

test('Codex: double-check counts Codex transcript calls since the latest user message', async () => {
  const p = makeProject({ 'double-check': { minToolCalls: 2 } });
  try {
    const transcript = path.join(p.root, 'rollout.jsonl');
    const user = { type: 'response_item', payload: { type: 'message', role: 'user', content: [] } };
    const call = { type: 'response_item', payload: { type: 'function_call', name: 'exec_command' } };
    writeText(transcript, [call, user, call].map(JSON.stringify).join('\n') + '\n');
    const event = { hook_event_name: 'Stop', transcript_path: transcript };
    assert.equal((await run('double-check', p, event)).code, 0);
    fs.appendFileSync(transcript, JSON.stringify(call) + '\n');
    assert.equal((await run('double-check', p, event)).code, 2);
    assert.equal((await run('double-check', p, { ...event, stop_hook_active: true })).code, 0);
  } finally { rimraf(p.root); }
});

test('Codex: generated registration matches source and uses async, never asyncRewake', () => {
  const hooks = buildHookEntries();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT, 'install', 'settings-snippet.json'), 'utf8')), { hooks });
  assert.equal(hooks.Stop[0].hooks.at(-1).async, true);
  assert.doesNotMatch(JSON.stringify(hooks), /asyncRewake/);
  const guards = hooks.PreToolUse.filter(group => new RegExp(group.matcher).test('apply_patch'));
  assert.equal(guards.flatMap(group => group.hooks).length, 2);
  assert.equal(isKitCommand('node "C:/other/hook-kit/hooks/wake.mjs"'), false);
  assert.equal(isKitCommand('node "C:/other/claude-hook-kit/hooks/wake.mjs"'), false);
});

test('Codex: install honors CODEX_HOME and preserves config.toml and unrelated hooks', async () => {
  const home = mkTemp('codex-kit-home-');
  try {
    const toml = 'model = "keep-me"\n';
    writeText(path.join(home, 'config.toml'), toml);
    const other = { type: 'command', command: 'node "C:/other/hook-kit/hooks/wake.mjs"' };
    writeJson(path.join(home, 'hooks.json'), { hooks: { Stop: [{ hooks: [other] }] } });
    const result = await runHook(path.join(ROOT, 'install.mjs'), '', { env: { CODEX_HOME: home } });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(home, 'config.toml'), 'utf8'), toml);
    assert.match(result.stdout, /activation pending/);
    assert.ok(JSON.parse(fs.readFileSync(path.join(home, 'hooks.json'), 'utf8')).hooks.Stop[0].hooks.some(h => h.command === other.command));
    assert.equal(fs.existsSync(path.join(home, 'settings.json')), false);
  } finally { rimraf(home); }
});
