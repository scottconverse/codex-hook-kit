// Small project completion gate. It executes the agreed check, not an agent's
// handwritten PASS receipt. Local config/state remain editable, not a trust boundary.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
const bounded = (value, fallback, max) => Number.isFinite(value) && value > 0 ? Math.min(value, max) : fallback;

export function snapshot(root, s) {
  if (!Array.isArray(s.inputs) || !s.inputs.length) throw Error('inputs must name the code and acceptance check dependencies');
  const files = new Map();
  function visit(name) {
    const full = path.resolve(root, name);
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink()) throw Error('List the real input path instead of a symlink: ' + full);
    if (st.isDirectory()) {
      for (const entry of fs.readdirSync(full).sort()) {
        if (!['.git', '.codex', 'node_modules'].includes(entry)) visit(path.join(full, entry));
      }
    } else if (st.isFile()) files.set(full, hash(fs.readFileSync(full)));
  }
  for (const name of s.inputs) visit(name);
  for (const r of s.reuse || []) { visit(r.source); visit(r.destination); }
  if (!files.size) throw Error('inputs contain no files');
  return hash(JSON.stringify([s, [...files.entries()].sort(([a], [b]) => a.localeCompare(b))]));
}

export function checkReuse(root, rows = []) {
  if (!Array.isArray(rows)) throw Error('reuse must be an array');
  for (const r of rows) {
    if (!r.source || !r.destination || !Number.isInteger(r.startLine) || !Number.isInteger(r.endLine) || r.startLine < 1 || r.endLine < r.startLine || !/^[a-f0-9]{64}$/.test(r.sha256 || '')) throw Error('Invalid reuse row');
    const source = fs.readFileSync(path.resolve(root, r.source), 'utf8').replaceAll('\r\n', '\n');
    const lines = source.split('\n');
    if (r.endLine > lines.length) throw Error('Reuse range exceeds source: ' + r.source);
    const region = lines.slice(r.startLine - 1, r.endLine).join('\n');
    if (!region.trim() || hash(region) !== r.sha256) throw Error('Upstream region changed or hash is wrong: ' + r.source);
    const destination = fs.readFileSync(path.resolve(root, r.destination), 'utf8').replaceAll('\r\n', '\n');
    if (path.resolve(root, r.source) === path.resolve(root, r.destination) || !destination.includes(region)) throw Error('Declared upstream code is absent from destination: ' + r.destination);
  }
}

export function evaluate(root, s) {
  if (!s.taskId || typeof s.taskId !== 'string') return { terminal: true, reason: 'completion-gate: configure a stable taskId before using this gate' };
  const dir = path.join(root, '.codex', 'completion-state');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, hash(s.taskId) + '.json');
  let state = { failures: 0, startedAt: Date.now() };
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') return { terminal: true, reason: 'completion-gate: unreadable state; report incomplete' }; }
  const save = () => fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
  // A completed, unchanged task stays complete after its time window expires.
  if (state.passed) {
    try { if (snapshot(root, s) === state.passed) return { pass: true, cached: true }; } catch {}
  }
  const limit = Math.floor(bounded(s.maxFailures, 3, 3));
  const deadlineMs = bounded(s.maxMinutes, 60, 240) * 60000;
  if (state.stopped || state.failures >= limit || Date.now() - state.startedAt >= deadlineMs) {
    state.stopped = true; save();
    return { terminal: true, reason: 'completion-gate: INCOMPLETE; task budget exhausted. Report the unmet check. Do not reset taskId to keep trying.' };
  }
  let before;
  try {
    before = snapshot(root, s);
    if (state.passed === before) return { pass: true, cached: true };
    if (state.failed === before) throw Error(state.failureReason);
    checkReuse(root, s.reuse);
    const c = s.check;
    if (!c || typeof c.command !== 'string' || !Array.isArray(c.args) || !c.args.every(x => typeof x === 'string')) throw Error('check requires command and args; no shell is used');
    const timeout = Math.min(bounded(c.timeoutMs, 30000, 60000), Math.max(1, deadlineMs - (Date.now() - state.startedAt)));
    const result = spawnSync(c.command, c.args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 1024 * 1024 });
    // Never store command output: it may contain secrets. The operator can run
    // the same check normally when diagnostics are needed.
    if (result.error || result.status !== 0) throw Error('Acceptance command failed: ' + (result.error?.code || 'exit ' + result.status));
    if (snapshot(root, s) !== before) throw Error('Inputs changed while checking; result cannot be bound to this code');
    state.passed = before;
    state.checkedAt = new Date().toISOString();
    save();
    return { pass: true, cached: false };
  } catch (error) {
    if (before) { state.failed = before; state.failureReason = error.message; }
    state.failures += 1;
    state.stopped = state.failures >= limit;
    save();
    return { terminal: state.stopped, reason: 'completion-gate: INCOMPLETE (' + state.failures + '/' + limit + ' failed attempts). ' + error.message + '. Fix only the unmet requirement; do not add tests or change acceptance to get a pass.' };
  }
}
