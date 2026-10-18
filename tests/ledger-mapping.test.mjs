import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { findConfig } from '../lib/config.mjs';
import { HOOKS, makeProject, rimraf, runHook, writeJson, writeText } from './helpers.mjs';

const hook = path.join(HOOKS, 'read-ledger-gate.mjs');
const event = (cwd, file) => ({ cwd, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: file } });

test('projectConfig delegates to authoritative project root', async () => {
  const target = makeProject({ 'read-ledger-gate': { requireTargetCoverage: true } });
  const source = makeProject({ projectConfig: target.configFile });
  try {
    assert.equal(findConfig(source.cwd).dir, target.root);
    writeText(path.join(target.root, 'app.ts'), 'read\n');
    writeText(path.join(target.root, '.codex/READ-LEDGER.md'), '- app.ts — 1 lines\n');
    const result = await runHook(hook, event(source.cwd, path.join(target.root, 'app.ts')));
    assert.equal(result.code, 0, result.stderr);
  } finally { rimraf(source.root); rimraf(target.root); }
});

test('projectConfig errors explicitly on missing, malformed, relative and cyclic targets', async () => {
  const source = makeProject({});
  const target = makeProject({});
  try {
    for (const [mapped, contents, expected] of [
      [path.join(target.root, 'missing.json'), null, /cannot read mapped config/i],
      [target.configFile, '{broken', /invalid mapped config/i],
      [target.configFile, '[]', /invalid mapped config/i],
      ['relative.json', null, /absolute path/i],
      [target.configFile, JSON.stringify({ projectConfig: source.configFile }), /mapping cycle/i],
    ]) {
      if (contents !== null) writeText(target.configFile, contents);
      writeJson(source.configFile, { projectConfig: mapped });
      const result = await runHook(hook, event(source.cwd, 'app.ts'), { args: ['--codex'] });
      const output = JSON.parse(result.stdout);
      assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
      assert.match(output.hookSpecificOutput.permissionDecisionReason, expected);
    }
  } finally { rimraf(source.root); rimraf(target.root); }
});

test('target coverage rejects unrelated and same-basename rows, allows exact resolved file', async () => {
  const p = makeProject({ 'read-ledger-gate': { requireTargetCoverage: true } });
  try {
    writeText(path.join(p.cwd, 'app.ts'), 'real\n');
    writeText(path.join(p.root, 'other/app.ts'), 'other\n');
    writeText(path.join(p.root, 'AGENTS.md'), 'instructions\n');
    for (const row of ['AGENTS.md', 'other/app.ts']) {
      writeText(path.join(p.root, '.codex/READ-LEDGER.md'), `- ${row} — 1 lines\n`);
      const result = await runHook(hook, event(p.cwd, 'app.ts'));
      assert.equal(result.code, 2);
      assert.match(result.stderr, /target has no read ledger row/);
    }
    writeText(path.join(p.root, '.codex/READ-LEDGER.md'), '- work/app.ts — 1 lines\n');
    const result = await runHook(hook, event(p.cwd, './app.ts'));
    assert.equal(result.code, 0, result.stderr);
  } finally { rimraf(p.root); }
});

test('new code requires explicit existing taskReadingFiles recorded in ledger', async () => {
  const p = makeProject({ 'read-ledger-gate': { requireTargetCoverage: true } });
  try {
    writeText(path.join(p.root, 'reference.ts'), 'ref\n');
    writeText(path.join(p.root, '.codex/READ-LEDGER.md'), '- reference.ts — 1 lines\n');
    let result = await runHook(hook, event(p.cwd, 'new.ts'));
    assert.equal(result.code, 2);
    assert.match(result.stderr, /taskReadingFiles/);
    for (const reading of [['missing.ts'], ['other.ts'], ['reference.ts']]) {
      writeText(path.join(p.root, 'other.ts'), 'other\n');
      writeJson(p.configFile, { 'read-ledger-gate': { requireTargetCoverage: true, taskReadingFiles: reading, requireExisting: false } });
      result = await runHook(hook, event(p.cwd, 'new.ts'));
      assert.equal(result.code, reading[0] === 'reference.ts' ? 0 : 2, result.stderr);
    }
  } finally { rimraf(p.root); }
});

test('recorded SHA256 rejects same-line-count changes and permits fresh hash', async () => {
  const p = makeProject({ 'read-ledger-gate': { requireTargetCoverage: true, verifyLines: false } });
  try {
    const file = path.join(p.cwd, 'app.ts');
    writeText(file, 'before\n');
    const hash = createHash('sha256').update('before\n').digest('hex');
    writeText(path.join(p.root, '.codex/READ-LEDGER.md'), `- work/app.ts — 1 lines sha256:${hash}\n`);
    let result = await runHook(hook, event(p.cwd, file));
    assert.equal(result.code, 0, result.stderr);
    writeText(file, 'after!\n');
    result = await runHook(hook, event(p.cwd, file));
    assert.equal(result.code, 2);
    assert.match(result.stderr, /SHA256.*stale/i);
  } finally { rimraf(p.root); }
});

test('recorded SHA256 cannot silently pass missing files or malformed digests', async () => {
  const p = makeProject({ 'read-ledger-gate': { requireExisting: false } });
  try {
    for (const digest of ['a'.repeat(64), '', 'bad']) {
      writeText(path.join(p.root, '.codex/READ-LEDGER.md'), `- missing.ts — 1 lines sha256:${digest}\n`);
      const result = await runHook(hook, event(p.cwd, 'new.ts'));
      assert.equal(result.code, 2);
      assert.match(result.stderr, /SHA256/);
    }
  } finally { rimraf(p.root); }
});
