import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { backupSettings, kitHookEntries, mergeHookEntries, readSettings, stamp, writeSettings } from './settings.mjs';

export function assertNodeVersion(version = process.versions.node) {
  const [major, minor] = String(version).split('.').map(Number);
  if (!Number.isInteger(major) || !Number.isInteger(minor) || major < 22 || (major === 22 && minor < 13)) {
    throw new Error('Node.js >=22.13 is required (Node 24 recommended); found ' + version + '. Nothing was installed.');
  }
}

export function settingsDir(configDir) {
  return path.resolve(configDir || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
}

function kitPath(dir) { return path.join(path.resolve(dir), 'codex-hook-kit'); }

function restoreFiles(dir, backup, manifest) {
  const target = kitPath(dir);
  if (path.dirname(target) !== path.resolve(dir)) throw new Error('invalid kit target');
  fs.rmSync(target, { recursive: true, force: true });
  if (manifest.hadKit) fs.cpSync(path.join(backup, 'kit'), target, { recursive: true });
}

// Back up both halves before mutation; failures restore the exact pre-operation state.
export function installationTransaction(dir, operation, mutate) {
  assertNodeVersion();
  dir = path.resolve(dir);
  readSettings(path.join(dir, 'hooks.json')); // reject malformed settings before creating anything
  fs.mkdirSync(dir, { recursive: true });
  const lockFile = path.join(dir, '.hook-kit-install.lock');
  let lock;
  try { lock = fs.openSync(lockFile, 'wx'); }
  catch (error) { throw new Error('installation lock unavailable (' + lockFile + '): ' + error.message); }
  try {
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, operation, startedAt: new Date().toISOString() }));
    return transactionBody(dir, operation, mutate);
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockFile);
  }
}

function transactionBody(dir, operation, mutate) {
  const settingsFile = path.join(dir, 'hooks.json');
  const before = readSettings(settingsFile);
  const target = kitPath(dir);
  if (fs.existsSync(target) && (!fs.lstatSync(target).isDirectory() || fs.lstatSync(target).isSymbolicLink())) throw new Error('installed kit path must be a real directory: ' + target);
  const backup = path.join(dir, 'hook-kit-backups', stamp() + '-' + randomUUID());
  fs.mkdirSync(backup, { recursive: true });
  const manifest = { schema: 1, operation, configDir: dir, hadKit: fs.existsSync(target), hadSettings: before.exists, previousHooks: kitHookEntries(before.settings), prepared: true, completed: false };
  if (before.exists) fs.copyFileSync(settingsFile, path.join(backup, 'hooks.json'));
  if (manifest.hadKit) fs.cpSync(target, path.join(backup, 'kit'), { recursive: true });
  const manifestFile = path.join(backup, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  try {
    const result = mutate({ kitDir: target, settingsFile, backup });
    manifest.completed = true;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    return { backup, result };
  } catch (error) {
    try {
      restoreFiles(dir, backup, manifest);
      if (manifest.hadSettings) fs.copyFileSync(path.join(backup, 'hooks.json'), settingsFile);
      else fs.rmSync(settingsFile, { force: true });
    } catch (recovery) {
      throw new Error(error.message + '; automatic restore failed: ' + recovery.message + '; backup: ' + backup);
    }
    throw new Error(error.message + '; restored pre-operation scripts and settings; backup: ' + backup);
  }
}

export function copyKit(source, target) {
  const files = [];
  for (const sub of ['hooks', 'lib']) {
    const src = path.join(source, sub);
    if (!fs.statSync(src).isDirectory()) throw new Error('missing source directory: ' + src);
    fs.mkdirSync(path.join(target, sub), { recursive: true });
    for (const name of fs.readdirSync(src)) {
      const from = path.join(src, name);
      if (!fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, path.join(target, sub, name));
      files.push(sub + '/' + name);
    }
  }
  for (const name of ['doctor.mjs', 'rollback.mjs', 'uninstall.mjs']) {
    fs.copyFileSync(path.join(source, name), path.join(target, name));
    files.push(name);
  }
  return files;
}

export function rollbackInstallation(dir, backup) {
  assertNodeVersion();
  dir = path.resolve(dir);
  backup = path.resolve(backup);
  const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'));
  if (manifest.schema !== 1 || path.resolve(manifest.configDir) !== dir || !manifest.prepared) throw new Error('backup is incomplete or belongs to a different settings directory');
  if (manifest.hadKit && !fs.statSync(path.join(backup, 'kit')).isDirectory()) throw new Error('backup scripts are missing');
  const transaction = installationTransaction(dir, 'rollback', ({ settingsFile }) => {
    const { settings } = readSettings(settingsFile);
    const before = JSON.stringify(kitHookEntries(settings));
    mergeHookEntries(settings, manifest.previousHooks);
    const changed = before !== JSON.stringify(kitHookEntries(settings));
    backupSettings(settingsFile);
    restoreFiles(dir, backup, manifest);
    writeSettings(settingsFile, settings);
    return changed;
  });
  return { ...transaction, changed: transaction.result };
}
