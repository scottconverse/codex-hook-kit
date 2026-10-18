import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { HOOKS, makeProject, rimraf, runHook, writeJson, writeText } from './helpers.mjs';

test('publication scope record denies publication, permits dry-run/build, and binds an existing go to the commit', async () => {
  const p = makeProject({ 'deploy-gate': {
    commandPattern: 'publish_beta_candidate[.]py|\\bgh\\s+release\\s+(create|edit|upload|delete)\\b',
    skipPatterns: ['^\\s*python\\s+publish_beta_candidate[.]py\\s+(?=[^;\\n]*--dry-run(?:\\s|$))'],
    authorizationFile: '.codex/publication.json', repoDir: '.', shaFrom: 'HEAD',
  }});
  const run = command => runHook(path.join(HOOKS, 'deploy-gate.mjs'), { cwd: p.cwd, tool_input: { command } });
  try {
    execFileSync('git', ['init', '-q', p.root]);
    execFileSync('git', ['-C', p.root, '-c', 'user.name=Test', '-c', 'user.email=t@example.com', 'commit', '--allow-empty', '-qm', 'fixture']);
    const commit = execFileSync('git', ['-C', p.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const file = path.join(p.root, '.codex/publication.json');
    writeJson(file, { authorized: false, source: 'existing owner scope' });
    assert.equal((await run('python publish_beta_candidate.py --source-sha ' + commit)).code, 2);
    assert.equal((await run('python publish_beta_candidate.py --dry-run')).code, 0);
    assert.equal((await run('python build_candidate.py')).code, 0);
    assert.equal((await run('python publish_beta_candidate.py --dry-run; gh release create v1')).code, 2);
    assert.equal((await run('python publish_beta_candidate.py --dry-run | gh release create v1')).code, 2);
    writeJson(file, { authorized: true, source: 'existing owner go', commit });
    assert.equal((await run('gh release create v1 --target ' + commit)).code, 0);
    assert.equal((await run('gh release create v1 --target ' + '0'.repeat(40))).code, 2);
    writeJson(file, { authorized: true, source: 'existing owner go', commit: '0'.repeat(40) });
    assert.equal((await run('gh release create v1')).code, 2);
    writeText(file, '{bad');
    assert.equal((await run('gh release create v1')).code, 2);
  } finally { rimraf(p.root); }
});

test('host-aware live DB guard isolates guest and test DB without losing local/default writes', async () => {
  const p = makeProject({ 'db-write-guard': {
    port: 5432, hosts: ['127.0.0.1', 'localhost', '::1'], defaultHost: '127.0.0.1', defaultPort: 5432,
    databases: ['civiccast'], clientPattern: '\\bpsql\\b|\\bpg_restore\\b', restorePattern: '\\bpg_restore\\b',
    okFile: '.codex/db-ok',
  }});
  const run = command => runHook(path.join(HOOKS, 'db-write-guard.mjs'), { cwd: p.cwd, tool_input: { command } });
  try {
    for (const command of [
      'psql -h 127.0.0.1 -p 5432 -d civiccast -c "DELETE FROM stories"',
      'psql --host=localhost -d civiccast -c "UPDATE stories SET x=1"',
      'psql "postgresql://localhost/civiccast" -c "DROP TABLE stories"',
      'psql -d civiccast -c "DELETE FROM stories"',
      'psql -h127.0.0.1 -p5432 -dciviccast -c"DELETE FROM stories"',
      'psql -h 172.18.33.75 -d civiccast -c "SELECT 1"; psql -h localhost -d civiccast -c "DELETE FROM stories"',
    ]) assert.equal((await run(command)).code, 2, command);
    for (const command of [
      'psql -h 172.18.33.75 -p 5432 -d civiccast -c "DELETE FROM stories"',
      'psql "postgres://172.18.33.75:5432/civiccast" -c "DROP TABLE stories"',
      'psql -h localhost -p 5432 -d civiccast_test -c "DELETE FROM stories"',
      'psql -d civiccast -c "SELECT count(*) FROM stories"',
      'psql -h localhost -p 5544 -d civiccast -c "DELETE FROM stories"',
    ]) assert.equal((await run(command)).code, 0, command);
    writeText(path.join(p.root, '.codex/db-ok'), 'existing authorized go');
    assert.equal((await run('psql -d civiccast -c "DELETE FROM stories"')).code, 0);
  } finally { rimraf(p.root); }
});
