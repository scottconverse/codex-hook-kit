import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { desktopSnapshot } from '../lib/desktop-workers.mjs';
import { load } from '../lib/config.mjs';
import { HOOKS, makeProject, rimraf, runHook, writeJson, writeText } from './helpers.mjs';

function fixture(section = {}) {
  const p = makeProject({ 'no-idle': { backend: 'codex-desktop', codexHome: 'home', ...section } });
  fs.mkdirSync(path.join(p.root, 'home'));
  const db = new DatabaseSync(path.join(p.root, 'home', 'state_5.sqlite'));
  db.exec('CREATE TABLE thread_spawn_edges(parent_thread_id TEXT,child_thread_id TEXT,status TEXT); CREATE TABLE threads(id TEXT,rollout_path TEXT,updated_at INTEGER,agent_path TEXT)');
  const log = path.join(p.root, 'worker.jsonl');
  db.prepare('INSERT INTO threads VALUES(?,?,?,?)').run('child', log, Math.floor(Date.now()/1000), '/root/worker');
  db.prepare('INSERT INTO thread_spawn_edges VALUES(?,?,?)').run('parent','child','open'); db.close();
  const append = (type, turn = 'one') => fs.appendFileSync(log, JSON.stringify({timestamp: '2026-10-18T12:00:00Z', type:'event_msg',payload:{type,turn_id:turn}})+'\n');
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
  try { p.append('task_complete'); writeJson(p.configFile, {wake:{backend:'codex-desktop',codexHome:'home',minutes:0,parentThreadId:'parent'}}); const r=await runHook(path.join(HOOKS,'wake.mjs'),{cwd:p.cwd}); assert.match(r.stdout,/FINISHED-NOT-HANDLED/); assert.match(r.stdout,/cannot wake an idle chat/); }
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
