// Per-project config for the hook kit.
// Finds the nearest .codex/hook-kit.json walking up from the hook event's cwd.
// No config file anywhere up the tree = every hook does nothing (exit 0).
import fs from "node:fs";
import path from "node:path";
import { normalizeInput } from "./tool-input.mjs";
import { gateStop, readLifecycle } from './stop-policy.mjs';
import { recordObservation } from './observations.mjs';

export const CONFIG_NAME = "hook-kit.json";
let activeEvent = '';
let activeContext;

// Read the hook's JSON stdin. Returns {} when stdin is empty or not JSON.
// Never throws: a hook with no stdin is a hook that does nothing, not a crash.
export function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// The directory the hook should treat as the project. Codex sends cwd on
// the events we use; process.cwd() is the fallback when it is absent.
// UNVERIFIED: that every event's stdin actually carries cwd. Hence the fallback.
export function cwdFrom(input) {
  const c = input && typeof input.cwd === "string" ? input.cwd : "";
  return c || process.cwd();
}

// Walk up from startDir to the filesystem root, nearest ancestor wins.
// Returns { dir, file, config } or null.
export function findConfig(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  for (;;) {
    const file = path.join(dir, ".codex", CONFIG_NAME);
    if (fs.existsSync(file)) {
      let raw;
      try { raw = fs.readFileSync(file, 'utf8'); }
      catch (err) { throw new Error('cannot read config ' + file + ': ' + err.message); }
      let config;
      try { config = JSON.parse(raw); }
      catch { throw new Error('invalid config JSON: ' + file); }
      if (!isObject(config)) throw new Error('invalid config (expected an object): ' + file);
      return followProjectConfig({ dir, file, config });
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// A mapping delegates the whole configuration; the mapped file's project owns
// relative paths. Never silently disable hooks when an explicit mapping is broken.
function followProjectConfig(cfg) {
  const seen = new Set();
  for (;;) {
    const real = fs.realpathSync(cfg.file);
    const key = process.platform === 'win32' ? real.toLowerCase() : real;
    if (seen.has(key)) throw new Error('projectConfig mapping cycle: ' + cfg.file);
    seen.add(key);
    validateEnabled(cfg.config, cfg.file);
    if (cfg.config.enabled === false || !Object.hasOwn(cfg.config, 'projectConfig')) return cfg;
    const mapped = cfg.config.projectConfig;
    if (typeof mapped !== 'string' || !path.isAbsolute(mapped)) {
      throw new Error('projectConfig must be an absolute path in ' + cfg.file);
    }
    let raw;
    try { raw = fs.readFileSync(mapped, 'utf8'); }
    catch (err) { throw new Error('cannot read mapped config ' + mapped + ': ' + err.message); }
    let config;
    try { config = JSON.parse(raw); }
    catch { throw new Error('invalid mapped config JSON: ' + mapped); }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('invalid mapped config (expected an object): ' + mapped);
    }
    const parent = path.dirname(mapped);
    const dir = path.basename(parent).toLowerCase() === '.codex' ? path.dirname(parent) : parent;
    cfg = { dir, file: mapped, config };
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function validateEnabled(value, label) {
  if (Object.hasOwn(value, 'enabled') && typeof value.enabled !== 'boolean') {
    throw new Error(label + '.enabled must be a boolean');
  }
}

function validateRegexes(value, label) {
  for (const [key, field] of Object.entries(value)) {
    const location = label + '.' + key;
    if (/Pattern$/.test(key) || ['pattern', 'requireMatch', 'reportMustContain'].includes(key)) {
      if (typeof field !== 'string') throw new Error(location + ' regex must be a string');
      try { new RegExp(field); }
      catch (err) { throw new Error(location + ' is an invalid regex: ' + err.message); }
    } else if (key === 'skipPatterns') {
      if (!Array.isArray(field)) throw new Error(location + ' must be an array of regex strings');
      for (const pattern of field) validateRegexes({ pattern }, location);
    } else if (['bannedPatterns', 'requiredLines', 'requiredSections'].includes(key)) {
      if (!Array.isArray(field)) throw new Error(location + ' must be an array');
      for (const item of field) {
        if (!isObject(item)) throw new Error(location + ' entries must be objects');
        validateRegexes(item, location);
      }
    } else if (isObject(field)) validateRegexes(field, location);
    else if (Array.isArray(field)) {
      for (const item of field) if (isObject(item)) validateRegexes(item, location);
    }
  }
}

function validateLedgerPaths(section) {
  if (Object.hasOwn(section, 'ledgerFile') && (typeof section.ledgerFile !== 'string' || !section.ledgerFile.trim())) {
    throw new Error('read-ledger-gate.ledgerFile must be a nonempty path string');
  }
  for (const key of ['upstreamRoots', 'taskReadingFiles']) {
    if (!Object.hasOwn(section, key)) continue;
    if (!Array.isArray(section[key]) || section[key].some((p) => typeof p !== 'string' || !p.trim())) {
      throw new Error('read-ledger-gate.' + key + ' must be an array of nonempty path strings');
    }
  }
}

// Small checks for controls actually consumed by the kit; unknown extension keys stay valid.
function validateControls(section, label) {
  const numbers = {
    minEntries:[0,Infinity,true], minLines:[0,Infinity,true], minToolCalls:[0,Infinity,true],
    maxBlocks:[1,Infinity,true], maxDepth:[1,Infinity,true], maxContinuations:[0,10,true],
    port:[1,65535,true], defaultPort:[1,65535,true], minutes:[0,Infinity,false],
    quietMinutes:[0,Infinity,false], lookbackHours:[0,Infinity,false], okMinutes:[0,Infinity,false],
    waiterFreshMinutes:[0,Infinity,false], maxFailures:[1,Infinity,true], maxMinutes:[Number.MIN_VALUE,Infinity,false],
    timeoutMs:[1,Infinity,true], startLine:[1,Infinity,true], endLine:[1,Infinity,true], min:[0,Infinity,true],
  };
  for(const [key,[minimum,maximum,integer]] of Object.entries(numbers)) {
    if(!Object.hasOwn(section,key))continue;
    const value=section[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<minimum||value>maximum||(integer&&!Number.isInteger(value))) {
      throw new Error(label+'.'+key+' must be a finite '+(integer?'integer':'number')+' in range '+minimum+'..'+maximum);
    }
  }
  for(const key of ['requireExisting','verifyLines','requireTargetCoverage','onlyFullBody']) {
    if(Object.hasOwn(section,key)&&typeof section[key]!=='boolean') throw new Error(label+'.'+key+' must be a boolean');
  }
  for(const key of ['mustMention','upstreamRoots','taskReadingFiles','codeDirs','databases','hosts','logNames','checklist','requiredIds','inputs','waiterCheckArgs','args']) {
    if(Object.hasOwn(section,key)&&(!Array.isArray(section[key])||section[key].some((value)=>typeof value!=='string'))) {
      throw new Error(label+'.'+key+' must be an array of strings');
    }
  }
  if(Object.hasOwn(section,'check')) {
    if(!isObject(section.check)) throw new Error(label+'.check must be an object');
    validateControls(section.check,label+'.check');
  }
  for(const key of ['bannedPatterns','requiredLines','requiredSections','requiredKeys','reuse']) {
    if(!Object.hasOwn(section,key))continue;
    if(!Array.isArray(section[key])) throw new Error(label+'.'+key+' must be an array');
    for(const row of section[key]) {
      if(!isObject(row)) throw new Error(label+'.'+key+' entries must be objects');
      validateControls(row,label+'.'+key);
    }
  }
}

// Resolve a path found in config. Relative paths are relative to cfg.dir, the
// project folder that holds .codex/, so a config can use short project-relative paths.
export function resolveIn(cfg, p) {
  if (!p) return "";
  return path.isAbsolute(p) ? p : path.resolve(cfg.dir, p);
}

// The section for one hook, or null when the section is missing (hook off).
export function sectionFor(cfg, name) {
  if (!cfg || !cfg.config) return null;
  if (cfg.config.enabled === false) return null;
  if (!Object.hasOwn(cfg.config, name)) return null;
  const s = cfg.config[name];
  if (!isObject(s)) throw new Error(name + ' section must be an object (use enabled:false to disable)');
  validateEnabled(s, name);
  if (s.enabled === false) return null;
  validateControls(s,name);
  validateRegexes(s, name);
  if (name === 'read-ledger-gate') validateLedgerPaths(s);
  return s;
}

// One call that does the whole lookup: read stdin, find the config, return
// { input, cfg, section }. section is null when the kit or this hook is off.
export function load(hookName, input) {
  let cfg;
  let section;
  try {
    cfg = findConfig(cwdFrom(input));
    activeContext = cfg ? {root:cfg.dir,config:cfg.config,input,hookName} : undefined;
    const diagnostics=sectionFor(cfg,'diagnostics');
    sectionFor(cfg,'stop-policy');
    if(cfg && activeEvent==='Stop') {
      const lifecycle=readLifecycle(cfg.dir,input);
      if(lifecycle.paused || lifecycle.answerOnly) process.exit(0);
    }
    if(diagnostics?.enabled === true) recordObservation(cfg.dir,hookName,input);
    section = sectionFor(cfg, hookName);
  } catch (err) { configurationError(err.message); }
  // Every hook resolves its paths with resolveIn(section.cfg, ...). Carry the
  // config's location on the section (not enumerable, so it never shows up in
  // a JSON dump of the section) so relative paths resolve against the project
  // folder (cfg.dir) instead of crashing on an undefined cfg.
  if (section) Object.defineProperty(section, "cfg", { value: cfg, enumerable: false });
  return { input, cfg, section };
}

// Convenience: load from stdin in one line.
export function loadFromStdin(hookName) {
  const input = normalizeInput(readStdin());
  activeEvent = input.hook_event_name || '';
  return load(hookName, input);
}

export function configurationError(message) {
  block('BLOCKED by hook-kit configuration: ' + message);
}

// Optional absent/empty patterns stay off; malformed configured patterns are visible.
export function rx(pattern, flags) {
  if (pattern === undefined || pattern === null || pattern === '') return null;
  if (typeof pattern !== 'string') configurationError('regex pattern must be a string');
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    configurationError('invalid regex pattern ' + JSON.stringify(pattern) + ': ' + err.message);
  }
}

// An "exit 2 with a message on stderr" block, or nothing at all.
export function block(message) {
  if(activeEvent === 'Stop' && process.argv.includes('--codex')) {
    const out=activeContext ? gateStop(activeContext,message) : {systemMessage:message+'; continuation suppressed because configuration is unavailable.'};
    if(out) process.stdout.write(JSON.stringify(out));
    process.exit(0);
  }
  if (process.argv.includes('--codex')) {
    const out = activeEvent === 'PreToolUse'
      ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: message } }
      : { decision: 'block', reason: message };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  }
  process.stderr.write(message.replace(/\s*$/, "") + "\n");
  process.exit(2);
}
