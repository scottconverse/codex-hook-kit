# Portable Desktop candidate 1.1.0 — October 18, 2026

The corrected kit is installed locally. Native worker events, goal-tool routing,
and next-owner-prompt report delivery have now been observed in this Desktop chat.
This supersedes earlier activation-gap reports. No publication, reboot or
CivicCast runtime change occurred. Checkpoint `54baf35` remains preserved.

## Activation and delivery corrections

Desktop 26.1013.4894.0 uses Codex 0.160.0 here. Running sessions retained an older
hook configuration. A fresh diagnostic subprocess saw current registrations but
could not refresh those sessions. Settings → Hooks → User config, toggling an
existing kit hook off and back on, refreshed the live server. The hook was restored
enabled. Reloading the hooks listing alone does not refresh those sessions.
This distinction was checked against exact 0.160.0 source.

Async Stop `systemMessage` output is a UI warning, not model context. The correction
keeps that warning and saves one bounded report per project/session. The existing
UserPromptSubmit hook consumes it and supplies supported `additionalContext`.
This is delayed reporting, not independent resumption of an idle chat.

## Actual Desktop evidence

- Read-only `get_goal` produced goal-lifecycle PreToolUse and PostToolUse receipts
  at **14:43:11 and 14:43:12 UTC**, without changing the existing goal.
- Real child `01a14f79-9427-7010-889d-5303d88c2664` produced SubagentStart at
  **14:45:33.261 UTC** and SubagentStop at **14:45:35.420 UTC**.
  Worker-lifecycle now correctly identifies its own diagnostic receipts.
- The installed delayed-report producer was manually invoked with zero delay;
  the normal 20-minute configuration remained unchanged. The owner's real
  **“continue”** reply delivered `DELAYED WORKER REPORT` into model context,
  and the pending report was consumed. UserPromptSubmit was recorded at
  **14:47:55 UTC**. This demonstrates installed production plus actual Desktop
  prompt delivery, not a newly observed full 20-minute native Stop run.
- Existing Desktop shell/patch guards, synchronous Stop continuation and
  compatibility-worker reports remain separate evidence of those routes.
- Final installed doctor reports **16 trusted-current registrations**, native
  worker and owner invocations, goal-tool invocations and synchronous Stop.
  Its automatic async verdict remains conservative: receipts alone cannot prove
  model delivery. The actual received message above supplies that evidence.

Local receipts reside in this project's ignored `.codex` observation, worker-state
and lifecycle files. They are local session metadata, not public fixtures.

## Checks performed

- Baseline consolidated suite: **156 passed, 0 failed, 0 skipped**, 15,897 ms,
  Windows / Node 24.15.0. This preceded the final small delivery corrections.
- Installer-focused checks: **16 passed**, including update/removal, prior-script
  restoration, exclusive access and preservation of unrelated hooks.
- Diagnostic correction: **7 passed**, failing assertions observed first.
- Worker receipt correction: **13 passed**, missing identity assertion failed first.
- Delivery/parity: **15 passed**; subsequent empty-rules compatibility: **7 passed**;
  final atomic-claim/crash correction: **4 passed**. These overlap; do not add them
  into a suite total. The stale-lock failure was observed before correction.
- Actual CLI denied/admitted scratch writes: [receipt](native-portable-probe.json).
- Final installed-byte comparison: **30 deployed files matched**, zero mismatches;
  **33** source/installer file bindings recorded. Changed documentation: **74 local
  links checked**, zero missing; whitespace check passed.
- Actual CLI goal guard denied unauthorized pause and admitted explicit owner
  pause: [receipt](goal-probe.json). Desktop routing is demonstrated above.
  No state-changing Desktop pause-denial trial was performed.

[Candidate bindings](portable-candidate-files.json) identify current runtime and
installer bytes; file identity alone does not prove assertion adequacy.

## Eleven-item disposition

| Item | Completed implementation and evidence | Boundary |
|---|---|---|
| 1. Diagnostic | Separates runtime, prerequisites, project, API, trust and observed invocation; focused checks and live diagnostic. | Fresh subprocess trust does not refresh existing sessions. |
| 2. Workers | Native start/stop demonstrated; schema-aware SQLite fallback, failures, history adoption and acknowledgements implemented. | Internal fallback is version-sensitive; recorded activity is not process liveness. |
| 3. Goal lifecycle | Owner lifecycle, pause guard and operation receipts; CLI denial/admission and Desktop Pre/Post routing demonstrated. | Recognizes explicit commands, not arbitrary natural-language intent or every wrapped reply. |
| 4. Reading ledger | Exact targets, stale hashes, quoted/spaced paths and new-file prerequisites covered by focused checks. | Records claimed reading, not comprehension. |
| 5. Configuration | Invalid enabled configuration, regexes, ranges and mappings report errors; focused checks. | Absent/disabled optional sections remain off. |
| 6. Shared Stop | Shared continuation budget, exclusive state writes and recognized pause/answer-only suppression; tests and real continuation. | Exhaustion is unfinished work, not completion; cannot force model completion. |
| 7. Delayed reporting | Bounded queue and actual next-owner-prompt delivery demonstrated. | No idle wake; crash after claim but before delivery can lose the informational snapshot. |
| 8. Tool coverage | Shell/patch and goal routes documented with observations and focused checks. | Hidden script operations, aliases and other tools are not universal write protection. |
| 9. Portable setup | Home/Node discovery, pinned executable, prerequisites and single-source project mapping implemented. | Windows exercised; other platforms and minimum Node runtime not claimed tested. |
| 10. Install lifecycle | Script/registration backups, transactional update/removal, rollback and trust-change reporting; disposable checks and local install. | Trust remains an owner/runtime decision. |
| 11. Documentation | Manual, setup, compatibility, configuration, examples, landing page and handoff reconciled with observed behavior. | Public repository update remains a separate owner stage. |

Local installation backup:
`C:/Users/scott/.codex/hook-kit-backups/20261018-083733-b60cc7f3-8899-474e-82ba-ba06659d028d`.

See [installation](INSTALLATION.md), [compatibility](COMPATIBILITY.md) and
[diagnostics](DIAGNOSTICS.md). No universal Desktop/platform certification is claimed.
