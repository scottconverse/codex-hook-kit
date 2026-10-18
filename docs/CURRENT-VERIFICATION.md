# Portable Desktop candidate 1.1.0 — October 18, 2026

Implementation candidate is installed locally; Desktop acceptance is incomplete.
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

### Live activation follow-up, October 18

Installed the candidate into the owner's Codex home, preserving scripts and
registrations in `hook-kit-backups/20261018-080601-d956fae2-efb5-40ba-b2ac-c66af4a3a1b1`.
Under the owner's existing authorization, renewed trust for the exact 16 current
registration hashes through `config/batchWrite`. A fresh doctor invocation reports
`trusted-current`, 16 registrations, and the correct single-source project mapping.
The existing Desktop session has produced shell PreToolUse invocation receipts;
the injected project instructions also reached this conversation.

A genuinely new Desktop worker was spawned for a read-only activation check.
It produced no SubagentStart receipt. A harmless get_goal call likewise did not
produce a goal-lifecycle receipt. These observations do not establish whether the
open Desktop session cached earlier registrations or lacks the event routing.
The default app-server daemon control socket could not be reached (Windows
socket error 10050); no Desktop/server restart was performed.

Actual Desktop worker-event routing, goal interception and asynchronous report
delivery remain unverified. The latter requires observing the Stop delivery
boundary; generating a report alone is insufficient. No additional broad suite
was run, no CivicCast state was changed, and nothing was published.

The subsequent real Stop boundary delivered the double-check reminder into this
chat. Receipts also show no-idle, measure-gate, completion-gate and delayed-report
invocation. The temporary three-second delayed-report probe emitted output at
14:10:02 UTC; its message has not been observed in the conversation. Restored the
normal 20-minute setting after that probe. Invocation of disabled sections does
not establish enforcement. Worker-event and goal-tool routing remain unverified.

The follow-up read-only runtime diagnosis identified Desktop 26.1013.4894.0,
external Codex 0.160.0 and enabled code mode. Logs show real worker creation enters
native thread_spawn handling. A new owner prompt invoked inject-rules, but not
goal-lifecycle. No safe supported live refresh was established. The compatibility
adapter identified the current worker as RUNNING from its recorded lifecycle and
older results as ADOPTED-HISTORY. This confirms usable fallback monitoring, not
native hook delivery or process liveness. The remaining acceptance boundary is a
fresh Desktop session; no app, service or machine was restarted automatically.

Observe native subagent events, goal interception, and delayed report delivery in
that Desktop session. These are the remaining client-level observations; direct
tests and CLI receipts must not be relabeled as Desktop passes. A runtime that
does not expose an interface must be reported unsupported rather than given a
simulated success. See [compatibility](COMPATIBILITY.md), [installation](INSTALLATION.md)
and [diagnostics](DIAGNOSTICS.md).
