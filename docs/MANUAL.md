# Codex hook-kit manual

## 1. Purpose and source

This kit brings the Claude kit's nine policy concepts to local Codex. The policy engines are reused; platform adapters handle Codex input, output, configuration and turn identity. Source provenance is in [PORT.md](PORT.md) and [SOURCE.json](../reference/SOURCE.json).

Hooks constrain supported operations. They cannot prove understanding, stop every alternate write path, or make an agent's evidence truthful.

## 2. Requirements

- Node 18+ available on the hook shell's PATH. Tested with Node 24.21.0 on Windows.
- Codex with command hooks, JSON PreToolUse denial, Stop continuation, and async informational hooks.
- Hooks enabled by runtime policy; trusted definitions; a local session.
- Git for deploy-gate; a working configured repository when that hook is enabled.
- No npm dependency installation.

This is not a guarantee for older Codex releases, cloud-orchestrated chats, Linux or macOS. Consult [verification](COMPATIBILITY.md) before activation.

## 3. Installation

Run from the kit directory:

```powershell
node install.mjs --dry-run
node install.mjs
```

The selected Codex home is --config-dir, CODEX_HOME, or the user's .codex folder, in that order. The installer copies hooks/ and lib/ into codex-hook-kit/ within that home. It merges the registrations into hooks.json, retaining unrelated entries and top-level fields.

Existing hooks.json is copied to a uniquely named hooks.json.bak-hookkit-TIMESTAMP before registration is written. Invalid JSON is an error rather than an overwrite. Reinstall replaces owned registrations instead of duplicating them. It does not edit config.toml or carry out trust approval.

Codex may merge hook sources from multiple config layers. This installer manages its selected hooks.json only: unrelated inline TOML or plugin hooks remain active.

## 4. Trust and first project

Review and trust the installed definitions through Codex's hook interface; /hooks is documented for the CLI. New or changed definitions can require review again. Start a new local Codex session after installation. Hooks can be disabled by features.hooks=false or admin policy.

Initialize a project:

```powershell
node init-project.mjs C:/dev/my-project --example agent-build
```

The initializer writes .codex/hook-kit.json. It refuses to overwrite unless --force is given. The source examples are minimal, townreporter and agent-build. Paths in townreporter are retained as owner-specific examples; do not use them unchanged on another machine.

For one review hook only, the project file can be:

```json
{ "enabled": true, "double-check": { "label": "my project" } }
```

Before trusting deployment or write protection, run an actual disposable denied operation from the intended Codex client. A direct script test is not proof of Desktop integration.

## 5. Project lookup and opt-out

Every hook reads JSON stdin, uses cwd from the event, and walks upward to the nearest .codex/hook-kit.json. Relative policy paths resolve from the directory containing .codex, not the shell's current subfolder.

No config, missing hook section, or enabled:false means exit 0 and silence. A closer disabled config overrides a parent enabled config. Malformed JSON currently switches the nearest config off; invalid regexes can disable checks. These behaviors are inherited and are called out because they weaken enforcement.

## 6. Protocol and tool coverage

