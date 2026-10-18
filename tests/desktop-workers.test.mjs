import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { desktopSnapshot, recordWorkerLifecycle, claimDesktopNotice } from '../lib/desktop-workers.mjs';
import { load } from '../lib/config.mjs';
import { HOOKS, makeProject, rimraf, runHook, writeJson, writeText } from './helpers.mjs';

function fixture(section = {}) {
  const p = makeProject({ 'no-idle': { backend: 'codex-desktop', codexHome: 'home', adoptFrom:'2026-10-18T00:00:00Z', ...section } });
  fs.mkdirSync(path.join(p.root, 'home'));
  const db = new DatabaseSync(path.join(p.root, 'home', 'state_5.sqlite'));
  db.exec('CREATE TABLE thread_spawn_edges(parent_thread_id TEXT,child_thread_id TEXT,status TEXT); CREATE TABLE threads(id TEXT,rollout_path TEXT,updated_at INTEGER,agent_path TEXT)');
  const log = path.join(p.root, 'worker.jsonl');
  db.prepare('INSERT INTO threads VALUES(?,?,?,?)').run('child', log, Math.floor(Date.now()/1000), '/root/worker');
  db.prepare('INSERT INTO thread_spawn_edges VALUES(?,?,?)').run('parent','child','open'); db.close();
  const append = (type, turn = 'one', extra = {}, timestamp = '2026-10-18T12:00:00Z') => fs.appendFileSync(log, JSON.stringify({timestamp, type:'event_msg',payload:{type,turn_id:turn,...extra}})+'\n');
  writeText(log, '');
  const run = () => runHook(path.join(HOOKS, 'no-idle.mjs'), {cwd:p.cwd, session_id:'parent',hook_event_name:'Stop'}, {args:['--codex']});
  return {...p, log, append, run};
}

test('native completion is reported once per unchanged snapshot and old acknowledgement cannot hide a later completion', async () => {
  const p = fixture();
  try {
    p.append('task_started'); p.append('task_complete');
    const first = await p.run(); assert.match(first.stdout, /FINISHED-NOT-HANDLED/);
    const token = JSON.parse(first.stdout).reason.match(/completion=([a-f0-9]+)/)[1];
    const second = await p.run(); assert.doesNotMatch(second.stdout, /"decision":"block"/);
    writeJson(path.join(p.root,'.codex','desktop-worker-handled.json'), {child:token});
    const {section} = load('no-idle',{cwd:p.cwd});
    assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'HANDLED');
    p.append('task_started','two'); p.append('task_complete','two');
    assert.match((await p.run()).stdout, /FINISHED-NOT-HANDLED/);
  } finally { rimraf(p.root); }
});

test('silence with native task_started remains running, and unrelated parents are excluded', async () => {
  const p = fixture({quietMinutes:0});
  try {
    const db=new DatabaseSync(path.join(p.root,'home','state_5.sqlite'));
    db.prepare('INSERT INTO thread_spawn_edges VALUES(?,?,?)').run('other-parent','other-child','open'); db.close();
    p.append('task_started'); const result=await p.run(); assert.match(result.stdout,/RUNNING/); assert.doesNotMatch(result.stdout,/STALLED|STUCK|failed|other-child/i); }
  finally {rimraf(p.root);}
});

test('unsupported or missing rollout is explicitly unknown, with bounded continuation', async () => {
  const p = fixture();
  try { fs.unlinkSync(p.log); assert.match((await p.run()).stdout,/UNKNOWN/); assert.doesNotMatch((await p.run()).stdout,/"decision":"block"/); }
  finally {rimraf(p.root);}
});

test('native wake produces delayed information without claiming resumption', async () => {
  const p = fixture();
  try { p.append('task_complete'); writeJson(p.configFile, {wake:{backend:'codex-desktop',codexHome:'home',adoptFrom:'2026-10-18T00:00:00Z',minutes:0,parentThreadId:'parent'}}); const r=await runHook(path.join(HOOKS,'wake.mjs'),{cwd:p.cwd}); assert.match(r.stdout,/FINISHED-NOT-HANDLED/); assert.match(r.stdout,/cannot wake an idle chat/); }
  finally {rimraf(p.root);}
});


test('lookback reports historical exclusions without treating them as handled', async () => {
  const p=fixture();
  try {
    p.append('task_complete');
    const db=new DatabaseSync(path.join(p.root,'home','state_5.sqlite'));
    db.prepare('UPDATE threads SET updated_at=?').run(1); db.close();
    const {section}=load('no-idle',{cwd:p.cwd});
    const snapshot=await desktopSnapshot(section,{session_id:'parent'});
    assert.equal(snapshot.excluded,1); assert.equal(snapshot.workers.length,0);
  } finally {rimraf(p.root);}
});

