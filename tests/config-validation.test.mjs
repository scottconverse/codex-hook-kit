import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { sectionFor } from '../lib/config.mjs';
import { HOOKS, makeProject, rimraf, runHook, writeText, writeJson } from './helpers.mjs';

async function deny(p, name = 'read-ledger-gate') {
  const result = await runHook(path.join(HOOKS, name + '.mjs'), {
    cwd: p.cwd, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'app.ts' },
  }, { args: ['--codex'] });
  assert.equal(result.code, 0, result.stderr);
  assert.ok(result.stdout, 'configuration errors must be visible');
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  return output.hookSpecificOutput.permissionDecisionReason;
}

test('present malformed/non-object config reports native configuration errors', async () => {
  const p = makeProject({});
  try {
    for (const text of ['{broken', 'null', '[]', 'false']) {
      writeText(p.configFile, text);
      assert.match(await deny(p), /configuration.*(?:JSON|object)/i);
    }
  } finally { rimraf(p.root); }
});

test('known numeric, boolean and string-array controls cannot silently weaken checks', () => {
  for(const [name, section, field] of [
    ['read-ledger-gate',{minEntries:'oops'},'minEntries'],
    ['read-ledger-gate',{minLines:{}},'minLines'],
    ['read-ledger-gate',{requireExisting:'false'},'requireExisting'],
    ['read-ledger-gate',{verifyLines:0},'verifyLines'],
    ['read-ledger-gate',{mustMention:'code'},'mustMention'],
    ['measure-gate',{maxBlocks:0},'maxBlocks'],
    ['double-check',{minToolCalls:-1},'minToolCalls'],
    ['db-write-guard',{port:70000},'port'],
    ['db-write-guard',{databases:[false]},'databases'],
    ['completion-gate',{requiredIds:[1]},'requiredIds'],
    ['completion-gate',{check:{timeoutMs:'oops'}},'timeoutMs'],
    ['stop-policy',{maxContinuations:'oops'},'maxContinuations'],
    ['stop-policy',{maxContinuations:11},'maxContinuations'],
  ]) assert.throws(()=>sectionFor({config:{[name]:section}},name),new RegExp(field));
  assert.ok(sectionFor({config:{'stop-policy':{maxContinuations:0}}},'stop-policy'));
  assert.ok(sectionFor({config:{wake:{minutes:0.006}}},'wake'));
  assert.equal(sectionFor({config:{'read-ledger-gate':{enabled:false,minEntries:'oops'}}},'read-ledger-gate'),null);
});

test('shared diagnostics and stop controls are validated before hook execution', async () => {
  const p=makeProject({});
  try {
    for(const [key,value,expected] of [['diagnostics',{enabled:'true'},/diagnostics.enabled/],['stop-policy',{maxContinuations:'oops'},/stop-policy.maxContinuations/]]) {
      writeJson(p.configFile,{[key]:value,'read-ledger-gate':{}});
      assert.match(await deny(p),expected);
    }
  } finally {rimraf(p.root);}
});

test('selected section and enabled values must have the expected types', async () => {
  const p = makeProject({});
  try {
    for (const section of [null, false, [], 'on', { enabled: 'false' }]) {
      writeJson(p.configFile, { 'read-ledger-gate': section });
      assert.match(await deny(p), /read-ledger-gate.*(?:object|enabled)/i);
    }
    writeJson(p.configFile, { enabled: 'false' });
    assert.match(await deny(p), /enabled.*boolean/i);
  } finally { rimraf(p.root); }
});

test('configured invalid regexes and regex collections report errors before execution', async () => {
  const p = makeProject({});
  try {
    for (const [name, section] of [
      ['read-ledger-gate', { codePattern: '[' }], ['read-ledger-gate', { rowPattern: 123 }],
      ['deploy-gate', { skipPatterns: ['['] }], ['deploy-gate', { skipPatterns: '[' }],
      ['walk-brief-guard', { bannedPatterns: [{ pattern: '[' }] }],
      ['measure-gate', { requireMatch: '[' }], ['completion-gate', { mode: 'evidence', claimPattern: '[' }],
    ]) {
      writeJson(p.configFile, { [name]: section });
      assert.match(await deny(p, name), /configuration.*(?:pattern|regex|requireMatch)/i);
    }
  } finally { rimraf(p.root); }
});

test('disabled malformed sections stay off and invalid ledger path collections are visible', async () => {
  const p = makeProject({});
  try {
    for (const config of [
      { enabled: false, 'read-ledger-gate': 'invalid' },
      { 'read-ledger-gate': { enabled: false, codePattern: '[' } },
    ]) {
      writeJson(p.configFile, config);
      const result = await runHook(path.join(HOOKS, 'read-ledger-gate.mjs'), { cwd: p.cwd }, { args: ['--codex'] });
      assert.equal(result.stdout, ''); assert.equal(result.code, 0);
    }
    for (const section of [{ taskReadingFiles: 'reference.ts' }, { upstreamRoots: [false] }, { ledgerFile: {} }]) {
      writeJson(p.configFile, { 'read-ledger-gate': section });
      assert.match(await deny(p), /configuration.*(?:taskReadingFiles|upstreamRoots|ledgerFile)/i);
    }
  } finally { rimraf(p.root); }
});
