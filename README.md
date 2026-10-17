# codex-hook-kit

Project-scoped hooks for local Codex sessions, ported from Scott Converse's [claude-hook-kit](https://github.com/scottconverse/claude-hook-kit). This is a code port, not a new implementation of its policy checks.

[Manual](docs/MANUAL.md) · [Handoff: finish on the real runtime](docs/HANDOFF-CODEX.md) · [Landing page](docs/index.html) · [Configuration keys](docs/CONFIG-REFERENCE.md) · [Compatibility and verification](docs/COMPATIBILITY.md) · [Suggested additions](docs/ADDITIONS.md)

## What is preserved

Nine named hooks, the same project config sections, nearest-parent lookup, opt-in behavior, relative paths, installer/uninstaller/project initializer, examples, generated registration snippet, original reference hooks and parity tests. No npm dependencies.

The original nine are now joined by one opt-in [completion gate](docs/COMPLETION.md): execute the agreed acceptance check, verify declared upstream regions, cache unchanged results, and stop bounded correction attempts honestly. It does not guarantee code quality or project completion.

The source baseline is **5371320e12ffc74c99640077ea1400fd8d86f1e8** from the local Claude kit. It was one commit ahead of origin/main. [SOURCE.json](reference/SOURCE.json) records source file hashes; [PORT.md](docs/PORT.md) identifies reused code and adaptations.

## What changes for Codex

- Project policy lives in **.codex/hook-kit.json**. Codex registration lives in **CODEX_HOME/hooks.json**, normally **~/.codex/hooks.json**. They are different files.
- Shell hooks match Codex's canonical **Bash** event. File guards also parse **apply_patch**, including multiple files, deletion and rename targets.
- Installed commands use **--codex** to emit explicit JSON denial/continuation decisions. Exit code 2 alone did not block the native CLI write in our probe; do not remove this flag.
- Measurement retries use native turn IDs and carry across Stop continuations. Successful Stop warnings are JSON.
- **wake is a delayed report, not an automatic wake-up.** Codex async hooks cannot start an idle turn. No asyncRewake claim is made.
- Hook definitions require Codex trust approval. Installation does not enable them by itself.

## Hooks

| Hook | Event | Behavior |
|---|---|---|
| inject-rules | SessionStart, UserPromptSubmit | Adds the configured rules text as context. |
| deploy-gate | PreToolUse / Bash | Checks the configured commit gate before a matched deploy. |
| walk-brief-guard | PreToolUse / Bash, apply_patch | Checks required and forbidden brief text. |
| read-ledger-gate | PreToolUse / Bash, apply_patch | Requires existing upstream files and accurate line-count rows before recognized code writes. |
| db-write-guard | PreToolUse / Bash | Blocks recognized live SQL writes without a fresh approval marker. |
| no-idle | Stop | Reports unattended completed, stalled or running workers. |
| double-check | Stop | Requests one review continuation; lets stop_hook_active pass. |
| measure-gate | Stop | Requires a receipt newer than code; ends continuation attempts at maxBlocks with an explicit stale warning. |
| wake | Stop / async | Delivers a delayed worker report at the next safe point or next user turn. |
| completion-gate | Stop | Runs one agreed acceptance command, optionally checks retained upstream code, and bounds corrections across sessions. |

**A ledger proves file existence and counts, not reading, comprehension or reuse. A recent receipt proves freshness, not truthful measurements.** These are workflow guardrails, not security boundaries.

## Install

Requires Node 18+ and a Codex runtime with command hooks. Tested Node/runtime versions and limitations are in the verification document.

```powershell
node install.mjs --dry-run
node install.mjs
node init-project.mjs C:/dev/my-project --example agent-build
```

The installer copies hooks and helpers to **<Codex home>/codex-hook-kit/** and merges eleven registrations into **hooks.json**. It backs up existing registration first, preserves unrelated entries, and is idempotent. It never edits config.toml, auth files or Claude settings.

Home precedence: **--config-dir**, then **CODEX_HOME**, then **~/.codex**.

Review the exact hook definitions in Codex (the CLI provides **/hooks**), trust them, and start a new local session. Do not use a trust-bypass flag for routine installation. Verify a blocked scratch write before relying on the gates in Desktop.

The supplied examples are **minimal**, **townreporter**, **agent-build**, and **completion**. Edit example paths before use; completion starts disabled until configured. No config means silent/off; a missing section disables that hook; enabled:false disables the entire tree or one section. The nearest config wins.

## Remove or roll back

```powershell
node uninstall.mjs --dry-run
node uninstall.mjs
node uninstall.mjs --remove-files
```

Uninstall removes only this kit's registrations. Project policy files remain. Registration backups are **hooks.json.bak-hookkit-<timestamp>**. Restoring a registration backup restores registrations, not earlier script bytes; retain an earlier kit if you need code rollback.

## Verify

```powershell
npm test
node tools/probe-codex.mjs --receipt docs/native-probe.json
node tools/probe-codex.mjs --completion
```

The tests reuse the original six parity suites and scope/installer/ledger/measurement tests, with Codex-specific protocol coverage. The optional native probe uses an isolated home and a deterministic local Responses fixture: **no real model, no account credentials copied, no live config changed**. Its explicit trust override applies only to that temporary subprocess.

Native shell denial/allowance and bounded completion Stop continuation are verified. Native apply_patch execution and Desktop UI activation are **not verified**; patch parsing/decisions are exercised directly. See [COMPATIBILITY.md](docs/COMPATIBILITY.md).

## Limits to understand

Regex-based shell guards do not parse every language or detect arbitrary hidden writes. Configurable exemptions, shell scripts, write_stdin, MCP writes and other unregistered tools may bypass policy coverage. Config corruption currently disables checks, matching the source kit. The agent can edit ordinary project policy and evidence files. Managed permissions or protected policy are required for stronger enforcement.

No code was installed into the owner's active Codex configuration as part of producing this kit. No Git commit, push or publication was made.

MIT © 2026 Scott Converse.