test('unsupported schema and missing parent report UNKNOWN', async () => {
  const p=fixture();
  try {
    const {section}=load('no-idle',{cwd:p.cwd});
    assert.match((await desktopSnapshot(section,{})).notices.join(),/UNKNOWN/);
    const db=new DatabaseSync(path.join(p.root,'home','state_5.sqlite')); db.exec('DROP TABLE thread_spawn_edges'); db.close();
    assert.match((await desktopSnapshot(section,{session_id:'parent'})).notices.join(),/UNKNOWN/);
  } finally {rimraf(p.root);}
});

test('native wake reclaims a dead sleeper PID and respects the bounded delay', async () => {
  const p=fixture();
  try {
    p.append('task_started');
    writeJson(p.configFile,{wake:{backend:'codex-desktop',codexHome:'home',minutes:0,parentThreadId:'parent'}});
    await runHook(path.join(HOOKS,'wake.mjs'),{cwd:p.cwd});
    const notices=path.join(p.root,'.codex','desktop-worker-notices');
    const {createHash}=await import('node:crypto');
    const name='wake-'+createHash('sha256').update(JSON.stringify('parent')).digest('hex')+'.json';
    writeJson(path.join(notices,name),{pid:2147483647});
    const result=await runHook(path.join(HOOKS,'wake.mjs'),{cwd:p.cwd});
    assert.match(result.stdout,/RUNNING/); assert.equal(fs.existsSync(path.join(notices,name)),false);
    writeJson(p.configFile,{wake:{backend:'codex-desktop',codexHome:'home',minutes:30,parentThreadId:'parent'}});
    assert.match((await runHook(path.join(HOOKS,'wake.mjs'),{cwd:p.cwd})).stdout,/between 0 and 25/);
  } finally {rimraf(p.root);}
});


test('first adoption distinguishes historical completion while retaining running and new completion', async () => {
 const p=fixture({adoptFrom:undefined}); try {
 p.append('task_complete'); const {section}=load('no-idle',{cwd:p.cwd});
 const first=await desktopSnapshot(section,{session_id:'parent'});
 assert.equal(first.workers[0].state,'ADOPTED-HISTORY');assert.ok(first.adoptedAt);
 p.append('task_started','current');assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'RUNNING');
 p.append('task_complete','current',{},new Date(Date.now()+1000).toISOString());
 const next=await desktopSnapshot(section,{session_id:'parent'});assert.equal(next.workers[0].state,'FINISHED-NOT-HANDLED');assert.equal(next.adoptedAt,first.adoptedAt);
 } finally {rimraf(p.root);}
});

test('terminal error completion and actual turn_aborted markers are distinguished', async () => {
 const p=fixture(); try {const {section}=load('no-idle',{cwd:p.cwd});
 p.append('task_complete','failure',{error:{message:'private error text'}});
 assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'FAILED');
 p.append('task_started','retry');p.append('turn_aborted','retry');
 assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'INTERRUPTED');
 } finally {rimraf(p.root);}
});

test('canonical delayed-report entry accepts canonical config', async () => {
 const p=fixture(); try {p.append('task_started');
 writeJson(p.configFile,{'delayed-report':{backend:'codex-desktop',codexHome:'home',minutes:0,parentThreadId:'parent'}});
 const result=await runHook(path.join(HOOKS,'delayed-report.mjs'),{cwd:p.cwd});assert.match(result.stdout,/RUNNING/);
 } finally {rimraf(p.root);}
});

test('native lifecycle evidence preferred without retaining assistant content', async () => {
 const p=fixture(); try {
 const config=JSON.parse(fs.readFileSync(p.configFile,'utf8'));config.diagnostics={enabled:true};writeJson(p.configFile,config);
 const base={cwd:p.cwd,session_id:'parent',agent_id:'child',agent_type:'worker',turn_id:'native-turn',last_assistant_message:'PRIVATE-CONTENT'};
 assert.equal((await runHook(path.join(HOOKS,'worker-lifecycle.mjs'),{...base,hook_event_name:'SubagentStart'})).code,0);
 const observations=fs.readdirSync(path.join(p.root,'.codex','hook-observations')).map(file=>JSON.parse(fs.readFileSync(path.join(p.root,'.codex','hook-observations',file),'utf8')));
 assert.ok(observations.some(receipt=>receipt.hook==='worker-lifecycle' && receipt.event==='SubagentStart'));
 const {section}=load('no-idle',{cwd:p.cwd});assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].source,'native-hooks');
 await runHook(path.join(HOOKS,'worker-lifecycle.mjs'),{...base,hook_event_name:'SubagentStop'});
 const next=await desktopSnapshot(section,{session_id:'parent'});assert.equal(next.workers[0].state,'STOP-OBSERVED');assert.doesNotMatch(JSON.stringify(next),/PRIVATE-CONTENT/);
 p.append('task_complete','native-turn',{},new Date(Date.now()+1000).toISOString());
 const corroborated=await desktopSnapshot(section,{session_id:'parent'});
 assert.equal(corroborated.workers[0].state,'FINISHED-NOT-HANDLED');
 assert.equal(corroborated.workers[0].source,'native-hooks+sqlite-state-5');
 await runHook(path.join(HOOKS,'worker-lifecycle.mjs'),{...base,turn_id:'new-native-turn',hook_event_name:'SubagentStart'});
 assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'RUNNING');
 } finally {rimraf(p.root);}
});


