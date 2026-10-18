# Codex Hook Kit 1.1.0 — release verification

Published October 18, 2026: [release v1.1.0](https://github.com/scottconverse/codex-hook-kit/releases/tag/v1.1.0), merged through [PR #1](https://github.com/scottconverse/codex-hook-kit/pull/1) at `af2be83427b258c1937536c4274c92632e4b0385`. All nine completed commits through `a7c1ecf`, including checkpoint `54baf35`, remain in the history. The merged source tree matches that candidate. All 33 candidate file bindings matched, and all 120 files in the downloaded GitHub source archive matched the tag.

Hooks remain disabled; publication did not run the installer, change CivicCast or reboot. The following dated observations describe pre-publication verification. Earlier publication restrictions are historical and were superseded by explicit owner authorization. Documentation corrections after publication do not move the immutable `v1.1.0` tag; the website and default-branch documentation carry those clarifications.

## Pre-publication observations — October 18, 2026

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
  pause: [receipt](goal-probe.json). Subsequently, actual Desktop worker
  `/root/desktop_pause_probe` first received `goal: null` from native get_goal,
  then its native update_goal pause attempt was rejected:
  `Tool call blocked by PreToolUse hook: Goal pause denied: no current explicit owner pause is recorded.. Tool: update_goal`.
  No goal or authorization state was changed. This completes Desktop denial proof.

[Candidate bindings](portable-candidate-files.json) identify current runtime and
installer bytes; file identity alone does not prove assertion adequacy.

## Eleven-item disposition

| Item | Completed implementation and evidence | Boundary |
|---|---|---|
| 1. Diagnostic | Separates runtime, prerequisites, project, API, trust and observed invocation; focused checks and live diagnostic. | Fresh subprocess trust does not refresh existing sessions. |
| 2. Workers | Native start/stop demonstrated; schema-aware SQLite fallback, failures, history adoption and acknowledgements implemented. | Internal fallback is version-sensitive; recorded activity is not process liveness. |
| 3. Goal lifecycle | Owner lifecycle and operation receipts; native Desktop unauthorized-pause denial proved. Desktop question-reply answers now parsed separately from quoted questions. | Recognizes explicit commands, not arbitrary natural-language intent. |
| 4. Reading ledger | Exact targets, stale hashes, quoted/spaced paths and new-file prerequisites covered by focused checks. | Records claimed reading, not comprehension. |
| 5. Configuration | Invalid enabled configuration, regexes, ranges and mappings report errors; focused checks. | Absent/disabled optional sections remain off. |
| 6. Shared Stop | Shared continuation budget, exclusive state writes and recognized pause/answer-only suppression; tests and real continuation. | Exhaustion is unfinished work, not completion; cannot force model completion. |
| 7. Delayed reporting | Bounded queue and actual next-owner-prompt delivery demonstrated. | No idle wake; crash after claim but before delivery can lose the informational snapshot. |
| 8. Tool coverage | Shell/patch and goal routes documented with observations and focused checks. | Hidden script operations, aliases and other tools are not universal write protection. |
| 9. Portable setup | Home/Node discovery, pinned executable, prerequisites and single-source project mapping implemented. | Windows exercised; other platforms and minimum Node runtime not claimed tested. |
| 10. Install lifecycle | Script/registration backups, transactional update/removal, rollback and trust-change reporting; disposable checks and local install. | Trust remains an owner/runtime decision. |
| 11. Documentation | Manual, setup, compatibility, configuration, examples, landing page and handoff reconciled with observed behavior. | Published as v1.1.0; see release status above. |

Local installation backup:
`C:/Users/scott/.codex/hook-kit-backups/20261018-083733-b60cc7f3-8899-474e-82ba-ba06659d028d`.

See [installation](INSTALLATION.md), [compatibility](COMPATIBILITY.md) and
[diagnostics](DIAGNOSTICS.md). No universal Desktop/platform certification is claimed.

## Remaining-gap correction, October 18

- **Desktop pause denial:** completed as recorded above in an isolated no-goal worker.
- **Nested probe completion:** fixed a lookup defect. The child rollout's actual
  `task_complete` is 14:45:35.468 UTC, turn `01a14f79-9497-7163-bf35-cb680bcd82c5`,
  message `native hook probe complete.` Native receipts scoped it to the root;
  SQLite's edge used its intermediate parent. The adapter now corroborates ids
  already established by native receipts, retaining same-turn/time checks.
- **Notification relevance:** the 14:55 notification repeated the same probe
  observation from 14:52 only because two other workers became HANDLED. Claims
  now track each actionable observation independently. Handled/history changes
  cannot retrigger unchanged pending work. A claim-format upgrade may produce
  one initial notification for existing actionable observations.
- **Wrapped owner replies:** only JSON string answers in the Desktop envelope
  determine intent. Questions are ignored; malformed opening/closing envelopes
  preserve authorization. Independent review found and corrected the closing-only
  malformed case before installation.
- Focused checks: worker regressions **15 passed / 0 failed**, owner lifecycle
  **3 passed / 0 failed**, delivery integration **4 passed / 0 failed**. The new
  regression assertions failed before correction. No broad suite was repeated.
- Installed using the existing installer; 30 files copied, 16 registrations unchanged.
  Backup: `C:/Users/scott/.codex/hook-kit-backups/20261018-090401-f5a5da7a-a1a2-4728-a2df-be590952f9c4`.
- **Native automatic delayed producer → next owner prompt:** completed. Desktop's
  actual Stop launched the installed reporter with a temporary three-second delay.
  Its pending report was written at **15:05:39.0236991 UTC**. The next real wrapped
  owner reply delivered that report into model context and consumed the pending file.
  Lifecycle read-back was `authorization: owner-resume`, `paused: false`,
  `answerOnly: false`. The normal **20-minute** setting was restored and verified.
  This supersedes the earlier manual-producer-only evidence. Local raw records:
  `.codex/native-delay-proof.json` and `.codex/native-delay-proof-produced.json`.
- **Historical publication status at this checkpoint:** publication had not yet occurred because the old session retained a conflicting instruction. A later fresh session published v1.1.0 under explicit owner authorization; see release status above.

## Owner-policy precedence correction

The owner subsequently disabled hooks. Global `features.hooks` is false, global
registrations are empty, and this project's policy is disabled. Prior activation
results above are historical observations, not claims that hooks remain enabled.

The injector now supplies mandatory precedence wording outside a JSON-encoded
heading/body: owner-maintained project text is overridable default context, and
current or later explicit owner instructions supersede conflicting project text.
Custom headings cannot replace that framing. Genuine system/developer platform
constraints remain unaffected. This does not change Desktop's message role or
remove instructions already injected into a conversation.

Focused baseline: 19 passed. Missing-framing assertions failed before correction.
Final command: `node --test tests/parity-inject-rules.test.mjs tests/delayed-delivery.test.mjs tests/double-check.test.mjs tests/scope.test.mjs`
returned **20 passed, 0 failed**. Data/event preservation, arbitrary embedded text,
delayed delivery and disabled-project behavior were checked. These checks prove
the emitted context, not universal model obedience. Root independently reviewed
the source/test diff. The installed injector matches source; hooks remain disabled.
