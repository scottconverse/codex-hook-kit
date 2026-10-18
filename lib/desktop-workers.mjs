// Opt-in, read-only adapter for the observed Codex Desktop state_5 schema.
// Edge status describes the relationship; lifecycle evidence describes the task.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { resolveIn } from './config.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const MAX_WORKERS = 256;
const TAIL_BYTES = 2 * 1024 * 1024;
const lifecycleTypes = new Set(['task_started', 'task_complete', 'task_aborted']);

function lifecycle(row) {
  if (!row.rollout_path || !row.rollout_path.endsWith('.jsonl')) return {state:'UNKNOWN', detail:'unsupported or missing rollout format'};
  let fd;
  try {
    fd = fs.openSync(row.rollout_path, 'r');
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const data = Buffer.alloc(size - start);
    fs.readSync(fd, data, 0, data.length, start);
    const lines = data.toString('utf8').split('\n');
    let offset = start;
    if (start) offset += Buffer.byteLength(lines.shift()) + 1;
    let latest;
    for (const line of lines) {
      const position = offset;
      offset += Buffer.byteLength(line) + 1;
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); }
      catch { return {state:'UNKNOWN',detail:'rollout contains incomplete or invalid JSON in bounded tail'}; }
      if (event.type === 'event_msg' && lifecycleTypes.has(event.payload?.type)) {
        latest = {type:event.payload.type, turn:event.payload.turn_id, timestamp:event.timestamp, position};
      }
    }
    if (!latest) return {state:'UNKNOWN',detail:'no supported lifecycle event in bounded tail'};
    const revision = digest([row.child_thread_id,latest]);
    if (latest.type === 'task_complete') return {state:'FINISHED-NOT-HANDLED',completion:revision,revision};
    if (latest.type === 'task_aborted') return {state:'INTERRUPTED',revision};
    if (row.status !== 'open') return {state:'UNKNOWN',revision,detail:'task_started with a closed or unsupported relationship status'};
    return {state:'RUNNING',revision,detail:'last observed task_started; current liveness unverified'};
  } catch { return {state:'UNKNOWN',detail:'rollout unreadable'}; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

export async function desktopSnapshot(section, input = {}) {
  const parent = section.parentThreadId || input.session_id;
  if (typeof parent !== 'string' || !parent.trim()) return {parent:'unknown',workers:[],notices:['UNKNOWN: parentThreadId or event session_id is required']};
  const home = section.codexHome ? resolveIn(section.cfg, section.codexHome) : process.env.CODEX_HOME || path.join(os.homedir(),'.codex');
  let db;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(path.join(home,'state_5.sqlite'), {readOnly:true});
    db.exec('PRAGMA busy_timeout=1000');
    const hours = Number(section.lookbackHours ?? 48);
    if (!Number.isFinite(hours) || hours < 0) throw new Error('invalid lookback');
    const cutoff = Math.floor(Date.now()/1000 - hours*3600);
    const excluded = db.prepare('SELECT count(*) AS total FROM thread_spawn_edges e JOIN threads t ON t.id=e.child_thread_id WHERE e.parent_thread_id=? AND t.updated_at < ?').get(parent,cutoff).total;
    const rows = db.prepare('SELECT e.child_thread_id,e.status,t.rollout_path,t.agent_path FROM thread_spawn_edges e LEFT JOIN threads t ON t.id=e.child_thread_id WHERE e.parent_thread_id=? AND (t.updated_at >= ? OR t.updated_at IS NULL) ORDER BY e.child_thread_id LIMIT ?').all(parent,cutoff,MAX_WORKERS+1);
    let handled = {};
    try { handled = JSON.parse(fs.readFileSync(resolveIn(section.cfg, section.handledFile || '.codex/desktop-worker-handled.json'),'utf8')) || {}; } catch {}
    const notices = rows.length > MAX_WORKERS ? ['UNKNOWN: worker limit exceeded; showing first 256 children'] : [];
    const workers = rows.slice(0,MAX_WORKERS).map(row => {
      const result = lifecycle(row);
      if (result.completion && handled[row.child_thread_id] === result.completion) result.state = 'HANDLED';
      return {id:row.child_thread_id,agent:row.agent_path || '',edge:row.status,...result};
    });
    return {parent,workers,notices,excluded};
  } catch { return {parent,workers:[],notices:['UNKNOWN: Desktop state unavailable or unsupported (requires Node with node:sqlite and state_5 native schema)']}; }
  finally { if (db) db.close(); }
}

