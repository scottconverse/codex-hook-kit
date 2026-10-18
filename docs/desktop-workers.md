# Native worker monitoring and delayed reports

The opt-in `codex-desktop` backend prefers native subagent events and supplements missing workers with a read-only SQLite compatibility adapter. Existing filesystem monitoring remains the default.

```json
{
  "no-idle": { "backend": "codex-desktop", "source": "auto", "lookbackHours": 48 },
  "delayed-report": { "backend": "codex-desktop", "source": "auto", "minutes": 20 }
}
```

`delayed-report` is the canonical section and script; `wake` remains an alias. If both sections exist, the canonical section wins, including when disabled. `parentThreadId` overrides the event's `session_id`. Relative paths resolve against the project containing `.codex/hook-kit.json`.

## Native lifecycle evidence

The lifecycle handler records only parent/child/turn identifiers, agent type and observed timestamp in `.codex/desktop-worker-state/events`. It retains no prompts, assistant messages or transcript paths. See the [official hook fields and semantics](https://learn.chatgpt.com/docs/hooks).

`SubagentStart` means `RUNNING`: last observed running, current liveness unverified. `SubagentStop` means `STOP-OBSERVED`: it runs before the final stop decision, and another hook may continue the worker. It does not prove completion. Missing receipts do not prove event support or delivery. `source: "native-hooks"` requires native evidence and reports `UNKNOWN` without receipts.

## Compatibility and capability checks

`source: "auto"` prefers native evidence per child and supplements other children from `state_5.sqlite`; `source: "sqlite"` selects only this fallback. A native stop can be corroborated by same-turn SQLite terminal evidence dated at or after the stop; the report preserves both sources. An older SQLite completion cannot override a newer native start. `codexHome` overrides `CODEX_HOME`, then the user's `.codex`. The adapter checks `node:sqlite` availability and required native table columns, opening the database read-only. Unsupported state is explicit. SQLite requires Node 22.13 or newer; tested runtime: Node 24.15.0 on Windows. Other platforms have not been tested. This is an observed internal schema, not a public compatibility promise.

Only matching parent/child spawn edges are followed. Work is bounded to 256 children, the final 2 MiB per plain JSONL rollout, a one-second SQLite lock wait and 1024 native receipts per parent. `lookbackHours` defaults to 48 and uses `threads.updated_at`; excluded historical children are counted, never acknowledged. Missing/compressed rollouts, malformed tails, absent lifecycle evidence and exceeded limits are `UNKNOWN`.

The latest lifecycle determines state: start is `RUNNING`, successful completion `FINISHED-NOT-HANDLED`, abort `INTERRUPTED`, explicit failure or terminal completion error `FAILED`. Supported spellings include task/turn started, complete, aborted and failed. Error events follow the [upstream replay semantics](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/protocol.rs): `thread_rollback_failed` and `active_turn_not_steerable` do not change task state. Error text is omitted. Later lifecycle evidence supersedes earlier errors. Silence and an open spawn edge never prove liveness or failure.

## Adoption and acknowledgement

First monitoring contact persists a timestamp for that parent under `.codex/desktop-worker-state/adoption`. Lifecycle recording and delayed-report arming establish it before waiting. Earlier terminal observations become `ADOPTED-HISTORY`, retaining their original state: they are neither newly unhandled nor acknowledged. Running tasks remain visible even if started earlier; later completions become newly unhandled.

Set `adoptFrom` to an ISO timestamp before the first scan to include historical work deliberately. The persisted timestamp stays authoritative; later configuration changes do not silently reset it. Inspect or deliberately remove that parent's adoption record to adopt again. `stateDir` changes the state location. Invalid or unwritable adoption state is `UNKNOWN`.

After reviewing a terminal/stop observation, record its `completion=<token>` in `.codex/desktop-worker-handled.json`:

```json
{ "child-thread-id": "token-from-the-report" }
```

Only that observation becomes `HANDLED`; later completions remain visible. `handledFile` changes this JSON path. Legacy handled text files are not used.

## Bounded continuations and delayed delivery

Stop requests at most one continuation per unchanged actionable snapshot using atomic files in `.codex/desktop-worker-notices`. `HANDLED` and `ADOPTED-HISTORY` do not request continuation. Repeated unchanged Stops may finish while workers remain running or unknown. `stop_hook_active` and configured shared Stop limits also apply. Notice persistence failure produces an informational `UNKNOWN`, without blocking. `noticeDir` changes this storage; deleting claims permits notices to repeat.

Delayed reports wait `minutes` (0–25) and emit an informational snapshot. An exclusive parent/project lock prevents duplicate sleepers. Dead PIDs are reclaimed under a short claim. Unreadable locks, uncertain PIDs or interrupted claim directories are reported as unavailable; remove them only after confirming their owners are no longer running.

When `diagnostics.enabled` is true, `delayed-report-emitted` records emission metadata. It explicitly does not establish Desktop delivery. Owner lifecycle state suppresses reporting both before arming and after the delay when paused or answer-only.

Report generation and actual Desktop delivery are separate evidence. Source tests prove generation; a runtime delivery probe is required for a specific Desktop build. Async output may arrive at a later safe point or user turn. The hook cannot wake an idle chat or resume work. Legacy quiet-time rules, waiter commands and token plugins do not apply to the native backend.
