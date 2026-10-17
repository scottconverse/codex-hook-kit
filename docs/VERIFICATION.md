# Verification — 2026-10-16

## Follow-up: nine-hook check and completion gate, 21:15–21:24 UTC

All nine original hooks passed their behavioral tests. One combined check also invoked every original hook with `--codex` and a triggering event, verifying the actual JSON response. This is direct hook execution, not Desktop activation.

| Original hook | Observed check |
|---|---|
| inject-rules | Configured rules appear in event context; missing rules are silent |
| deploy-gate | Missing/wrong commit gate blocks; complete fixture gate allows |
| walk-brief-guard | Required/missing and banned brief text distinguish allow/deny |
| read-ledger-gate | Missing/wrong rows block; accurate rows allow; real CLI write blocked/allowed |
| db-write-guard | Recognized SQL writes block without fresh marker; reads allow |
| no-idle | Unhandled/stalled workers block; handled work allows |
| double-check | First Stop requests review; continuation allows |
| measure-gate | Missing/stale receipt blocks; fresh receipt allows; retry cap ends |
| wake | Delayed worker classifications and lock work; does not wake idle Codex |

The first baseline run encountered sandbox write restrictions in Git fixtures and snippet generation. An unrestricted fixture run passed 104/104 without source changes. After adding the completion gate, the final `npm test` passed **109/109, zero failed/skipped, exit 0**, in 14.4 seconds. No repeated full suite followed that pass.

Four focused completion tests cover actual command execution/caching, fake receipt rejection, retained-region proof, cross-process/session retry limits, timeout and input mutation. An accurate read ledger alone failed the reuse check. A matching retained region passed; changed upstream bytes failed.

[completion-probe.json](completion-probe.json) records real CLI Stop behavior with a deterministic loopback model fixture: failed acceptance caused continuation; a corrected product passed after two checks; unchanged failure ran only once and ended at three failure decisions. No external model call. The prior native shell probe was also rerun successfully (PIDs 19536/42032).

All owned CLI subprocesses exited. No active home install, commit, push or app restart. Desktop activation and native apply_patch remain unverified. The kit now contains ten hooks and four examples; the new example starts disabled pending real project configuration. See [COMPLETION.md](COMPLETION.md) for the explicit limits. The original delivery evidence below is historical.

## Delivered

Local source at `C:\Users\scott\Desktop\Code\codex-hook-kit`.
Nine named hooks; installer, uninstaller and project initializer; three examples;
generated registration snippet; manual and key reference; landing page; preserved
reference source and provenance; parity and Codex protocol tests; native CLI probe.

No live installation, commit, push, public release or Desktop restart.

## Checks actually run

| Check | Result | Evidence |
|---|---|---|
| Complete final `npm test` | PASS: 104 tests, 104 passed, 0 failed, 0 skipped; exit 0 | [final-tests.txt](final-tests.txt) |
| Installer preservation/backup/uninstall correction | PASS: 10 tests | [install-recheck.tap](install-recheck.tap) |
| Native shell write, no ledger | BLOCKED; marker did not exist; tool result named read-ledger-gate | [native-probe.json](native-probe.json) |
| Same native shell write, valid ledger | ALLOWED; marker existed | [native-probe.json](native-probe.json) |
| Native probe processes | PIDs 38852 and 39456 closed; subsequent Get-Process found neither | Direct process check |
| Original Claude kit | All 46 source-manifest files hash-identical | [SOURCE.json](../reference/SOURCE.json) |
| Preserved source snapshot | All 18 snapshot files hash-identical to source | `reference/claude-hook-kit/` |
| Required deliverables | All listed files exist | Direct filesystem inventory |

Node: 24.21.0. Native Codex CLI: 0.162.0-alpha.2. Platform: Windows.
The local fixture uses synthetic inputs and an isolated Codex home, not a real model.

## Unverified and intentionally different

- Native apply_patch execution: UNVERIFIED. Direct hook tests cover patch parsing and JSON denial; the native fixture could not expose the tool reliably and attempts were stopped at the correction limit.
- Codex Desktop UI activation: UNVERIFIED. The user's actual settings were not modified.
- Native Stop continuation behavior: direct protocol tests only; no live Desktop turn-continuation acceptance run.
- Automatic delayed wake: UNSUPPORTED by Codex async hooks. The port supplies a delayed informational report instead.
- Linux/macOS and Node 18: not executed in this task.

## Failures and corrections retained honestly

1. The initial adaptation contained a wake expression syntax error and a reference-test path changed from .claude to .codex. Each was corrected once; the focused 17-test suite passed.
2. Three installer assertions still searched for settings.json backup names. The actual hooks.json backups existed. The assertions were adapted; all ten installer tests passed and the complete final suite passed.
3. Exit code 2 alone did not stop the native CLI shell write. Explicit JSON denial fixed that criterion. Installed registrations now include --codex.
4. The native patch fixture did not expose the requested tool. Two fixture corrections failed to establish that path; further attempts stopped. No passing patch-runtime claim is made.

`test-results.tap` is an intermediate failed run, superseded by `final-tests.txt`.
The separate final passing result is retained so the history is not rewritten.

## Enforcement limits

See [COMPATIBILITY.md](COMPATIBILITY.md) and [ADDITIONS.md](ADDITIONS.md). File counts
do not prove reading/reuse; fresh timestamps do not prove valid measurement;
regex shell guards and ordinary user-writable policy files are not a security boundary.
