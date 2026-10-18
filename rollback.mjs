#!/usr/bin/env node
import { rollbackInstallation, settingsDir } from './lib/installation.mjs';

try {
  let dir = '', backup = '';
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--config-dir') { dir = process.argv[++i]; if (!dir) throw new Error('--config-dir needs a folder'); }
    else if (arg === '--backup') backup = process.argv[++i];
    else if (arg === '--help' || arg === '-h') { console.log('usage: node rollback.mjs [--config-dir <dir>] --backup <transaction folder>'); process.exit(0); }
    else throw new Error('unknown argument: ' + arg);
  }
  if (!backup) throw new Error('--backup needs a transaction folder printed by install/uninstall');
  const result = rollbackInstallation(settingsDir(dir), backup);
  console.log('rollback: restored prior kit scripts and registrations; unrelated current settings/hooks preserved.');
  console.log('  recovery backup: ' + result.backup);
  console.log('  registration ' + (result.changed ? 'changed: review and trust the restored exact hooks in Codex.' : 'unchanged.'));
  console.log('  No hook trust was granted. Start a new local session after review.');
} catch (error) { console.error('rollback: ' + error.message); process.exitCode = 1; }
