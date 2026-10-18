import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { probeHooks, discoverCodex } from '../lib/diagnostics.mjs';
import { ROOT, makeProject, mkTemp, rimraf, runHook, writeJson, writeText } from './helpers.mjs';

const doctor = path.join(ROOT, 'doctor.mjs');

test('doctor reports runtime, project, trust and receipts separately without writing project state', async () => {
  const p = makeProject({ 'read-ledger-gate': { taskReadingFiles: ['missing file.ts'] }, diagnostics: { enabled: true } });
  const settings = mkTemp();
  try {
    writeJson(path.join(p.root, '.codex/hook-observations/one.json'), { hook:'read-ledger-gate',event:'PreToolUse',time:'2026-10-18T00:00:00Z',delivery:'not established by this receipt' });
    const result = await runHook(doctor, '', {args:['--project',p.cwd,'--config-dir',settings,'--codex',path.join(settings,'missing.exe'),'--json']});
    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.runtime.node.supported, true);
    assert.equal(report.project.root, p.root);
    assert.equal(report.hooks.support, 'unavailable');
    assert.equal(report.trust.status, 'unknown');
    assert.equal(report.prerequisites.files[0].exists, false);
    assert.equal(report.observations.receipts.length, 1);
    for (const capability of ['workerLifecycle','ownerLifecycle','synchronousStop']) assert.match(report.capabilities[capability], /^unverified/);
    assert.match(report.observations.limitation, /delivery.*not established/i);
    assert.equal(fs.existsSync(path.join(p.root, '.codex/evidence-state')), false);
    assert.deepEqual(fs.readdirSync(settings), []);
  } finally { rimraf(p.root); rimraf(settings); }
});

test('doctor distinguishes lifecycle and synchronous Stop receipts from unrelated and async invocations', async () => {
  const p=makeProject({});
  const args=['--project',p.cwd,'--codex',path.join(p.root,'missing.exe')];
  const receipt=(name,hook,event)=>writeJson(path.join(p.root,'.codex/hook-observations',name+'.json'),{hook,event,time:'2026-10-18T00:00:00Z'});
  try {
    receipt('inject','inject-rules','UserPromptSubmit');
    receipt('async','delayed-report','Stop');
    receipt('goal','goal-lifecycle','PostToolUse');
    receipt('start','worker-lifecycle','SubagentStart');
    const partial=JSON.parse((await runHook(doctor,'',{args:[...args,'--json']})).stdout);
    assert.match(partial.capabilities.ownerLifecycle,/^unverified/);
    assert.match(partial.capabilities.synchronousStop,/^unverified/);
    assert.match(partial.capabilities.workerLifecycle,/SubagentStart: recorded; SubagentStop: unverified/);
    receipt('owner','goal-lifecycle','UserPromptSubmit');
    receipt('stop','completion-gate','Stop');
    receipt('end','worker-lifecycle','SubagentStop');
    const complete=JSON.parse((await runHook(doctor,'',{args:[...args,'--json']})).stdout);
    assert.match(complete.capabilities.workerLifecycle,/SubagentStart: recorded; SubagentStop: recorded/);
    assert.match(complete.capabilities.ownerLifecycle,/^Recorded goal-lifecycle UserPromptSubmit invocation/);
    assert.match(complete.capabilities.synchronousStop,/^Recorded synchronous Stop hook invocation: completion-gate/);
    assert.match(complete.capabilities.synchronousStop,/enforcement is not established/);
    const plain=await runHook(doctor,'',{args});
    assert.equal(plain.code,0,plain.stderr);
    for(const label of ['Worker lifecycle:','Owner lifecycle:','Synchronous Stop:']) assert.ok(plain.stdout.includes(label));
  } finally {rimraf(p.root);}
});

test('doctor default ledger prerequisite and malformed receipt are reported', async () => {
  const p=makeProject({'read-ledger-gate':{}});
  try {
    writeJson(path.join(p.root,'.codex/hook-observations/bad.json'),{});
    const result=await runHook(doctor,'',{args:['--project',p.cwd,'--codex',path.join(p.root,'missing.exe'),'--json']});
    const report=JSON.parse(result.stdout);
    assert.ok(report.prerequisites.files.some((file)=>file.field==='ledgerFile'&&!file.exists));
    assert.equal(report.observations.receipts.length,0);
    assert.equal(report.observations.errors.length,1);
  } finally {rimraf(p.root);}
});