export function desktopReport(snapshot) {
  return [...snapshot.notices,...(snapshot.excluded ? [snapshot.excluded+' historical child edges excluded by lookback (not acknowledged).'] : []),...snapshot.workers.map(w => `${w.state} ${w.id}${w.agent ? ' ('+w.agent+')' : ''}${w.completion ? ' completion='+w.completion : ''}${w.detail ? ': '+w.detail : ''}`)].join('\n') || 'No native child workers found for this parent.';
}

// Atomic, project-local claim. No writes to Codex home. Repeated Stop events for
// unchanged evidence cannot recursively force another continuation.
export function claimDesktopNotice(section, snapshot) {
  const pending = snapshot.notices.length || snapshot.workers.some(w => w.state !== 'HANDLED');
  if (!pending) return false;
  const directory = resolveIn(section.cfg, section.noticeDir || '.codex/desktop-worker-notices');
  const filename = path.join(directory,digest([snapshot.parent,snapshot.workers,snapshot.notices])+'.json');
  fs.mkdirSync(directory,{recursive:true});
  let fd;
  try { fd=fs.openSync(filename,'wx'); }
  catch(error) { if(error.code==='EEXIST') return false; throw error; }
  try { fs.writeFileSync(fd,JSON.stringify({parent:snapshot.parent,reportedAt:new Date().toISOString()})); }
  finally { fs.closeSync(fd); }
  return true;
}

export async function desktopStop(section, input, block) {
  const snapshot = await desktopSnapshot(section,input);
  if (input.stop_hook_active === true) return;
  try {
    if (claimDesktopNotice(section,snapshot)) block('Native Desktop worker report (one continuation per unchanged snapshot):\n'+desktopReport(snapshot)+'\nReview native worker results or monitor running workers. Quiet time alone does not establish failure.');
  } catch {
    process.stdout.write(JSON.stringify({systemMessage:'UNKNOWN: cannot persist Desktop notice; continuation suppressed to avoid an unbounded Stop loop.\n'+desktopReport(snapshot)}));
  }
}

export async function desktopWake(section,input) {
  const minutes = Number(section.minutes ?? 20);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 25) {
    process.stdout.write(JSON.stringify({systemMessage:'UNKNOWN: Desktop delayed report minutes must be between 0 and 25.'}));
    return;
  }
  // One outstanding report per project and parent. Exclusive create avoids races.
  const directory = resolveIn(section.cfg,section.noticeDir || '.codex/desktop-worker-notices');
  const lock = path.join(directory,'wake-'+digest(section.parentThreadId || input.session_id || 'unknown')+'.json');
  let fd;
  // Serialize the short claim/recovery step so contenders cannot remove a new lock.
  const claim = lock+'.claim';
  try { fs.mkdirSync(directory,{recursive:true}); fs.mkdirSync(claim); }
  catch { process.stdout.write(JSON.stringify({systemMessage:'Desktop delayed report claim busy or unavailable; no automatic chat resumption.'})); return; }
  try {
    try {
      const owner=JSON.parse(fs.readFileSync(lock,'utf8'));
      let alive=true;
      if (Number.isInteger(owner.pid) && owner.pid > 0) {
        try { process.kill(owner.pid,0); } catch(error) { if(error.code==='ESRCH') alive=false; }
      }
      if (!alive) fs.unlinkSync(lock);
    } catch(error) { if(error.code!=='ENOENT') throw error; }
    fd=fs.openSync(lock,'wx');
    fs.writeFileSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
    fs.closeSync(fd); fd=undefined;
  } catch {
    if(fd!==undefined) { fs.closeSync(fd); fd=undefined; }
    process.stdout.write(JSON.stringify({systemMessage:'Desktop delayed report already armed, or lock unavailable. No automatic chat resumption.'})); return;
  } finally { fs.rmdirSync(claim); }
  try {
    await new Promise(resolve=>setTimeout(resolve,minutes*60000));
    process.stdout.write(JSON.stringify({systemMessage:desktopReport(await desktopSnapshot(section,input))+'\nCodex delayed report only: this hook cannot wake an idle chat.'}));
  } finally { if(fd!==undefined) fs.closeSync(fd); fs.unlinkSync(lock); }
}