test('owner pause suppresses delayed reporting before arming and after waiting', async () => {
 const p=fixture(); try {
  const {lifecycleFile}=await import('../lib/stop-policy.mjs');
  const input={cwd:p.cwd,session_id:'parent',hook_event_name:'Stop'};
  const file=lifecycleFile(p.root,input);
  writeJson(p.configFile,{'delayed-report':{backend:'codex-desktop',codexHome:'home',minutes:0.006,parentThreadId:'parent'}});
  writeJson(file,{paused:true});
  assert.equal((await runHook(path.join(HOOKS,'delayed-report.mjs'),input)).stdout,'');
  writeJson(file,{paused:false});
  const pending=runHook(path.join(HOOKS,'delayed-report.mjs'),input);
  await new Promise(resolve=>setTimeout(resolve,150));writeJson(file,{paused:true});
  assert.equal((await pending).stdout,'');
 } finally {rimraf(p.root);}
});

test('report emission receipt is metadata and does not claim delivery', async () => {
 const p=fixture(); try {
  writeJson(p.configFile,{diagnostics:{enabled:true},'delayed-report':{backend:'codex-desktop',codexHome:'home',minutes:0,parentThreadId:'parent'}});
  await runHook(path.join(HOOKS,'delayed-report.mjs'),{cwd:p.cwd,session_id:'parent',hook_event_name:'Stop'});
  const dir=path.join(p.root,'.codex','hook-observations');
  const receipts=fs.readdirSync(dir).map(name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')));
  const receipt=receipts.find(r=>r.hook==='delayed-report-emitted');assert.ok(receipt);assert.match(receipt.delivery,/not established/);
 } finally {rimraf(p.root);}
});

test('native nested worker stop is corroborated by its own same-turn terminal evidence', async () => {
 const p=fixture(); try {
  const db=new DatabaseSync(path.join(p.root,'home','state_5.sqlite'));
  db.prepare('UPDATE thread_spawn_edges SET parent_thread_id=? WHERE child_thread_id=?').run('intermediate','child');db.close();
  const {section}=load('no-idle',{cwd:p.cwd});
  recordWorkerLifecycle(section,{session_id:'parent',agent_id:'child',turn_id:'nested',hook_event_name:'SubagentStop'});
  p.append('task_complete','older',{},new Date(Date.now()+1000).toISOString());
  assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'STOP-OBSERVED');
  p.append('task_complete','nested',{},new Date(Date.now()-1000).toISOString());
  assert.equal((await desktopSnapshot(section,{session_id:'parent'})).workers[0].state,'STOP-OBSERVED');
  p.append('task_complete','nested',{},new Date(Date.now()+1000).toISOString());
  const worker=(await desktopSnapshot(section,{session_id:'parent'})).workers[0];
  assert.equal(worker.state,'FINISHED-NOT-HANDLED');
  assert.equal(worker.source,'native-hooks+sqlite-state-5');
 } finally {rimraf(p.root);}
});

test('notice claims ignore handled and adopted history changes around an unchanged pending worker', () => {
 const p=fixture(); try {
  const {section}=load('no-idle',{cwd:p.cwd});
  const pending={id:'pending',state:'STOP-OBSERVED',revision:'pending-one'};
  const reviewed={id:'reviewed',state:'FINISHED-NOT-HANDLED',revision:'reviewed-one'};
  const snapshot=workers=>({parent:'parent',workers,notices:[]});
  assert.equal(claimDesktopNotice(section,snapshot([pending,reviewed])),true);
  // Reviewing another result must not prompt again about unchanged evidence.
  assert.equal(claimDesktopNotice(section,snapshot([pending,{...reviewed,state:'HANDLED'}])),false);
  assert.equal(claimDesktopNotice(section,snapshot([pending,{id:'history',state:'ADOPTED-HISTORY',revision:'history-one'}])),false);
  assert.equal(claimDesktopNotice(section,snapshot([{...pending,revision:'pending-two'}])),true);
 } finally {rimraf(p.root);}
});