Registered commands include --codex. In that mode a policy block returns exit 0 with:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "The required ledger is missing."
  }
}
```

Stop blocks return {"decision":"block","reason":"..."}. Without --codex, scripts keep the original exit-2/stderr convention for parity testing. The installed native CLI probe showed exit 2 alone was insufficient for tool denial, so use generated registrations.

Codex shell events normally arrive as Bash with tool_input.command. Replay adapters also accept exec_command/cmd and shell aliases. Codex apply_patch uses tool_input.command; the adapter also accepts freeform strings and patch/input fields for fixture replay.

Patch headers identify every Add, Update, Delete and Move target. Added files supply a full body. Updates supply added/context lines only, so full-body-only brief checks are not imposed on fragments. Rename targets receive the same changed text.

Arbitrary MCP tools, hosted tools, interactive write_stdin input, concealed script writes and alternate code runners are not fully covered by these matchers or regexes. A PostToolUse check cannot undo a write. Do not present this kit as an access-control sandbox.

## 7. Hook behavior

### inject-rules

SessionStart and UserPromptSubmit read rulesFile and inject heading plus content. Missing rules means no context. This is a reminder; it does not enforce the meaning of the rules. SessionStart can also run on resume/compaction in supporting Codex runtimes.

### deploy-gate

A shell command matching commandPattern and no skipPatterns requires a gate named <commit>.json under gatesDir. shaFrom defaults to origin/main and performs git fetch; use HEAD for local-only operation. requiredKeys, mustEqual, reportKey/reportMustContain and findingsFile/openPattern validate the gate and report. The original textOnly branch is preserved.

A configured skip regex, incomplete requiredKeys list, or owner-writable gate can weaken the check. The hook is a release workflow check, not proof of authorization or of the tests represented by a receipt.

### walk-brief-guard

Checks pathPattern against write/edit/patch targets or shell command text. bannedPatterns reject text; requiredLines and requiredSections require matching content. onlyFullBody constraints apply to whole-file additions or configured heredocs, not partial updates. Deleting forbidden text does not count as adding it.

### read-ledger-gate

Recognized code writes require ledgerFile (default .codex/READ-LEDGER.md). Example row:

```text
- upstream/project-a/src/parser.ts - 312 lines
```

The original table and comma forms also work. upstreamRoots resolve relative paths; requireExisting and verifyLines default true. minEntries, minLines and mustMention impose count and coverage requirements. codePattern, exemptPattern, shellWritePattern and rowPattern are configurable.

The gate verifies line counts against files on disk. It does not observe actual reading, enforce reuse, reject every duplicate row or guarantee every row lies beneath an upstream root. Default exemptions include documentation and configuration files. These inherited limitations are material; see recommended improvements.

### db-write-guard

Checks configured clientPattern, port and database names. Recognized SQL writes, files and restores require okFile newer than okMinutes. Read-like statements pass. clientPattern must be configured; the supplied examples do so. This regex policy cannot parse all SQL, functions, scripts or quoting combinations. A fresh marker is workflow evidence, not independent owner authentication.

### no-idle

Scans runsDir for recent worker folders using configured logNames. A finished worker without handledFile, a quiet running worker, or a running worker without a configured live waiter blocks Stop. waiterHeartbeat or waiterCheck establishes waiter liveness. This scans explicitly configured logs, not arbitrary Codex Desktop threads.

Unlike measure-gate, the inherited no-idle hook has no retry cap. Keep it disabled unless its worker lifecycle and handling markers are reliable.

### double-check

The first Stop requests the configured checklist; stop_hook_active=true passes. The source checklist is preserved, including the requested reply prefix. minToolCalls optionally uses best-effort transcript counting. Codex response_item function/custom tool calls and the original transcript format are supported. Transcript formats are unstable; an unreadable transcript requests the check rather than treating it as proof that no tools ran.

This requests a review; it cannot prove the review happened. A stop already continued by another hook also passes the stop_hook_active guard.

### measure-gate

Compares the newest matching receipt with the newest code file under codeDirs. receiptFile or receiptDir/receiptPattern selects the receipt. requireMatch optionally checks its text. codePattern, ignorePattern and maxDepth scope the scan.

The counter is isolated by project and session. Native turn_id resets it on a new non-continuation turn; stop_hook_active continuations retain the budget. Without native IDs, transcript position is a best-effort fallback.

After maxBlocks, it returns JSON with continue:false, stopReason and systemMessage identifying the stale result. This prevents further Stop continuation from this gate and takes precedence over other continuation requests. The warning does not rewrite an already generated final answer.

A file's mtime and matching text do not prove measurement correctness. The separate opt-in [completion gate](COMPLETION.md) executes an agreed command and caches its result against input content, instead of trusting an agent-written receipt.

### wake

Runs asynchronously, waits minutes (or seconds from minutesFile), and reports worker status through JSON systemMessage. A lock avoids duplicate sleepers. Worker classification remains comparable to the source hook.

**Codex does not implement asyncRewake.** Background completion does not start a user turn. Information is delivered at the next safe point or next user turn; ending a session can cancel pending hooks. The 1800-second registration timeout remains, so configure a delay below it. Automated wake-ups would require a separately authorized scheduler.

## 8. Uninstall and recovery

```powershell
node uninstall.mjs --dry-run
node uninstall.mjs
node uninstall.mjs --remove-files
```

Only owned Codex registrations are removed. Other hook kits and settings remain. Project policy is not removed. --remove-files deletes the selected home's codex-hook-kit runtime directory.

Restore the backup printed by the installer to roll back registrations. This does not restore overwritten runtime script versions. Keep an earlier kit copy if code rollback is needed.

## 9. Testing

npm test runs inherited parity and scope tests plus Codex protocol tests. All policy fixtures and installer homes are disposable. Reference hooks remain unmodified; copied reference fixtures substitute temporary paths.

tools/probe-codex.mjs runs native shell deny/allow cases through a deterministic local Responses endpoint. It uses an isolated Codex home and only that subprocess's trust bypass. It never calls a real model or installs live hooks. CODEX_BIN can select a specific native executable.

Native patch execution and Desktop UI activation remain unverified. They are not converted into passing claims by direct adapter tests.

## 10. Troubleshooting

| Symptom | Check |
|---|---|
| Nothing happens | Correct local cwd, nearest project config, enabled section, features.hooks, trusted definitions, new session. |
| Hook script blocks but tool still writes | Registered command must include --codex; use native-probe evidence for this runtime. |
| Cannot find node | Ensure the hook shell can resolve Node; the kit does not install Node. |
| No delayed wake | Expected: wake only reports when Codex next processes background output. |
| Repeated Stop continuations | Inspect no-idle markers; measure-gate has its own bounded counter. |
| Ledger passes but no reuse occurred | Expected limitation: file counts do not enforce reuse or comprehension. |
| Unknown runtime behavior | Run a disposable real-client probe; do not infer enforcement from configuration alone. |

## 11. Complete configuration keys

See [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md), adapted from the original manual's key table. These keys are preserved rather than replaced with a different policy format.

