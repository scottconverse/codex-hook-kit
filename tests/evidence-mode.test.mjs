import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {inspectEvidence} from '../lib/acceptance-evidence.mjs';
import { makeProject, writeJson, writeText, runHook, HOOKS, rimraf } from './helpers.mjs';

test('report binding checks configured product inputs',t=>{
 const p=makeProject({});t.after(()=>rimraf(p.root));
 writeText(path.join(p.root,'product.txt'),'version one');writeText(path.join(p.root,'receipt.txt'),'passed');
 const bind=file=>({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.join(p.root,file))).digest('hex')});
 writeJson(path.join(p.root,'evidence.json'),{requirements:[{id:'one',status:'passed',evidence:[bind('receipt.txt')],inputs:[bind('product.txt')]}]});
 const section={evidenceFile:'evidence.json',requiredIds:['one'],requiredInputs:{one:['product.txt']}};
 assert.equal(inspectEvidence(p.root,section).passed,1);
 writeText(path.join(p.root,'product.txt'),'version two');assert.equal(inspectEvidence(p.root,section).passed,0);
});

test('evidence mode reports incomplete work without running acceptance or causing a stop loop', async t => {
  const p = makeProject({'completion-gate': {mode:'evidence', evidenceFile:'evidence.json', requiredIds:['1','2'], claimPattern:'all goal requirements are complete'}});
  t.after(()=>rimraf(p.root));
  writeJson(path.join(p.root,'evidence.json'), {scope:'installed package', requirements:[{id:'1',status:'unverified'},{id:'2',status:'failed'}]});
  const input={cwd:p.root,session_id:'one',hook_event_name:'Stop',last_assistant_message:'Status: work remains.'};
  const r=await runHook(path.join(HOOKS,'completion-gate.mjs'),input,{args:['--codex']});
  const o=JSON.parse(r.stdout); assert.match(o.systemMessage,/0\/2/); assert.equal(o.decision,undefined); assert.equal(o.continue,undefined);
  const claim=await runHook(path.join(HOOKS,'completion-gate.mjs'),{...input,last_assistant_message:'All goal requirements are complete.'},{args:['--codex']});
  assert.equal(JSON.parse(claim.stdout).decision,'block');
  const again=await runHook(path.join(HOOKS,'completion-gate.mjs'),{...input,stop_hook_active:true,last_assistant_message:'All goal requirements are complete.'},{args:['--codex']});
  assert.notEqual(JSON.parse(again.stdout||'{}').decision,'block');
});

test('evidence mode verifies complete required IDs and content hashes, not timestamps', async t => {
  const p=makeProject({'measure-gate':{mode:'evidence',evidenceFile:'evidence.json',requiredIds:['1','2']}}); t.after(()=>rimraf(p.root));
  const receipt=writeText(path.join(p.root,'receipt.txt'),'actual focused result');
  const evidence={path:'receipt.txt',sha256:createHash('sha256').update(fs.readFileSync(receipt)).digest('hex')};
  const run=async()=>{const r=await runHook(path.join(HOOKS,'measure-gate.mjs'),{cwd:p.root,session_id:Math.random().toString(),hook_event_name:'Stop'},{args:['--codex']}); assert.ok(r.stdout,'enabled evidence mode must report its result'); return JSON.parse(r.stdout);};
  writeJson(path.join(p.root,'evidence.json'),{scope:'installed package',requirements:[{id:'1',status:'passed',evidence:[evidence]}]});
  assert.match((await run()).systemMessage,/missing requirement 2/);
  writeJson(path.join(p.root,'evidence.json'),{scope:'installed package',requirements:[{id:'1',status:'passed',evidence:[evidence]},{id:'2',status:'passed',evidence:[evidence]}]});
  assert.match((await run()).systemMessage,/2\/2/);
  writeText(receipt,'changed, newer is not proof');
  assert.match((await run()).systemMessage,/hash mismatch/);
});

test('unavailable evidence state reports a warning without a continuation loop', async t=>{
  const p=makeProject({'completion-gate':{mode:'evidence',evidenceFile:'evidence.json',requiredIds:['1']}});t.after(()=>rimraf(p.root));
  writeJson(path.join(p.root,'evidence.json'),{requirements:[{id:'1',status:'unverified'}]});
  writeText(path.join(p.root,'.codex','evidence-state'),'not a directory');
  const r=await runHook(path.join(HOOKS,'completion-gate.mjs'),{cwd:p.root,hook_event_name:'Stop'},{args:['--codex']});
  assert.equal(r.code,0);assert.match(JSON.parse(r.stdout).systemMessage,/cannot persist/);
});
