# Native Desktop worker reports

The `codex-desktop` backend is opt-in. Existing filesystem worker reports remain the default. This adapter reads Codex's `state_5.sqlite` in read-only mode and follows only `thread_spawn_edges` belonging to the selected parent. It never changes Codex home or resumes a chat.

```json
{
  "no-idle": {
    "backend": "codex-desktop",
    "codexHome": "C:/Users/scott/.codex",
    "parentThreadId": "your-parent-thread-id"
  },
  "wake": {
    "backend": "codex-desktop",
    "codexHome": "C:/Users/scott/.codex",
    "parentThreadId": "your-parent-thread-id",
    "minutes": 20
  }
}
```

Omit `parentThreadId` to use the hook event's `session_id`. Omit `codexHome` to use `CODEX_HOME`, then the current user's `.codex`. Relative configured paths resolve against the project containing `.codex/hook-kit.json`. This requires Node with `node:sqlite` (tested with Node 24.15.0). Codex's internal schema is not a public compatibility guarantee; unsupported schema or evidence produces `UNKNOWN`.

The latest supported `event_msg` lifecycle in each plain `.jsonl` rollout tail determines status: `task_started` is `RUNNING`, `task_complete` is `FINISHED-NOT-HANDLED`, and `task_aborted` is `INTERRUPTED`. A closed relationship with only `task_started` is `UNKNOWN`. Silence never proves failure. An `open` spawn edge is relationship evidence, not proof of a currently running task: this machine had open edges for completed workers. Missing, compressed (`.zst`), malformed, unreadable rollouts, or tails without a supported lifecycle are explicitly `UNKNOWN`.

Reports include a `completion=<token>` for each completed task. After reviewing its result and deciding the next step, record that exact token in `.codex/desktop-worker-handled.json`:

```json
{ "child-thread-id": "completion-token-from-the-report" }
```

The record acknowledges that completion only. A later completion has a new token and becomes unhandled. The optional `handledFile` changes this JSON file's location; the legacy `handled.txt` format is not used by this backend.

Stop requests at most one continuation for each unchanged parent/worker snapshot. Atomic claim files in `.codex/desktop-worker-notices` enforce that bound across hook processes. A subsequent unchanged Stop can finish even while workers remain running or unknown. The event's `stop_hook_active: true` also suppresses another continuation. If claims cannot be persisted, the hook emits an informational `UNKNOWN` report and suppresses blocking. The optional `noticeDir` changes this project-local storage. Keep these files to retain deduplication; deleting them permits another notice for old evidence.

The scan is bounded to the first 256 child edges sorted by id and the last 2 MiB per rollout, with a one-second SQLite busy timeout. Exceeding the worker limit is explicitly reported. The `lookbackHours` default is 48; `threads.updated_at` filters older children and reports their excluded count without acknowledging them. Bounded tail truncation can produce `UNKNOWN`; the adapter does not read entire logs or decompress archives. Native reports do not apply legacy `runsDir`, quiet-time failure rules, waiter commands, or token plugins.

`wake` waits `minutes` (0 through 25) and emits a delayed informational snapshot. One exclusive lock per parent/project prevents concurrent sleepers; dead sleeper PIDs are reclaimed under a short exclusive claim. An unreadable lock, uncertain PID, or interrupted claim is reported as unavailable; remove that lock or `.claim` directory from `noticeDir` only after confirming its owner is no longer running. Delivery occurs at Codex's next safe point or user turn. It cannot wake an idle chat or automatically resume work. No native backend has been installed or enabled by creating this source.
