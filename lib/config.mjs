// Per-project config for the hook kit.
// Finds the nearest .codex/hook-kit.json walking up from the hook event's cwd.
// No config file anywhere up the tree = every hook does nothing (exit 0).
import fs from "node:fs";
import path from "node:path";
import { normalizeInput } from "./tool-input.mjs";

export const CONFIG_NAME = "hook-kit.json";
let activeEvent = '';

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
      let config = null;
      try {
        config = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        config = null; // unreadable config: treat as absent, hook does nothing
      }
      if (config && typeof config === "object") return followProjectConfig({ dir, file, config });
      return null;
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
    if (!Object.hasOwn(cfg.config, 'projectConfig')) return cfg;
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
  const s = cfg.config[name];
  if (!s || typeof s !== "object") return null;
  if (s.enabled === false) return null;
  return s;
}

// One call that does the whole lookup: read stdin, find the config, return
// { input, cfg, section }. section is null when the kit or this hook is off.
export function load(hookName, input) {
  let cfg;
  try { cfg = findConfig(cwdFrom(input)); }
  catch (err) { block('BLOCKED by hook-kit configuration: ' + err.message); }
  const section = sectionFor(cfg, hookName);
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

// Compile a regex string from config. Bad pattern = hook does nothing.
export function rx(pattern, flags) {
  try {
    return pattern ? new RegExp(pattern, flags) : null;
  } catch {
    return null;
  }
}

// An "exit 2 with a message on stderr" block, or nothing at all.
export function block(message) {
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
