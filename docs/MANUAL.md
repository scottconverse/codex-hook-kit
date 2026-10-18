# Codex hook-kit manual

## Purpose and requirements

The kit applies explicit project workflow checks to supported local Codex operations. It adapts the original Claude policy engines and adds native worker evidence, evidence-bound reporting and shared Stop limits. [PORT.md](PORT.md) records provenance.

Use Node 22.13 or newer, Git where deployment checks require it, and a Codex runtime supporting the registered command hooks. Current source verification uses Windows and Node 24.15.0; Desktop runtime 0.160.0 is the target observed installation. Linux/macOS and other runtime combinations are not yet tested. Hook definitions must be enabled and trusted in the target client. No npm dependencies are required.

## Installation and first project

```powershell
node install.mjs --dry-run
node install.mjs
node init-project.mjs C:/dev/my-project --example agent-build
```

The selected home is `--config-dir`, `CODEX_HOME`, or the user's `.codex`, in that order. Runtime files go into its `codex-hook-kit` directory and registrations into `hooks.json`. Installation pins the executing Node binary, preserves unrelated registrations and creates transaction backups covering prior scripts and kit registrations. It does not grant trust. See [INSTALLATION.md](INSTALLATION.md) for transaction and rollback details.

Review the actual definitions in Codex; `/hooks` is the documented CLI interface. A running Desktop session can retain earlier registrations/trust. The verified live refresh is to open the local project, then toggle an existing kit Hook off/on in Settings and restore its original value. “Reload hooks” refreshes the listing only. See [INSTALLATION.md](INSTALLATION.md). Verify a denied scratch operation and an allowed operation before relying on a guard. A direct child-process test is not Desktop activation proof.

The initializer refuses to overwrite project policy without `--force`; forced replacement creates a backup. Available examples are `minimal`, `townreporter`, `agent-build`, `completion` and `desktop`; adjust paths to the project. The completion example is disabled until configured.

## Project lookup, mapping and configuration errors

Each hook uses event `cwd`, falling back to its process directory, then finds the nearest `.codex/hook-kit.json`. Relative paths resolve against that project's root. An explicit absolute `projectConfig` mapping delegates to another policy and its root; broken mappings and cycles are errors. See [ledger-mapping.md](ledger-mapping.md).

No project file, absent sections and explicit `enabled:false` disable the corresponding policy. A closer disabled project overrides a parent. Existing malformed JSON, invalid section shapes, invalid enabled flags and configured bad regexes fail visibly. A configuration error is not equivalent to a disabled policy.

## Protocol and tool coverage

Installed commands include `--codex`. PreToolUse denial uses structured `hookSpecificOutput.permissionDecision: "deny"`; Stop continuation uses `decision: "block"`. A historical native CLI probe found exit code 2 alone insufficient for tool denial. Use generated registrations.

| Path | What is checked | Limit |
|---|---|---|
| `Bash` command | Recognized shell command and write syntax | Not arbitrary script effects |
| Named shell aliases | Registered/normalized alias input | Runtime routing must be verified |
| `apply_patch` | All Add/Update/Delete/Move targets and available changed text | Update fragments are not complete file bodies |
| `write_stdin` | No new PreToolUse for an existing process | Sent commands are outside this coverage |
| Arbitrary MCP, hosted or opaque tool | Only explicitly registered, understood paths | No complete write boundary |

Patch deletion is not treated as adding forbidden text. Full-body-only brief requirements apply to additions or recognized full-body shell writes. Shell recognition remains heuristic; PostToolUse cannot undo an already completed write.

## Policy behavior

**Rules and briefs.** `inject-rules` adds configured text at session start or user prompts. It does not prove obedience. `walk-brief-guard` checks recognized targets for required/banned text.

**Reading coverage.** `read-ledger-gate` checks configured upstream rows and, when enabled, exact target coverage and SHA256 freshness. A matching row proves neither reading nor comprehension. See [ledger-mapping.md](ledger-mapping.md) for spaced paths and task prerequisites.

**Publication and database scope.** `deploy-gate` checks configured commit evidence and publication authorization. `db-write-guard` distinguishes configured hosts/databases and fresh approval markers. These are command-text policies, not independent authentication. See [release-database.md](release-database.md).

