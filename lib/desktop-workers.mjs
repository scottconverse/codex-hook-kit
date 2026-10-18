// Opt-in, read-only adapter for the observed Codex Desktop state_5 schema.
// Edge status describes the relationship; lifecycle evidence describes the task.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { resolveIn } from './config.mjs';
import { readLifecycle } from './stop-policy.mjs';
import { recordObservation } from './observations.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const MAX_WORKERS = 256;
const TAIL_BYTES = 2 * 1024 * 1024;
const lifecycleTypes = new Set(['task_started','turn_started','task_complete','turn_complete','task_aborted','turn_aborted','task_failed','turn_failed','error']);
// ErrorEvent::affects_turn_status in the observed upstream protocol. Unknown
// categories remain unknown rather than assuming a future error is terminal.
const terminalErrors=new Set(['context_window_exceeded','session_budget_exceeded','usage_limit_exceeded','rate_limit_exceeded','flex_unavailable','server_overloaded','cyber_policy','bio_policy','misalignment_policy_violation','too_many_denials','http_connection_failed','response_stream_connection_failed','internal_server_error','unauthorized','bad_request','invalid_prompt','sandbox_error','response_stream_disconnected','response_too_many_failed_attempts','other']);

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
        const info=event.payload.codex_error_info;
        const category=typeof info==='string' ? info : info && Object.keys(info)[0];
        if (event.payload.type==='error' && ['thread_rollback_failed','active_turn_not_steerable'].includes(category)) continue;
        latest = {type:event.payload.type, turn:event.payload.turn_id, timestamp:event.timestamp, position,unknownError:event.payload.type==='error' && info!=null && !terminalErrors.has(category),failed:!!event.payload.error || ['task_failed','turn_failed','error'].includes(event.payload.type)};
      }
    }
    if (!latest) return {state:'UNKNOWN',detail:'no supported lifecycle event in bounded tail'};
    const revision = digest([row.child_thread_id,latest]);
    const evidence={revision,turn:latest.turn,observedAt:latest.timestamp,source:'sqlite-state-5'};
    if(latest.unknownError) return {state:'UNKNOWN',...evidence,detail:'unrecognized error category; terminal state unsupported'};
    if (latest.failed) return {state:'FAILED',completion:revision,...evidence,detail:latest.type==='error' ? 'observed error follows upstream failed-turn replay semantics; error text omitted' : 'explicit terminal error evidence; error text omitted'};
    if (['task_complete','turn_complete'].includes(latest.type)) return {state:'FINISHED-NOT-HANDLED',completion:revision,...evidence};
    if (['task_aborted','turn_aborted'].includes(latest.type)) return {state:'INTERRUPTED',completion:revision,...evidence};
    if (row.status !== 'open') return {state:'UNKNOWN',revision,detail:'task_started with a closed or unsupported relationship status'};
    return {state:'RUNNING',...evidence,detail:'last observed task_started; current liveness unverified'};
  } catch { return {state:'UNKNOWN',detail:'rollout unreadable'}; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

function storage(section,kind,parent) {
  return path.join(resolveIn(section.cfg,section.stateDir || '.codex/desktop-worker-state'),kind,digest(parent));
}

function adoption(section,parent) {
  const file=storage(section,'adoption',parent)+'.json';
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const adoptedAt=section.adoptFrom ?? new Date().toISOString();
  if(typeof adoptedAt!=='string' || !Number.isFinite(Date.parse(adoptedAt))) throw new Error('adoptFrom must be an ISO timestamp');
  try {fs.writeFileSync(file,JSON.stringify({schema:1,parent,adoptedAt}),{flag:'wx'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
  const record=JSON.parse(fs.readFileSync(file,'utf8'));
  if(record.schema!==1 || record.parent!==parent || !Number.isFinite(Date.parse(record.adoptedAt))) throw new Error('invalid adoption record');
  return record.adoptedAt;
}

export function recordWorkerLifecycle(section,input) {
  if(!['SubagentStart','SubagentStop'].includes(input.hook_event_name)) throw new Error('unsupported lifecycle event');
  for(const key of ['session_id','agent_id','turn_id']) if(typeof input[key]!=='string' || !input[key].trim() || input[key].length>256) throw new Error('lifecycle requires bounded session_id, agent_id and turn_id');
  const parent=input.session_id;
  adoption(section,parent);
  const dir=storage(section,'events',parent);
  fs.mkdirSync(dir,{recursive:true});
  const event={schema:1,parent,id:input.agent_id,turn:input.turn_id,event:input.hook_event_name,agent:String(input.agent_type || '').slice(0,256),observedAt:new Date().toISOString()};
  const key=digest([parent,event.id,event.turn,event.event]);
  try {fs.writeFileSync(path.join(dir,key+'.json'),JSON.stringify(event),{flag:'wx'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
  return event;
}

function nativeWorkers(section,parent) {
  const dir=storage(section,'events',parent);
  let names;
  try {names=fs.readdirSync(dir).filter(name=>/^[a-f0-9]{64}\.json$/.test(name));}
  catch(error) {if(error.code==='ENOENT') return {workers:[],notices:[]};throw error;}
  if(names.length>1024) return {workers:[],notices:['UNKNOWN: native lifecycle receipt limit exceeded (1024); inspect state directory']};
  const latest=new Map();
  for(const name of names) {
    const file=path.join(dir,name);
    if(fs.statSync(file).size>4096) throw new Error('oversized lifecycle receipt');
    const event=JSON.parse(fs.readFileSync(file,'utf8'));
    if(event.schema!==1 || event.parent!==parent || typeof event.id!=='string' || !Number.isFinite(Date.parse(event.observedAt)) || !['SubagentStart','SubagentStop'].includes(event.event)) throw new Error('invalid lifecycle receipt');
    const prior=latest.get(event.id);
    if(!prior || event.observedAt>prior.observedAt || (event.observedAt===prior.observedAt && event.event==='SubagentStop')) latest.set(event.id,event);
  }
  return {workers:[...latest.values()].map(event=>({id:event.id,agent:event.agent,turn:event.turn,source:'native-hooks',observedAt:event.observedAt,revision:digest(event),...(event.event==='SubagentStop' ? {state:'STOP-OBSERVED',completion:digest(event),detail:'SubagentStop observed before final stop decision; completion unconfirmed'} : {state:'RUNNING',detail:'last observed SubagentStart; current liveness unverified'})})),notices:[]};
}

export async function desktopCapability(section) {
  const home=section.codexHome ? resolveIn(section.cfg,section.codexHome) : process.env.CODEX_HOME || path.join(os.homedir(),'.codex');
  let db;
  try {
    const {DatabaseSync}=await import('node:sqlite');
    db=new DatabaseSync(path.join(home,'state_5.sqlite'),{readOnly:true});
    db.exec('PRAGMA busy_timeout=1000');
    for(const [table,required] of [['thread_spawn_edges',['parent_thread_id','child_thread_id','status']],['threads',['id','rollout_path','updated_at','agent_path']]]) {
      const columns=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(column=>column.name));
      if(required.some(column=>!columns.has(column))) throw new Error('unsupported internal schema');
    }
    return {supported:true,source:'sqlite-state-5',schema:'observed-internal-v1',db};
  } catch {
    if(db)db.close();
    return {supported:false,source:'sqlite-state-5',detail:'UNKNOWN: Desktop state unavailable or unsupported (requires Node with node:sqlite and observed state_5 native schema)'};
  }
}

export async function desktopSnapshot(section,input={}) {
  const parent=section.parentThreadId || input.session_id;
  if(typeof parent!=='string' || !parent.trim()) return {parent:'unknown',workers:[],notices:['UNKNOWN: parentThreadId or event session_id is required']};
  let db;
  try {
    const mode=section.source || 'auto';
    if(!['auto','native-hooks','sqlite'].includes(mode)) throw new Error('unsupported source');
    const native=mode==='sqlite' ? {workers:[],notices:[]} : nativeWorkers(section,parent);
    const notices=[...native.notices];
    let workers=[...native.workers],excluded=0,capability={supported:workers.length>0,source:'native-hooks'};
    if(mode!=='native-hooks') {
      capability=await desktopCapability(section);
      db=capability.db;delete capability.db;
      if(!capability.supported) notices.push(capability.detail);
      else {
        const hours=Number(section.lookbackHours ?? 48);
        if(!Number.isFinite(hours) || hours<0) throw new Error('invalid lookback');
        const cutoff=Math.floor(Date.now()/1000-hours*3600);
        excluded=db.prepare('SELECT count(*) AS total FROM thread_spawn_edges e JOIN threads t ON t.id=e.child_thread_id WHERE e.parent_thread_id=? AND t.updated_at < ?').get(parent,cutoff).total;
        const rows=db.prepare('SELECT e.child_thread_id,e.status,t.rollout_path,t.agent_path FROM thread_spawn_edges e LEFT JOIN threads t ON t.id=e.child_thread_id WHERE e.parent_thread_id=? AND (t.updated_at >= ? OR t.updated_at IS NULL) ORDER BY e.child_thread_id LIMIT ?').all(parent,cutoff,MAX_WORKERS+1);
        if(rows.length>MAX_WORKERS) notices.push('UNKNOWN: worker limit exceeded; showing first 256 children');
        const nativeIndex=new Map(workers.map((worker,index)=>[worker.id,index]));
        for(const row of rows.slice(0,MAX_WORKERS)) {
          const result=lifecycle(row),index=nativeIndex.get(row.child_thread_id);
          if(index===undefined) workers.push({id:row.child_thread_id,agent:row.agent_path || '',edge:row.status,...result});
          else {
            const prior=workers[index];
            if(prior.state==='STOP-OBSERVED' && result.completion && result.turn===prior.turn && Date.parse(result.observedAt)>=Date.parse(prior.observedAt)) {
              workers[index]={...prior,...result,source:'native-hooks+sqlite-state-5',nativeRevision:prior.revision,detail:(result.detail ? result.detail+'; ' : '')+'native stop corroborated by same-turn terminal evidence'};
            }
          }
        }
      }
    } else if(!workers.length) notices.push('UNKNOWN: no native SubagentStart/SubagentStop receipt for this parent; runtime delivery not established');
    if(workers.length>MAX_WORKERS) {workers=workers.slice(0,MAX_WORKERS);notices.push('UNKNOWN: combined worker limit exceeded');}
    const adoptedAt=adoption(section,parent);
    let handled={};
    try {handled=JSON.parse(fs.readFileSync(resolveIn(section.cfg,section.handledFile || '.codex/desktop-worker-handled.json'),'utf8')) || {};} catch {}
    for(const worker of workers) {
      if(worker.completion && handled[worker.id]===worker.completion) worker.state='HANDLED';
      else if(worker.completion && Date.parse(worker.observedAt)<Date.parse(adoptedAt)) {
        worker.originalState=worker.state;worker.state='ADOPTED-HISTORY';worker.detail='terminal evidence predates adoption; not newly unhandled or acknowledged';
      }
    }
    workers.sort((a,b)=>a.id.localeCompare(b.id));
    return {parent,workers,notices,excluded,adoptedAt,capability};
  } catch(error) {return {parent,workers:[],notices:['UNKNOWN: native worker state could not be read or adoption persisted; verify stateDir, adoptFrom and source']};}
  finally {if(db)db.close();}
}

export function desktopReport(snapshot) {
  return [...(snapshot.adoptedAt ? ['Worker monitoring adopted from '+snapshot.adoptedAt+'.'] : []),...(snapshot.capability?.supported && snapshot.capability.source==='sqlite-state-5' ? ['Compatibility capability: observed internal state_5 schema; not a public interface.'] : []),...snapshot.notices,...(snapshot.excluded ? [snapshot.excluded+' historical child edges excluded by lookback (not acknowledged).'] : []),...snapshot.workers.map(w => `${w.state} ${w.id}${w.agent ? ' ('+w.agent+')' : ''}${w.source ? ' source='+w.source : ''}${w.originalState ? ' originalState='+w.originalState : ''}${w.completion ? ' completion='+w.completion : ''}${w.detail ? ': '+w.detail : ''}`)].join('\n') || 'No native child workers found for this parent.';
}

// Atomic, project-local claim. No writes to Codex home. Repeated Stop events for
// unchanged evidence cannot recursively force another continuation.
export function claimDesktopNotice(section, snapshot) {
  const pending = snapshot.notices.length || snapshot.workers.some(w => !['HANDLED','ADOPTED-HISTORY'].includes(w.state));
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
  const suppressed=()=>{const state=readLifecycle(section.cfg.dir,input);return state.paused || state.answerOnly;};
  if(suppressed()) return;
  const minutes = Number(section.minutes ?? 20);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 25) {
    process.stdout.write(JSON.stringify({systemMessage:'UNKNOWN: Desktop delayed report minutes must be between 0 and 25.'}));
    return;
  }
  // Establish adoption when arming, before workers can finish during the delay.
  await desktopSnapshot(section,input);
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
    if(suppressed()) return;
    if(section.cfg.config?.diagnostics?.enabled === true) recordObservation(section.cfg.dir,'delayed-report-emitted',input);
    process.stdout.write(JSON.stringify({systemMessage:desktopReport(await desktopSnapshot(section,input))+'\nCodex delayed report only: this hook cannot wake an idle chat.'}));
  } finally { if(fd!==undefined) fs.closeSync(fd); fs.unlinkSync(lock); }
}