test('supported hooks/list exchange uses exact initialization and preserves trust/hash metadata', async () => {
  const dir=mkTemp();
  try {
    const script=writeText(path.join(dir,'protocol.mjs'), `
      import readline from 'node:readline';
      let initialized=false;
      for await(const line of readline.createInterface({input:process.stdin})) {
        const message=JSON.parse(line);
        if(message.method==='initialize') {
          if(message.params.capabilities.experimentalApi!==true||!message.params.clientInfo.name)process.exit(11);
          process.stdout.write(JSON.stringify({id:message.id,result:{}})+'\\n');
        } else if(message.method==='initialized') initialized=true;
        else if(message.method==='hooks/list') {
          if(!initialized||message.params.cwds[0]!==process.cwd())process.exit(12);
          process.stdout.write(JSON.stringify({id:message.id,result:{data:[{cwd:process.cwd(),hooks:[{enabled:true,eventName:'stop',currentHash:'sha256:abc',trustStatus:'modified',command:'node example.mjs'}],errors:[],warnings:[]}]}})+'\\n');
        } else process.exit(13);
      }
    `);
    const result=await probeHooks({file:process.execPath,args:[script]},{project:dir,timeoutMs:2000});
    assert.equal(result.support,'supported',result.error);
    assert.equal(result.data[0].hooks[0].trustStatus,'modified');
    assert.equal(result.data[0].hooks[0].currentHash,'sha256:abc');
    assert.equal(result.child.cleanup,'closed');
    assert.throws(()=>process.kill(result.child.pid,0),/ESRCH|not found|no such process/i);
  } finally {rimraf(dir);}
});

test('protocol unsupported method, malformed reply and timeout are bounded and distinguished', async () => {
  const dir=mkTemp();
  try {
    for(const [body,support,pattern] of [
      [`process.stdout.write(JSON.stringify({id:1,error:{code:-32601,message:'Method not found'}})+'\\n');`,'unsupported',/Method not found/],
      [`process.stdout.write(JSON.stringify({id:2,result:{data:[{hooks:[null],errors:[],warnings:[]}]}})+'\\n');`,'unknown',/unsupported response/],
      [`setInterval(()=>{},1000);`,'unknown',/timed out/],
    ]) {
      const script=writeText(path.join(dir,'protocol.mjs'),body);
      const result=await probeHooks({file:process.execPath,args:[script]},{project:dir,timeoutMs:250});
      assert.equal(result.support,support);assert.match(result.error,pattern);
      assert.equal(result.child.cleanup,'closed');
    }
  } finally {rimraf(dir);}
});

test('executable discovery honors explicit/CODEX_BIN priority and refuses script shims', () => {
  const env={...process.env,CODEX_BIN:process.execPath};
  assert.equal(discoverCodex(undefined,env).source,'CODEX_BIN');
  assert.equal(discoverCodex(process.execPath,env).source,'--codex');
  assert.equal(discoverCodex('codex.ps1',env).file,null);
});

test('doctor malformed config is visible while absent config remains off', async () => {
  const p = makeProject({});
  try {
    writeText(p.configFile, '{broken');
    const result = await runHook(doctor, '', {args:['--project',p.cwd,'--codex',path.join(p.root,'missing.exe'),'--json']});
    assert.equal(result.code, 0, result.stderr);
    const report=JSON.parse(result.stdout);
    assert.equal(report.project.status,'invalid'); assert.match(report.project.error,/invalid config JSON/);
    fs.unlinkSync(p.configFile);
    const absent=await runHook(doctor,'',{args:['--project',p.cwd,'--codex',path.join(p.root,'missing.exe'),'--json']});
    assert.equal(JSON.parse(absent.stdout).project.status,'off');
  } finally {rimraf(p.root);}
});
