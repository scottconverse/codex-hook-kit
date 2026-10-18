# Read-only doctor

```text
node doctor.mjs --project C:/Projects/MyProject --config-dir C:/Users/me/.codex --codex C:/path/to/codex.exe --json
```

All flags are optional. `--project` defaults to the current directory. The settings
directory uses `--config-dir`, then `CODEX_HOME`, then `~/.codex`. Executable discovery
uses `--codex`, then `CODEX_BIN`, then an executable on `PATH`. On Windows use a native
`codex.exe`, rather than a `.ps1`, `.cmd` or `.bat` shim. A stale root alias can point
to an older binary; the report names and versions the exact executable it probes.
That executable is not necessarily the one used by the running Desktop app.

Without `--json`, the command prints a short human-readable report. JSON includes
individual hook trust statuses, current hashes, API errors/warnings and invocation
receipt metadata. A successfully generated report exits zero even when it reports
missing prerequisites or unavailable support. Invalid command arguments exit one.

The report keeps these facts separate:

- **Runtime:** Node executable/version and the kit minimum, Node 22.13.0; an actual
  `node:sqlite` / `DatabaseSync` availability check without opening a database; Codex
  executable/version and the settings directory used for the probe.
- **Hook API:** a bounded `app-server` stdio probe sends `initialize` with
  `experimentalApi: true`, `initialized`, then `hooks/list` with the requested cwd.
  Method-not-found is unsupported; a timeout, malformed reply or runtime error is
  unknown. The probe does not create a thread, start a model turn or execute hooks.
- **Trust:** `trustStatus` and `currentHash` returned by the supported API, including
  only kit registrations. Unrelated commands are omitted and counted separately.
  `trusted-current` describes the
  registered kit entries returned by this probe. It does not prove that every
  expected entry is registered, enabled, invoked or delivered.
- **Project:** nearest config discovery, authoritative mapped root, section validation
  and enabled/off states. An absent config stays off; malformed config is visible.
- **Prerequisites:** configured file/directory paths and their existence. The default
  read-ledger path is included. No file is created or authorization granted to make
  this list green. Receipt or authorization paths can legitimately be absent.
- **Invocation:** metadata from the resolved project's `.codex/hook-observations/`.
  Only hook/event/time/tool/provenance fields are reported; logs and assistant message
  contents are not read. Receipts can be replayed and prove neither native delivery
  nor comprehension. Async delivery and goal-tool interception remain unverified
  without appropriate observations; a goal receipt is identified as recorded evidence,
  not independent proof of native interception.

Each diagnostic child has a six-second default deadline and a 2 MiB output cap.
Only that spawned child is terminated at completion or timeout. The report waits for
its close event, or explicitly reports `termination-pending` after a one-second cleanup
deadline. The doctor does not
change project configuration, registrations, trust, goal state or receipt files.
The Codex process may maintain its own ordinary runtime logs while serving this
read-only API request. Receipt reads are bounded to 256 files of at most 64 KiB each.

Async hooks can emit delayed information; they cannot resume an idle chat. An
emission receipt must never be presented as proof that Desktop displayed the result.

Capability summaries distinguish native worker lifecycle receipts, owner-lifecycle
prompt receipts, and synchronous Stop invocation. Rule injection at UserPromptSubmit
does not establish goal-lifecycle execution. Delayed-report emission does not count
as synchronous Stop delivery. Missing receipts are reported as unverified, not as
proof that a runtime can never support that feature. These summaries supplement,
rather than replace, the underlying receipt metadata.
