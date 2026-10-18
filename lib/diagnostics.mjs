// Read-only diagnostics. Never execute hooks, create a model turn, or grant trust.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { findConfig, sectionFor, resolveIn } from './config.mjs';
import { isKitCommand } from './hook-entries.mjs';

export function discoverCodex(explicit, env = process.env, platform = process.platform) {
  const requested = explicit || env.CODEX_BIN;
  const names = platform === 'win32' ? ['codex.exe'] : ['codex'];
  const candidates = requested ? (path.isAbsolute(requested) || /[\\/]/.test(requested)
    ? [path.resolve(requested)]
    : String(env.PATH || env.Path || '').split(path.delimiter).flatMap((dir) =>
      (platform === 'win32' && !path.extname(requested) ? [requested + '.exe'] : [requested]).map((name) => path.join(dir, name))))
    : String(env.PATH || env.Path || '').split(path.delimiter).flatMap((dir) => names.map((name) => path.join(dir, name)));
  for (const file of candidates) {
    if (/\.(ps1|cmd|bat)$/i.test(file)) continue;
    try {
      if (!fs.statSync(file).isFile()) continue;
      fs.accessSync(file, fs.constants.X_OK);
      return { file: path.resolve(file), source: explicit ? '--codex' : env.CODEX_BIN ? 'CODEX_BIN' : 'PATH' };
    } catch {}
  }
  return { file: null, source: requested ? (explicit ? '--codex' : 'CODEX_BIN') : 'PATH',
    error: requested ? 'Codex executable not found or not directly executable: ' + requested + '. Choose the native executable, not a PowerShell/cmd shim.' : 'No directly executable Codex binary found on PATH; provide --codex or CODEX_BIN.' };
}

function versionOf(file, env, timeoutMs) {
  return new Promise((resolve) => execFile(file, ['--version'], { env, windowsHide: true, timeout: timeoutMs, maxBuffer: 16384 },
    (err, stdout) => resolve(err ? { error: err.message } : { version: stdout.trim() })));
}

function sqliteAvailable(timeoutMs) {
  return new Promise((resolve) => execFile(process.execPath, ['--no-warnings', '--input-type=module', '-e', "const {DatabaseSync}=await import('node:sqlite');process.stdout.write(typeof DatabaseSync)"], {windowsHide:true,timeout:timeoutMs,maxBuffer:16384},
    (error,stdout)=>resolve(error ? {available:false,error:error.message} : {available:stdout==='function'})));
}

