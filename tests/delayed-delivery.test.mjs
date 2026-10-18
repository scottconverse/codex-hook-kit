import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {makeProject,writeText,runHook,HOOKS,rimraf} from './helpers.mjs';
import {queueDelayedReport,consumeDelayedReport,MAX_REPORT_CHARS} from '../lib/delayed-delivery.mjs';

test('async report reaches only its parent on the next prompt, once, with rules disabled',async t=>{
  const p=makeProject({'inject-rules':{enabled:false},'delayed-report':{runsDir:'runs',minutes:0}});
  t.after(()=>rimraf(p.root));
  writeText(path.join(p.root,'runs','worker','run.jsonl'),'{"type":"result"}\n');
  const input={cwd:p.cwd,session_id:'parent',hook_event_name:'Stop'};
  const emitted=await runHook(path.join(HOOKS,'delayed-report.mjs'),input);
  assert.match(JSON.parse(emitted.stdout).systemMessage,/FINISHED-NOT-HANDLED/);
  const prompt=(session_id,prompt='continue')=>runHook(path.join(HOOKS,'inject-rules.mjs'),{...input,session_id,hook_event_name:'UserPromptSubmit',prompt});
  assert.equal((await prompt('other')).stdout,'');
  assert.equal((await prompt('parent','pause')).stdout,'');
  assert.equal((await prompt('parent','answer only')).stdout,'');
  const ready=await prompt('parent');
  assert.ok(ready.stdout,'a queued report must become model context on resume');
  const delivered=JSON.parse(ready.stdout);
  assert.equal(delivered.hookSpecificOutput.hookEventName,'UserPromptSubmit');
  assert.match(delivered.hookSpecificOutput.additionalContext,/FINISHED-NOT-HANDLED/);
  assert.equal((await prompt('parent')).stdout,'');
});

test('pending report replaces the older snapshot, stays bounded, and concurrent consumers deliver once',async t=>{
  const p=makeProject({'delayed-report':{minutes:0}});
  t.after(()=>rimraf(p.root));
  const input={cwd:p.cwd,session_id:'parent',hook_event_name:'UserPromptSubmit',prompt:'continue'};
  assert.equal(queueDelayedReport(p.root,input,'old'),true);
  assert.equal(queueDelayedReport(p.root,input,'x'.repeat(MAX_REPORT_CHARS+100)),true);
  const both=await Promise.all([runHook(path.join(HOOKS,'inject-rules.mjs'),input),runHook(path.join(HOOKS,'inject-rules.mjs'),input)]);
  assert.equal(both.filter(r=>r.stdout).length,1);
  const output=JSON.parse(both.find(r=>r.stdout).stdout).hookSpecificOutput.additionalContext;
  assert.ok(output.endsWith('x'.repeat(MAX_REPORT_CHARS)));
  assert.equal(consumeDelayedReport(p.root,input),null);
  assert.equal(queueDelayedReport(p.root,{},'unowned'),false);
});

test('disabled canonical delayed reporter wins over legacy alias and SessionStart does not consume',async t=>{
  const p=makeProject({'delayed-report':{enabled:false},wake:{minutes:0}});
  t.after(()=>rimraf(p.root));
  const input={cwd:p.cwd,session_id:'parent',hook_event_name:'UserPromptSubmit',prompt:'continue'};
  assert.equal(queueDelayedReport(p.root,input,'pending'),true);
  assert.equal((await runHook(path.join(HOOKS,'inject-rules.mjs'),input)).stdout,'');
  assert.equal((await runHook(path.join(HOOKS,'inject-rules.mjs'),{...input,hook_event_name:'SessionStart'})).stdout,'');
  assert.equal(consumeDelayedReport(p.root,input),'pending');
});

test('a lock left by a dead process cannot permanently block pending delivery',t=>{
  const p=makeProject({'delayed-report':{minutes:0}});
  t.after(()=>rimraf(p.root));
  const input={session_id:'parent'};
  const file=path.join(p.root,'.codex','delayed-reports',createHash('sha256').update(input.session_id).digest('hex')+'.json');
  writeText(file+'.lock',JSON.stringify({pid:2147483647}));
  assert.equal(queueDelayedReport(p.root,input,'after crash'),true);
  assert.equal(consumeDelayedReport(p.root,input),'after crash');
  assert.equal(consumeDelayedReport(p.root,input),null);
  assert.equal(fs.readFileSync(file+'.lock','utf8'),JSON.stringify({pid:2147483647}));
});
