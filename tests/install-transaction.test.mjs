import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HOOKS, mkTemp, rimraf, runHook, writeJson, writeText } from './helpers.mjs';
import { assertNodeVersion, installationTransaction } from '../lib/installation.mjs';

const root = path.dirname(HOOKS);
const invoke = (name, dir, extra = []) => runHook(path.join(root, name), '', { args: ['--config-dir', dir, ...extra] });

test('install pins the executing Node, records transactional backup, and reports changed trust', async () => {
  const dir = mkTemp('hook-kit portable ');
  try {
    const result = await invoke('install.mjs', dir);
    assert.equal(result.code, 0, result.stderr);
    const settings = JSON.parse(fs.readFileSync(path.join(dir, 'hooks.json')));
    const command = settings.hooks.SessionStart[0].hooks[0].command.replace(/^& /, '');
    assert.ok(command.startsWith('"' + process.execPath.replaceAll('\\', '/') + '" ') || command.startsWith("'" + process.execPath + "' "), command);
    assert.ok(result.stdout.includes('registration changed'), result.stdout);
    assert.ok(fs.existsSync(path.join(dir, 'hook-kit-backups')));
    const second = await invoke('install.mjs', dir);
    assert.ok(second.stdout.includes('registration unchanged'), second.stdout);
    assert.equal(fs.existsSync(path.join(dir, 'config.toml')), false);
  } finally { rimraf(dir); }
});

test('failed mutation restores both existing scripts and exact settings, including first install failure', () => {
  const dir = mkTemp('hook-kit-failure-');
  try {
    const settingsFile = writeText(path.join(dir, 'hooks.json'), '{"untouched":true}\n');
    const script = writeText(path.join(dir, 'codex-hook-kit/hooks/old.mjs'), 'old bytes');
    assert.throws(() => installationTransaction(dir, 'test', () => {
      fs.writeFileSync(script, 'new bytes');
      fs.writeFileSync(settingsFile, '{"changed":true}');
      throw new Error('injected write failure');
    }), /injected write failure; restored pre-operation/);
    assert.equal(fs.readFileSync(script, 'utf8'), 'old bytes');
    assert.equal(fs.readFileSync(settingsFile, 'utf8'), '{"untouched":true}\n');
    const empty = mkTemp('hook-kit-first-failure-');
    try {
      assert.throws(() => installationTransaction(empty, 'test', ({ kitDir, settingsFile }) => {
        writeText(path.join(kitDir, 'hooks/new.mjs'), 'partial');
        writeJson(settingsFile, { changed: true });
        throw new Error('first install failure');
      }), /restored pre-operation/);
      assert.equal(fs.existsSync(path.join(empty, 'codex-hook-kit')), false);
      assert.equal(fs.existsSync(path.join(empty, 'hooks.json')), false);
    } finally { rimraf(empty); }
  } finally { rimraf(dir); }
});

test('Node prerequisite rejects unsupported versions and accepts the supported boundary', () => {
  for (const version of ['20.19.0', '22.12.0', 'bad']) assert.throws(() => assertNodeVersion(version), /Node.js >=22.13/);
  for (const version of ['22.13.0', '24.0.0']) assert.doesNotThrow(() => assertNodeVersion(version));
});

test('malformed hook registrations fail before mutating scripts or settings', async () => {
  const dir = mkTemp('hook-kit-invalid-settings-');
  try {
    const file = writeText(path.join(dir, 'hooks.json'), '{"hooks":[]}\n');
    const result = await invoke('install.mjs', dir);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /hooks must be an object/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{"hooks":[]}\n');
    assert.deepEqual(fs.readdirSync(dir), ['hooks.json']);
  } finally { rimraf(dir); }
});

test('exclusive installation lock rejects a simultaneous operation and releases on failure', () => {
  const dir = mkTemp('hook-kit-lock-');
  try {
    assert.throws(() => installationTransaction(dir, 'outer', () => {
      assert.throws(() => installationTransaction(dir, 'second', () => assert.fail('must not mutate')), /installation lock unavailable/);
      throw new Error('outer failure');
    }), /outer failure; restored pre-operation/);
    assert.equal(fs.existsSync(path.join(dir, '.hook-kit-install.lock')), false);
    assert.doesNotThrow(() => installationTransaction(dir, 'after failure', () => {}));
  } finally { rimraf(dir); }
});

test('rollback restores old scripts and kit registrations while preserving later unrelated registrations', async () => {
  const dir = mkTemp('hook-kit-rollback-');
  try {
    const oldCommand = 'node "' + dir.replaceAll('\\', '/') + '/codex-hook-kit/hooks/wake.mjs"';
    writeText(path.join(dir, 'codex-hook-kit/hooks/no-idle.mjs'), '// prior installed script');
    writeJson(path.join(dir, 'hooks.json'), { model: 'keep', hooks: { Stop: [{ hooks: [{ type: 'command', command: oldCommand }] }] } });
    const result = await invoke('install.mjs', dir);
    assert.equal(result.code, 0, result.stderr);
    const backups = fs.readdirSync(path.join(dir, 'hook-kit-backups'));
    assert.equal(backups.length, 1);
    const settingsFile = path.join(dir, 'hooks.json');
    const current = JSON.parse(fs.readFileSync(settingsFile));
    current.model = 'new-model';
    current.hooks.Stop.push({ hooks: [{ type: 'command', command: 'node later-notification.mjs' }] });
    writeJson(settingsFile, current);
    const rollback = await invoke('rollback.mjs', dir, ['--backup', path.join(dir, 'hook-kit-backups', backups[0])]);
    assert.equal(rollback.code, 0, rollback.stderr);
    assert.equal(fs.readFileSync(path.join(dir, 'codex-hook-kit/hooks/no-idle.mjs'), 'utf8'), '// prior installed script');
    const restored = JSON.parse(fs.readFileSync(settingsFile));
    assert.equal(restored.model, 'new-model');
    const commands = restored.hooks.Stop.flatMap(g => g.hooks.map(h => h.command));
    assert.deepEqual(commands.sort(), [oldCommand, 'node later-notification.mjs'].sort());
  } finally { rimraf(dir); }
});