**Workers.** `no-idle` retains the configured folder/log mode. The optional `codex-desktop` backend prefers supported native lifecycle receipts and can use the observed read-only SQLite fallback. It separates pre-adoption history from newly unhandled results. Silence alone is not failure. See [desktop-workers.md](desktop-workers.md).

**Review and measurement.** `double-check` requests the configured checklist once subject to shared limits; it cannot prove a review happened. `measure-gate` retains timestamp/receipt checks and also supports `mode: "evidence"`. Fresh timestamps do not prove measurement truth.

**Completion.** `completion-gate` either runs one authorized existing acceptance command, with input-bound caching and optional exact retained-code checks, or checks existing evidence without commands. See [COMPLETION.md](COMPLETION.md) and [evidence-mode.md](evidence-mode.md). No hook makes an inadequate acceptance check meaningful.

## Shared Stop and owner lifecycle state

`stop-policy.maxContinuations` defaults to two and accepts integers 0–10. Stop hooks share this project/session counter. Exhaustion reports incomplete work instead of forcing another continuation. Existing per-hook failure/cache limits still apply. This is not an active-time, no-progress or global cross-project budget.

The prompt lifecycle handler recognizes narrow explicit pause/resume forms and answer-only wording. Pause/answer-only state suppresses Stop checks and delayed reporting. A recognized owner prompt starts a new continuation epoch; recorded resume clears pause. This text matcher is not semantic authority proof, and its state is editable.

Actual Desktop worker start/stop and get_goal tool hooks ran after live configuration refresh. A subsequent real owner prompt invoked owner-lifecycle recording. Consult doctor's summaries and [current verification](CURRENT-VERIFICATION.md). The assistant must follow the owner's instructions regardless of hook coverage.

Optional goal-tool guarding denies a recognized `update_goal` pause without recorded owner pause. A current isolated native CLI probe exercised denial and explicit-owner-pause admission without an active real goal. Actual Desktop get_goal PreToolUse/PostToolUse were also observed; a Desktop pause was not used as a probe. A PostToolUse record is an observation; consult the authoritative goal-tool result for success.

## Delayed reports and diagnostics

`delayed-report` is canonical; `wake` remains an alias. If both sections exist, canonical configuration wins, including an explicit disable. Native delays are 0–25 minutes and are checked for pause before and after waiting. Filesystem mode keeps its configured delay override and lock format. Quiet workers require investigation, not automatic relaunch.

The delayed reporter saves a bounded pending worker snapshot. The next owner UserPromptSubmit consumes it as model context; it cannot wake an idle chat or start work. Actual Desktop delivery was observed after a manually invoked installed zero-delay producer saved a snapshot: the next real owner prompt received the report and consumed its pending file. Async Stop systemMessage output alone is a client warning, not model context. With diagnostics.enabled:true, metadata receipts identify invocation/emission; receipts alone do not prove delivery. See [DIAGNOSTICS.md](DIAGNOSTICS.md), [desktop-workers.md](desktop-workers.md) and [lifecycle.md](lifecycle.md).

## Removal and troubleshooting

```powershell
node uninstall.mjs --dry-run
node uninstall.mjs
node uninstall.mjs --remove-files
```

Project policy remains. A plain registration backup restores registrations only; the installer's transaction backups cover earlier kit script bytes and kit registrations. Use the printed transaction folder and documented rollback command in [INSTALLATION.md](INSTALLATION.md).

| Symptom | Check |
|---|---|
| No visible effect | Nearest policy/mapping, enabled section, runtime support, trust and intended session |
| Script denies but tool acts | Actual registered command, structured protocol, tool coverage and client probe |
| Node unavailable | Installer-pinned executable and its actual runtime version |
| Worker is `UNKNOWN` | Explicit capability/tail/receipt notice; do not infer health |
| Repeated Stop requests | Shared budget, native snapshot claims and per-hook counters |
| Receipt exists but report unseen | Emission is not delivery; verify the target Desktop build |

Run focused tests for changed behavior. Current outcomes and the consolidated 156-test pass are in [CURRENT-VERIFICATION.md](CURRENT-VERIFICATION.md). Historical probes/counts are in [VERIFICATION.md](VERIFICATION.md); current runtime limits are in [COMPATIBILITY.md](COMPATIBILITY.md). Complete legacy keys and new option links are in [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md).
