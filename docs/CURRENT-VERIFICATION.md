# Portable Desktop candidate 1.1.0 — October 18, 2026

Implementation candidate is ready for the owner's Desktop acceptance stage.
It is not a claim that every current hook has already been activated in Desktop.
No publication occurred. Earlier local work was preserved in commit `54baf35`.

## Checks performed

- One consolidated `npm test`: **156 passed, 0 failed, 0 skipped**, exit 0,
  15,897.3231 ms. Windows, Node 24.15.0.
- Installer-focused checks: 16 passed, including update, removal, prior-script
  restoration, exclusive access, and preservation of unrelated registrations.
- Actual Codex CLI 0.160.0: generated pinned-Node command blocks a denied scratch
  write and permits its allowed counterpart. Both child processes exited.
  [Native receipt](native-portable-probe.json).
- Actual Codex CLI goal interception: ordinary prompt plus `update_goal` pause was
  denied; explicit owner pause admitted it. Isolated threads had no active goal;
  no host goal was changed. Two deterministic loopback requests per case, no
  provider/model call. [Goal receipt](goal-probe.json).
- Read-only doctor: runtime identified, SQLite available, `hooks/list` supported,
  diagnostic child closed. Existing Desktop configuration returned 11 trusted kit
  registrations, not the candidate's new 16. No invocation receipts existed in
  the newly mapped kit project at that check.
- Local documentation links: 98 checked, zero missing. Whitespace check passed.
  No rendered-browser inspection is claimed.

The [candidate file bindings](portable-candidate-files.json) identify the runtime
source and installer bytes checked. These hashes bind the record to those files;
they do not independently prove that every assertion is a sufficient test.

## Eleven-item disposition

| Item | Implemented result | Verification / remaining boundary |
|---|---|---|
| 1. Diagnostic | One read-only `doctor.mjs` command reports runtime, project, prerequisites, hook API, trust, and invocation receipts separately. | Direct checks and live `hooks/list`; registration is not activation. |
| 2. Workers | Native event receipts, compatible read-only SQLite fallback, schema detection, failure states, historical adoption, same-turn terminal corroboration. | Focused checks; current liveness remains explicitly unverified from historical events alone. New candidate's Desktop event delivery awaits acceptance. |
| 3. Goal lifecycle | Current recognized owner pause/resume/answer-only state, pause guard, separate observed-operation receipt. | Direct tests and actual CLI denial/admission. Desktop routing of these goal tools remains to be observed. |
| 4. Ledger | Exact targets, hash freshness, spaced/quoted paths, explicit new-file prerequisites; unrelated stale rows do not block other targets. | Focused checks. Records claimed reading, not comprehension. |
| 5. Configuration | Malformed JSON, sections, enabled flags, regexes, known control types/ranges and mappings produce visible errors. | Focused checks. Absent/disabled sections remain off. |
| 6. Shared Stop | Default two continuations shared across installed Stop hooks; exclusive state writes; pause/answer-only suppression before checks. | Direct tests and focused review; no completion is inferred from exhaustion. |
| 7. Delayed reporting | Canonical delayed-report name, legacy alias, bounded native delay, duplicate suppression and pause handling. | Output generation checked. Actual asynchronous Desktop delivery remains unverified; autonomous idle-chat resumption is unsupported. |
| 8. Tool coverage | Documented shell/patch coverage, goal CLI proof and explicit uncovered paths. | Prior Desktop observations and current CLI probes are separately identified. No universal write protection claim. |
| 9. Portable setup | Codex-home discovery, Node minimum, pinned executable, project mapping, portable examples. | Windows PowerShell runtime exercised. Other platforms, minimum Node execution and customized Windows command shells are not verified. |
| 10. Install lifecycle | Script-plus-registration backup, transactional update/removal, rollback, lock, exact-registration change reporting. | Disposable configuration tests and native launch probe. Trust is not granted automatically. |
| 11. Documentation | README, manual, configuration, examples, landing page, compatibility, additions and handoff reconciled; old records labeled historical. | Link/whitespace checks and source review; publication remains owner-controlled. |

## Desktop acceptance still to observe

Install this candidate, review its changed registrations in the target client, and
observe native subagent events, goal interception, and delayed report delivery in
that Desktop session. These are the remaining client-level observations; direct
tests and CLI receipts must not be relabeled as Desktop passes. A runtime that
does not expose an interface must be reported unsupported rather than given a
simulated success. See [compatibility](COMPATIBILITY.md), [installation](INSTALLATION.md)
and [diagnostics](DIAGNOSTICS.md).