// A launcher may carry fixed arguments for tests; public CLI accepts one executable.
export function probeHooks(launcher, { project, env = process.env, timeoutMs = 6000 } = {}) {
  return new Promise((resolve) => {
    let child, timer, cleanupTimer, resultPending, pending = '', received = 0, settled = false;
    const complete = (result, cleanup) => {
      if(settled)return;
      settled=true;clearTimeout(timer);clearTimeout(cleanupTimer);
      resolve({...result,child:{pid:child?.pid,cleanup}});
    };
    const finish = (result) => {
      if (settled || resultPending) return;
      resultPending=result;clearTimeout(timer);
      if (!child) {complete(result,'not-started');return;}
      child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();child.kill();
      cleanupTimer=setTimeout(()=>complete(result,'termination-pending'),1000);
    };
    try { child = spawn(launcher.file, [...(launcher.args || []), 'app-server'], { cwd: project, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (err) { finish({ support: 'unknown', error: err.message }); return; }
    timer = setTimeout(() => finish({ support: 'unknown', error: 'hooks/list probe timed out after ' + timeoutMs + 'ms' }), timeoutMs);
    child.on('error', (err) => finish({ support: 'unknown', error: err.message }));
    child.on('close', (code) => complete(resultPending || { support: 'unknown', error: 'Diagnostic app-server exited before hooks/list completed (code ' + code + ')' },'closed'));
    child.stdin.on('error', (err) => finish({ support: 'unknown', error: 'Diagnostic app-server input failed: ' + err.message }));
    child.stdout.setEncoding('utf8');
    const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
    // Drain stderr but never expose runtime logs or assistant content in the report.
    child.stderr.on('data', (chunk) => { received += chunk.length; if (received > 2 * 1024 * 1024) finish({ support: 'unknown', error: 'Diagnostic app-server output exceeded 2 MiB' }); });
    child.stdout.on('data', (chunk) => {
      received += chunk.length;
      if (received > 2 * 1024 * 1024) { finish({ support: 'unknown', error: 'Diagnostic app-server output exceeded 2 MiB' }); return; }
      pending += chunk.toString('utf8');
      let end;
      while (!settled && !resultPending && (end = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        if (!line.trim()) continue;
        let message;
        try { message = JSON.parse(line); }
        catch { finish({ support: 'unknown', error: 'Diagnostic app-server returned non-JSON protocol output' }); return; }
        if (message.id !== 1 && message.id !== 2) continue;
        if (message.error) {
          finish({ support: message.error.code === -32601 ? 'unsupported' : 'unknown', error: String(message.error.message || 'RPC error') }); return;
        }
        if (message.id === 1) {
          send({ method: 'initialized' });
          send({ id: 2, method: 'hooks/list', params: { cwds: [project] } });
        } else {
          const data = message.result?.data;
          if (!Array.isArray(data) || data.some((entry) => !entry || typeof entry.cwd !== 'string' || !Array.isArray(entry.hooks) || !Array.isArray(entry.errors) || !Array.isArray(entry.warnings) || entry.hooks.some((hook) => !hook || typeof hook.enabled !== 'boolean' || typeof hook.eventName !== 'string' || typeof hook.currentHash !== 'string' || typeof hook.trustStatus !== 'string'))) {
            finish({ support: 'unknown', error: 'hooks/list returned an unsupported response shape' }); return;
          }
          finish({ support: 'supported', data });
        }
      }
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'codex_hook_kit_doctor', version: '1.0.0' }, capabilities: { experimentalApi: true } } });
  });
}

const HOOKS = ['inject-rules','goal-lifecycle','worker-lifecycle','deploy-gate','walk-brief-guard','read-ledger-gate','db-write-guard','no-idle','double-check','measure-gate','completion-gate','delayed-report','wake','diagnostics','stop-policy'];
const FILE_FIELDS = ['rulesFile','ledgerFile','evidenceFile','authorizationFile','okFile','receiptFile'];
const DIRECTORY_FIELDS = ['runsDir','repoDir','receiptDir','codexHome'];
function projectInfo(project) {
  const files = [], errors = [], sections = {};
  let cfg;
  try {
    cfg = findConfig(project);
    if (!cfg) return { project: { status: 'off', requested: project, root: null, configFile: null }, files, sections };
    for (const name of HOOKS) {
      try {
        const section = sectionFor(cfg, name);
        sections[name] = section ? 'enabled' : 'off';
        if (!section) continue;
        for (const field of [...FILE_FIELDS, ...DIRECTORY_FIELDS, 'taskReadingFiles', 'upstreamRoots', 'codeDirs']) {
          const value = field === 'ledgerFile' && name === 'read-ledger-gate' ? section[field] || '.codex/READ-LEDGER.md' : section[field];
          if (value === undefined) continue;
          const entries = Array.isArray(value) ? value : [value];
          for (const entry of entries) {
            if (typeof entry !== 'string') { errors.push(name + '.' + field + ' must contain path strings'); continue; }
            const file = resolveIn(cfg, entry);
            let exists = false;
            try { const stat=fs.statSync(file); exists = DIRECTORY_FIELDS.includes(field) || ['upstreamRoots','codeDirs'].includes(field) ? stat.isDirectory() : stat.isFile(); } catch {}
            files.push({ hook: name, field, path: file, exists });
          }
        }
      } catch (err) { errors.push(err.message); sections[name] = 'invalid'; }
    }
    return { project: { status: errors.length ? 'invalid' : cfg.config.enabled === false ? 'off' : 'configured', requested: project, root: cfg.dir, configFile: cfg.file, sections, errors }, files, cfg };
  } catch (err) {
    return { project: { status: 'invalid', requested: project, root: null, configFile: null, error: err.message }, files };
  }
}

function observations(root) {
  const receipts = [], errors = [];
  const directory = root ? path.join(root, '.codex/hook-observations') : null;
  if (directory) {
    try {
      const names = fs.readdirSync(directory).filter((name) => name.endsWith('.json'));
      if (names.length > 256) errors.push('Only the first 256 receipt files were read.');
      for (const name of names.slice(0, 256)) {
        try {
          const file=path.join(directory,name);
          if(fs.statSync(file).size>65536) throw Error('receipt exceeds 64 KiB');
          const row=JSON.parse(fs.readFileSync(file,'utf8'));
          if(!row || !['hook','event','time'].every((key)=>typeof row[key]==='string'&&row[key])) throw Error('invalid invocation receipt metadata');
          receipts.push({ hook: row.hook, event: row.event, time: row.time, tool: row.tool, provenance: row.provenance || 'unverified local receipt', delivery: 'not established by this receipt' });
        } catch (err) { errors.push(name + ': ' + err.message); }
      }
    } catch (err) { if (err.code !== 'ENOENT') errors.push(err.message); }
  }
  return { directory, receipts, errors, limitation: 'Invocation/emission receipts only; replay cannot be excluded. Desktop delivery is not established.' };
}

function lifecycleCapabilities(receipts) {
  const invoked = (hook,event) => receipts.some((row)=>row.hook===hook && row.event===event);
  const workerEvents = ['SubagentStart','SubagentStop'];
  const workerSeen = workerEvents.some((event)=>invoked('worker-lifecycle',event));
  const stopHooks = ['no-idle','double-check','measure-gate','completion-gate'].filter((hook)=>invoked(hook,'Stop'));
  const limitation = '; replay cannot be excluded; runtime enforcement is not established by invocation receipts';
  return {
    workerLifecycle: (workerSeen ? 'Recorded worker-lifecycle invocations: ' : 'unverified worker-lifecycle invocation: ')
      + workerEvents.map((event)=>event+': '+(invoked('worker-lifecycle',event)?'recorded':'unverified')).join('; ')+limitation,
    ownerLifecycle: (invoked('goal-lifecycle','UserPromptSubmit') ? 'Recorded goal-lifecycle UserPromptSubmit invocation' : 'unverified until goal-lifecycle UserPromptSubmit invocation is recorded')+limitation,
    synchronousStop: (stopHooks.length ? 'Recorded synchronous Stop hook invocation: '+stopHooks.join(', ') : 'unverified until a synchronous Stop hook invocation is recorded')+limitation,
  };
}

export async function diagnose({ project = process.cwd(), configDir, codex, timeoutMs = 6000 } = {}) {
  project = path.resolve(project);
  configDir = path.resolve(configDir || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  const env = { ...process.env, CODEX_HOME: configDir };
  const binary = discoverCodex(codex, env);
  const [major, minor] = process.versions.node.split('.').map(Number);
  const runtime = { node: { executable: process.execPath, version: process.versions.node, minimum: '22.13.0', supported: major > 22 || major === 22 && minor >= 13 }, codex: binary, configDir, limitation: 'The tested binary is not necessarily the binary used by the running Desktop app.' };
  runtime.node.sqlite=await sqliteAvailable(timeoutMs);
  const info = projectInfo(project);
  let hooks = { support: 'unavailable', error: binary.error };
  if (binary.file) {
    runtime.codex = { ...binary, ...await versionOf(binary.file, env, timeoutMs) };
    hooks = await probeHooks(binary, { project, env, timeoutMs });
  }
  if(hooks.data) {
    hooks.unrelatedCount=hooks.data.reduce((count,entry)=>count+entry.hooks.filter((hook)=>!isKitCommand(hook.command)).length,0);
    hooks.data=hooks.data.map((entry)=>({...entry,hooks:entry.hooks.filter((hook)=>isKitCommand(hook.command))}));
  }
  const registrations = (hooks.data || []).flatMap((entry) => entry.hooks.map((hook) => ({ cwd: entry.cwd, event: hook.eventName, command: hook.command, enabled: hook.enabled, trustStatus: hook.trustStatus, currentHash: hook.currentHash, sourcePath: hook.sourcePath, kit: true })));
  const kit = registrations.filter((entry) => entry.kit);
  const trust = { status: hooks.support !== 'supported' ? 'unknown' : !kit.length ? 'not-registered' : kit.some((hook) => !['trusted','managed'].includes(hook.trustStatus)) ? 'needs-review' : 'trusted-current', registrations,
    limitation: 'Trust and currentHash come from this hooks/list probe. Registration and trust do not prove invocation or Desktop delivery.' };
  const observed = observations(info.project.root);
  return { runtime, hooks, trust, project: info.project, prerequisites: { files: info.files, limitation: 'Missing paths are reported, not created or authorized; optional receipts may not exist yet.' }, observations: observed,
    capabilities: { ...lifecycleCapabilities(observed.receipts), goalToolInterception: observed.receipts.some((row)=>['create_goal','get_goal','update_goal'].includes(row.tool)) ? 'Recorded goal-tool hook invocation exists; replay cannot be excluded and native interception is not independently established.' : 'unverified until the running Desktop emits matching goal-tool hook receipts', asyncDelivery: 'unverified; emission receipts do not establish delivery', idleResumption: 'unsupported by asynchronous hooks; delayed reports do not resume an idle chat' } };
}
