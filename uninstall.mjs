#!/usr/bin/env node
// Remove the codex-hook-kit's hook entries from this machine's settings.
//
//   node uninstall.mjs [--dry-run] [--config-dir <dir>] [--remove-files]
//
// Removes only the hook entries the kit owns (same match rule as install.mjs) and
// leaves every other hook and setting alone. A backup is written first. The copied
// <settings folder>/codex-hook-kit/ files stay unless --remove-files is passed.
import fs from "node:fs";
import path from "node:path";
import { backupSettings, readSettings, removeHookEntries, writeSettings, countKitCommands } from "./lib/settings.mjs";
import { assertNodeVersion, installationTransaction, settingsDir } from './lib/installation.mjs';

function parseArgs(argv) {
  const out = { dryRun: false, removeFiles: false, configDir: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--remove-files") out.removeFiles = true;
    else if (a === "--config-dir") {
      out.configDir = argv[++i];
      if (!out.configDir) fail("--config-dir needs a folder");
    } else if (a.startsWith("--config-dir=")) out.configDir = a.slice("--config-dir=".length);
    else if (a === "-h" || a === "--help") {
      console.log("usage: node uninstall.mjs [--dry-run] [--config-dir <dir>] [--remove-files]");
      process.exit(0);
    } else fail("unknown argument: " + a);
  }
  return out;
}

function fail(message) {
  process.stderr.write("uninstall: " + message + "\n");
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assertNodeVersion();
  const dir = settingsDir(args.configDir);
  const kitDir = path.join(dir, "codex-hook-kit");
  const settingsFile = path.join(dir, "hooks.json");
  const fwd = (p) => p.split(path.sep).join("/");

  if (!fs.existsSync(settingsFile) && !(args.removeFiles && fs.existsSync(kitDir))) {
    console.log("uninstall: no hooks.json at " + fwd(settingsFile) + ", nothing to remove");
    return;
  }

  const { settings } = readSettings(settingsFile);
  const before = countKitCommands(settings.hooks || {});
  const next = JSON.parse(JSON.stringify(settings));
  const { removed } = removeHookEntries(next);

  if (args.dryRun) {
    console.log("uninstall: DRY RUN, nothing written");
    console.log("  settings: " + fwd(settingsFile));
    console.log("  would remove " + removed + " kit hook(s) (found " + before + ")");
    if (args.removeFiles) console.log("  would also delete " + fwd(kitDir));
    console.log("---- new hooks.json ----");
    console.log(JSON.stringify(next, null, 2));
    return;
  }

  const { backup, result: bak } = installationTransaction(dir, 'uninstall', () => {
    const latest = readSettings(settingsFile).settings;
    removeHookEntries(latest);
    const bak = backupSettings(settingsFile);
    if (fs.existsSync(settingsFile)) writeSettings(settingsFile, latest);
    if (args.removeFiles && fs.existsSync(kitDir)) fs.rmSync(kitDir, { recursive: true, force: true });
    return bak;
  });
  console.log("uninstall: ok");
  console.log("  removed " + removed + " kit hook(s) from " + fwd(settingsFile));
  console.log("  backup: " + (bak ? fwd(bak) : "(none)"));
  console.log('  transaction backup: ' + fwd(backup));
  if (args.removeFiles) {
    console.log("  removed " + fwd(kitDir));
  } else {
    console.log("  kept the copied files at " + fwd(kitDir) + " (pass --remove-files to delete them)");
  }
}

try { main(); } catch (error) { fail(error.message); }
