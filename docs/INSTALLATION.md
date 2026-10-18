# Installation and recovery — Codex Hook Kit 1.1.0

[Release notes](https://github.com/scottconverse/codex-hook-kit/releases/tag/v1.1.0) · [Download source ZIP](https://github.com/scottconverse/codex-hook-kit/archive/refs/tags/v1.1.0.zip). Extract the archive and open a terminal in its directory before running the commands below.

Use Node.js **22.13 or newer**, preferably Node 24. No npm packages are required.
The scripts use Node's filesystem, process, and SQLite APIs on Windows, macOS, and
Linux. Windows is exercised locally; other operating systems require their own
runtime verification before claiming a verified installation.

From the checkout:

```text
node install.mjs --dry-run
node install.mjs
node init-project.mjs /absolute/path/to/project
```

Choose another Codex settings folder with `--config-dir <folder>`. Otherwise the
installer uses `CODEX_HOME`, then the current user's `.codex` directory. Paths with
spaces are supported; quote arguments in your shell. The installer pins the exact
Node executable that ran it, so hooks do not depend on a later shell's PATH. If that
Node installation moves, rerun the installer using the replacement Node executable.
Windows installation paths containing shell expansion characters are rejected
before writing registrations rather than producing unsafe commands.
Windows registrations use PowerShell's `&` call operator before the quoted Node
path. The actual Codex 0.160 Windows hook executor was checked with that pinned
command, including a Node path containing spaces. A CMD-based hook executor is not
claimed supported by this registration form.

The installer copies `hooks/`, `lib/`, `doctor.mjs`, `rollback.mjs`, and
`uninstall.mjs` into `<settings-folder>/codex-hook-kit`. Project settings remain in
the project. `init-project` refuses to overwrite an existing configuration unless
`--force` is explicit; a forced replacement backs up the previous configuration.

Existing unrelated hooks and settings survive installation, reinstallation,
uninstallation, and rollback. Legacy `wake.mjs` registrations migrate to the
canonical `delayed-report.mjs`; the legacy script/config alias remains compatible.
The delayed report cannot start or resume an idle chat.

Installation reports whether the kit's registration changed. Review and trust the
exact new registrations through Codex's supported hook review interface (`/hooks`
where available), then refresh the intended live session as described below or start a new local session. The installer does not grant
trust, modify `config.toml`, or infer that a running Desktop session loaded the new
hooks. An unchanged registration is not proof of current hook trust or invocation.
Use `doctor.mjs` to distinguish registered hooks, runtime support, and observed
invocations; see the doctor documentation for available checks.

## Refresh an existing Desktop session

Desktop 26.1013.4894.0 with external Codex 0.160.0 retained older session configuration/trust after installation. A fresh doctor hooks/list can report current disk registrations while the open chat uses earlier handlers. Workers inherit their parent's configuration, so a new worker alone does not resolve this.

The verified procedure requires no restart:

1. Open the local project folder (File → Open Folder, or Ctrl+O on Windows).
2. Open Settings → Hooks and select the project/source containing the kit.
3. Review/trust changed definitions as needed. Toggle one existing kit hook off and back on, restoring its original enabled state.
4. Observe a harmless get_goal invocation and worker start/stop in the target chat.

The enable/trust action sends a live config/batchWrite with reloadUserConfig:true, rebuilding loaded hook runtimes. “Reload hooks” refreshes only the listing. Ordinary configuration value writes and a separately spawned app-server do not refresh the live Desktop session. The October 18 procedure produced actual goal-tool PreToolUse/PostToolUse and native SubagentStart/SubagentStop observations; see [current verification](CURRENT-VERIFICATION.md).

## Backups and rollback

Every modifying install/uninstall creates a transaction folder under
`<settings-folder>/hook-kit-backups/`, containing the prior scripts, settings, and
kit-only registrations. The printed folder identifies the exact recovery point.
Existing `hooks.json` also gets its timestamped `.bak-hookkit-*` backup. A caught
write/copy failure restores both scripts and settings before reporting failure.
Settings files are replaced through a temporary file and rename.

```text
node rollback.mjs --config-dir /absolute/settings/folder --backup /absolute/transaction/folder
node uninstall.mjs --config-dir /absolute/settings/folder
node uninstall.mjs --config-dir /absolute/settings/folder --remove-files
```

Rollback restores the previous kit scripts and registrations into the **current**
settings, preserving unrelated settings and hooks added since installation. It
creates another recovery snapshot first. A registration change requires review
again; rollback does not grant trust. An interrupted operation can be recovered
from a prepared transaction backup even if its manifest never reached `completed`.

Only one operation may modify a settings folder at a time. A competing operation
fails before changing scripts or registrations. A crash can leave
`.hook-kit-install.lock` in the settings folder; check its recorded PID and confirm
that installer process has exited before removing that exact stale lock and running
rollback. Do not run installers against an actively modified shared settings file.

By default uninstall keeps the copied files. `--remove-files` deletes the owned
installation directory after backing it up. Run rollback from the checkout (or its
saved backup) when the installed helper has been removed. Backups may include prior
settings data; keep them private and retain them until the recovery point is no
longer needed.
