# codex-hook-kit

Project-scoped workflow checks for local Codex sessions, adapted from Scott Converse's [claude-hook-kit](https://github.com/scottconverse/claude-hook-kit). No npm dependencies. Policy and evidence files are editable workflow records; this kit is not an access-control sandbox.

[Manual](docs/MANUAL.md) · [Configuration](docs/CONFIG-REFERENCE.md) · [Current verification](docs/CURRENT-VERIFICATION.md) · [Compatibility](docs/COMPATIBILITY.md) · [Historical verification](docs/VERIFICATION.md) · [Provenance](docs/PORT.md)

## Install and configure

Use Node **22.13 or newer**; the SQLite compatibility adapter requires `node:sqlite`. Current testing is on **Windows, Node 24.15.0 and runtime 0.160.0**, including installed-candidate Desktop rule/review/compatibility-worker delivery and native CLI checks. Desktop lifecycle and asynchronous coverage remain limited as documented below. Windows registrations target the default PowerShell executor; customized `cmd` execution and other platforms have not been tested. Runtime hook support and trust are separate from installing files.

```powershell
node install.mjs --dry-run
node install.mjs
node init-project.mjs C:/dev/my-project --example agent-build
```

Home selection is `--config-dir`, then `CODEX_HOME`, then the user's `.codex`. Registration goes in `hooks.json`; project policy goes in `.codex/hook-kit.json`. The installer preserves unrelated registrations and backs up existing settings. Review and trust definitions in the target Codex client, then verify a disposable denied operation. See the installation guidance in the [manual](docs/MANUAL.md).

Examples are `minimal`, `townreporter`, `agent-build`, `completion` and `desktop`; adjust their project-relative paths to your work. The completion example starts disabled. No project configuration, an absent section or explicit `enabled:false` keeps that policy off. Malformed configuration and configured regexes now fail visibly instead of silently disabling protection.

## Available checks

| Policy or adapter | Events | Purpose |
|---|---|---|
| inject-rules | SessionStart, UserPromptSubmit | Adds configured project rules as context. |
| deploy-gate | PreToolUse | Checks publication/deployment scope and commit evidence. |
| walk-brief-guard | PreToolUse | Checks recognized brief writes for required or forbidden content. |
| read-ledger-gate | PreToolUse | Checks declared reads, exact targets and optional content hashes. |
| db-write-guard | PreToolUse | Applies configured host/database rules to recognized commands. |
| no-idle | Stop | Reports configured workers, including optional native Desktop evidence. |
| double-check | Stop | Requests a bounded checklist review. |
| measure-gate | Stop | Checks freshness or reports existing structured evidence. |
| completion-gate | Stop | Runs one authorized acceptance command, or checks existing evidence. |
| delayed-report | Stop, async | Emits a delayed report; `wake` remains an alias. |
| worker-lifecycle | SubagentStart, SubagentStop | Records supported native lifecycle metadata. |
| goal-lifecycle | UserPromptSubmit; optional goal-tool events | Records narrow explicit pause/resume/answer-only intent and observed goal operations. |

Stop continuations share a configurable budget, default **two**, across the Stop hooks. Explicit pause/answer-only lifecycle state suppresses checks and delayed reporting when the runtime invokes the owner-prompt lifecycle hook. The current open Desktop session has not invoked that new registration; on that route the budget is session-bounded and automatic owner-intent tracking is unavailable. The prompt matcher is deliberately narrow; it is not proof of semantic authorization. Goal-tool interception and async delivery need separate runtime evidence.

## Coverage and limits

| Tool path | Coverage |
|---|---|
| Canonical `Bash` shell command | Registered; recognized command text is checked. |
| `apply_patch` | Add/update/delete/move headers are parsed; all recognized targets are checked. |
| Known shell aliases | Registration and normalization support named aliases; each runtime still needs a probe. |
| `write_stdin` | Existing process input/polling does not repeat PreToolUse; commands sent here are outside these guards. |
| Opaque scripts, arbitrary MCP/hosted writes | Effects cannot be inferred reliably from command text; unsupported as a complete enforcement boundary. |

Installed commands use `--codex` for structured deny/continuation JSON. Metadata receipts prove invocation or report emission only; replay cannot be excluded, and they do not prove client delivery. **Delayed reporting cannot wake an idle chat or resume work.**

Focused guides cover [worker evidence and adoption](docs/desktop-workers.md), [project mapping and ledger coverage](docs/ledger-mapping.md), [publication and database scope](docs/release-database.md), [existing evidence](docs/evidence-mode.md) and [bounded acceptance commands](docs/COMPLETION.md).

## Verify and remove

```powershell
npm test
node uninstall.mjs --dry-run
node uninstall.mjs
```

Version 1.1.0's consolidated Windows/Node 24.15.0 source run passed **156/156 tests, zero failed or skipped**. Current native CLI probes also exercised the installer-pinned Node command and goal-pause denial/admission in isolated homes. Use focused checks for later local changes. [Current verification](docs/CURRENT-VERIFICATION.md) records the requested outcomes; [compatibility](docs/COMPATIBILITY.md) separates source checks, CLI execution, selected earlier Desktop observations and pending current-candidate activation.

Uninstall preserves project policy and unrelated registrations. Transaction backups support restoration of prior kit scripts and registrations; a plain `hooks.json` backup restores registration only. See [installation and rollback](docs/INSTALLATION.md). Installation does not publish this source or grant trust.

MIT © 2026 Scott Converse. Original source identity and retained hashes are in [PORT.md](docs/PORT.md) and [SOURCE.json](reference/SOURCE.json).
