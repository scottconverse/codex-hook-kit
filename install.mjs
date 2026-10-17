#!/usr/bin/env node
// Install the codex-hook-kit onto this machine.
//
//   node install.mjs [--dry-run] [--config-dir <dir>]
//
// Copies hooks/ and lib/ into <settings folder>/codex-hook-kit/, then merges the kit's
// hook entries into <settings folder>/hooks.json. Every other hook and setting
// in that file is left untouched, and a backup is written first.
//
// Settings folder, in order: --config-dir, $CODEX_HOME, <home>/.codex.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHookEntries } from "./lib/hook-entries.mjs";
import { backupSettings, mergeHookEntries, readSettings, writeSettings, countKitCommands } from "./lib/settings.mjs";

const REPO = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { dryRun: false, configDir: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--config-dir") {
      out.configDir = argv[++i];
      if (!out.configDir) fail("--config-dir needs a folder");
    } else if (a.startsWith("--config-dir=")) out.configDir = a.slice("--config-dir=".length);
    else if (a === "-h" || a === "--help") {
      console.log("usage: node install.mjs [--dry-run] [--config-dir <dir>]");
      process.exit(0);
    } else fail("unknown argument: " + a);
  }
  return out;
}

function fail(message) {
  process.stderr.write("install: " + message + "\n");
  process.exit(1);
}

function settingsDir(configDir) {
  if (configDir) return path.resolve(configDir);
  if (process.env.CODEX_HOME) return path.resolve(process.env.CODEX_HOME);
  return path.join(os.homedir(), ".codex");
}

// Copy hooks/ and lib/ into <dest>/hook-kit/, overwriting older copies.
// Returns the list of files written.
function copyKit(dest) {
  const written = [];
  for (const sub of ["hooks", "lib"]) {
    const src = path.join(REPO, sub);
    if (!fs.existsSync(src)) fail("missing " + src + " (run install.mjs from the repo root)");
    const to = path.join(dest, sub);
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      const from = path.join(src, name);
      if (!fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, path.join(to, name));
      written.push(path.join(sub, name).split(path.sep).join("/"));
    }
  }
  return written;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = settingsDir(args.configDir);
  const kitDir = path.join(dir, "codex-hook-kit");
  const settingsFile = path.join(dir, "hooks.json");
  const entries = buildHookEntries(kitDir);

  const { settings } = readSettings(settingsFile);
  const before = countKitCommands(settings.hooks || {});
  const merged = { added: 0, removed: 0 };
  // Copy the file's settings and merge into the copy, so the dry run changes
  // nothing even in memory.
  const next = JSON.parse(JSON.stringify(settings));
  const counts = mergeHookEntries(next, entries);
  merged.added = counts.added;
  merged.removed = counts.removed;

  if (args.dryRun) {
    console.log("install: DRY RUN, nothing written");
    console.log("  settings folder: " + dir.split(path.sep).join("/"));
    console.log("  would copy hooks/ and lib/ to " + kitDir.split(path.sep).join("/"));
    console.log("  would back up " + settingsFile.split(path.sep).join("/") + " (if it exists)");
    console.log("  would remove " + merged.removed + " old kit hook(s) and add " + merged.added + " (was " + before + ")");
    console.log("---- new hooks.json ----");
    console.log(JSON.stringify(next, null, 2));
    return;
  }

  const copied = copyKit(kitDir);
  const bak = backupSettings(settingsFile);
  writeSettings(settingsFile, next);

  const fwd = (p) => p.split(path.sep).join("/");
  console.log("install: ok");
  console.log("  copied " + copied.length + " file(s) to " + fwd(kitDir));
  console.log("  settings: " + fwd(settingsFile));
  console.log("  hooks: removed " + merged.removed + " old kit hook(s), added " + merged.added + " (was " + before + ")");
  console.log("  backup: " + (bak ? fwd(bak) : "(no hooks.json existed, nothing to back up)"));
  console.log("  next: put a .codex/hook-kit.json in a project with `node init-project.mjs <dir>`");
  console.log("  activation pending: review and trust the exact hooks in Codex (/hooks in the CLI), then start a new local session. This installer does not grant hook trust or modify config.toml.");
  console.log("  wake is a delayed report only. Codex async hooks do not wake idle chats.");
}

main();
