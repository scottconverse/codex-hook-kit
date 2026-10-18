# Configuration keys

The tables below retain filesystem-policy options and add the portable adapters.
See [MANUAL.md](MANUAL.md) for protocol, tool coverage and limits. Every policy
section may use `enabled:false`; an absent section is off. Present malformed
sections, enabled flags, mappings and configured regexes fail visibly.
Known finite numeric ranges, booleans, string arrays and nested check/rule controls
are validated before the corresponding behavior. `diagnostics` and `stop-policy`
controls are validated before observations or continuation decisions.

## Shared and adapter options

| Section | Keys | Meaning and reference |
|---|---|---|
| Top level | `projectConfig` | Absolute authoritative policy path; mapped root owns relative paths. [Mapping guide](ledger-mapping.md). |
| `stop-policy` | `maxContinuations` | Shared installed Stop budget, default 2, integer 0–10. [Lifecycle guide](lifecycle.md). |
| `goal-lifecycle` | `enabled` | Opt-in goal-tool pause decision logic; runtime interception needs separate proof. [Lifecycle guide](lifecycle.md). |
| `diagnostics` | `enabled` | Opt-in metadata receipts; invocation/emission is not delivery. [Doctor guide](DIAGNOSTICS.md). |
| `read-ledger-gate` | `requireTargetCoverage`, `taskReadingFiles` | Exact existing target rows; explicit prerequisites for new code. Recorded `sha256` verifies bytes. [Mapping guide](ledger-mapping.md). |
| `deploy-gate` | `authorizationFile` | Existing attributed owner scope, optional exact commit, and publication command/skip matching. [Publication guide](release-database.md). |
| `db-write-guard` | `hosts`, `defaultHost`, `defaultPort` | Endpoint-aware local/live versus guest/test rules, together with existing `port` and `databases`. [Database guide](release-database.md). |
| `no-idle`, `delayed-report` | `backend` | `codex-desktop` selects native worker evidence; omitted retains filesystem mode. |
| Native worker sections | `source` | `auto` (default), `native-hooks` or `sqlite`; native stop may receive same-turn terminal corroboration. |
| Native worker sections | `codexHome`, `parentThreadId` | Optional home and parent overrides; otherwise environment/user home and event session. |
| Native worker sections | `lookbackHours`, `adoptFrom` | SQLite lookback default 48; optional first-adoption ISO baseline. Old terminal evidence is history, not newly unhandled. |
| Native worker sections | `stateDir`, `noticeDir`, `handledFile` | Project-local lifecycle/adoption state, bounded notice claims, completion-token acknowledgement JSON. [Worker guide](desktop-workers.md). |
| Native `delayed-report` | `minutes` | Delay 0–25 minutes, default 20; pause/answer-only suppress before and after delay. |
| `measure-gate`, `completion-gate` | `mode`, `evidenceFile`, `requiredIds`, `candidate`, `requiredInputs` | `mode:"evidence"` verifies existing artifact/product hashes without commands. Per-ID `requiredInputs` arrays must match each result's `inputs` paths/hashes. [Evidence guide](evidence-mode.md). |
| `completion-gate` evidence | `claimPattern` | Configured final-message completion wording; bounded correction, not semantic truth detection. |
| `completion-gate` command | `taskId`, `inputs`, `check`, `reuse`, `maxFailures`, `maxMinutes` | Authorized acceptance command, byte-bound cache, retained regions and task limits. [Completion guide](COMPLETION.md). |

`delayed-report` is canonical; `wake` remains a legacy section/script alias. If
both sections exist, canonical configuration wins, including when disabled.
The filesystem options below for delayed reports retain their legacy meaning;
native worker mode does not use folder markers or quiet-time failure inference.

## Filesystem and inherited policy options

| Hook | Key | Type | Default | Meaning |
|---|---|---|---|---|
| (top level) | `enabled` | boolean | `true` | `false` turns the kit off for this folder tree. |
| `inject-rules` | `rulesFile` | path | none | The rules text file. A missing file injects nothing. |
| `inject-rules` | `heading` | text | `PROJECT RULES (obey every line, no exceptions):` | Line placed before the rules. |
| `deploy-gate` | `commandPattern` | regex | none | Matches a deploy command. |
| `deploy-gate` | `skipPatterns` | list of regex | none | A match means the command is not a deploy. |
| `deploy-gate` | `repoDir` | path | none | Git repo that holds the commit. |
| `deploy-gate` | `shaFrom` | `origin/main` or `HEAD` | `origin/main` | Which commit is gated. |
| `deploy-gate` | `gatesDir` | path | none | Folder of `<sha>.json` gate files. |
| `deploy-gate` | `skillName` | text | none | Prefix on the block message. |
| `deploy-gate` | `label` | text | `this project` | Name used when the commit cannot be read. |
| `deploy-gate` | `pathLine` | text | none | Extra line in the block message. |
| `deploy-gate` | `nextStep` | text | `Do the missing tier, then write the gate file.` | Last line of the block message. |
| `deploy-gate` | `requiredKeys` | list | none | Field checks: `key`, `test`, `expected`, `min`, `pattern`, `message`. |
| `deploy-gate` | `mustEqual` | list | none | Field pairs that must match: `key`, `other`, `message`. |
| `deploy-gate` | `reportKey` | text | none | Gate field holding the walk report path. |
| `deploy-gate` | `reportMessage` | text | `<reportKey>: path to an existing walk report` | Message when the report is missing. |
| `deploy-gate` | `reportMustContain` | regex | none | Text the walk report must match. |
| `deploy-gate` | `reportMustContainMessage` | text | `walk report must contain the line` plus the regex | Message when the report does not match. |
| `deploy-gate` | `findingsFile` | path | none | Findings list. A missing file blocks. |
| `deploy-gate` | `openPattern` | regex | none | Matches an OPEN finding row. |
| `deploy-gate` | `textOnlyKey` | text | `textOnly` | Gate field that turns on text-only mode. |
| `deploy-gate` | `textOnly` | object | none | Text-only checks: `requiredKeys`, `filesKey` (`textFiles`), `filesMessage`, `extraMessage`. |
| `walk-brief-guard` | `pathPattern` | regex | none | Matches a walk brief path or command. |
| `walk-brief-guard` | `heredocPattern` | regex | none | A matching command counts as a full file body. |
| `walk-brief-guard` | `bannedPatterns` | list | none | `{ pattern, message }`. A match blocks. |
| `walk-brief-guard` | `requiredLines` | list | none | `{ pattern, message, onlyFullBody }`. Must match. |
| `walk-brief-guard` | `requiredSections` | list | none | Same shape. Multiline flag. |
| `walk-brief-guard` | `skillName` | text | none | Prefix on the block message. |
| `walk-brief-guard` | `footer` | text | `Every walk brief must tell the walker how to finish the walk.` | Last line of the block message. |
| `db-write-guard` | `port` | number | none | The live database port. |
| `db-write-guard` | `databases` | list | none | Names that mean the live database. |
| `db-write-guard` | `clientPattern` | regex | none | Matches client and tool commands. |
| `db-write-guard` | `skipPattern` | regex | built-in | Notes and edits that are allowed. |
| `db-write-guard` | `sqlArgPattern` | regex | built-in | Overrides a skip match. |
| `db-write-guard` | `portPattern` | regex | built-in, from `port` | Matches the live port. |
| `db-write-guard` | `writePattern` | regex | built-in | SQL write words. |
| `db-write-guard` | `filePattern` | regex | built-in | SQL file arguments. |
| `db-write-guard` | `restorePattern` | regex | none | Restore, create or drop commands. |
| `db-write-guard` | `okFile` | path | none | The go file. Its modified time is checked. |
| `db-write-guard` | `okMinutes` | number | `30` | How long a go lasts. |
| `db-write-guard` | `label` | text | `the live database` | Name used in the block message. |
| `db-write-guard` | `explanation` | text | `The live database is read-only for me.` | Second line of the block message. |
| `db-write-guard` | `ownerName` | text | `the owner` | The owner's name in the go line of the block message. |
| `db-write-guard` | `skillName` | text | none | Prefix on the block message. |
| `no-idle` | `runsDir` | path | none | Folder of worker folders. |
| `no-idle` | `logNames` | list | `["run.jsonl", "stream.jsonl"]` | Log file names, first one found wins. |
| `no-idle` | `handledFile` | text | `handled.txt` | Recorded-action file in a worker folder. |
| `no-idle` | `finishedFile` | text | `finished.txt` | File that marks a worker as finished. |
| `no-idle` | `quietMinutes` | number | `15` | Quiet-time threshold in legacy folder mode; not proof of failure. |
| `no-idle` | `lookbackHours` | number | `48` | Only logs changed this recently are checked. |
| `no-idle` | `handledHint` | text | none (the built-in `Act now` line, section 6.5) | Hint for a finished worker. |
| `no-idle` | `stuckHint` | text | `Diagnose and relaunch, or mark it handled on purpose.` | Hint for a stuck worker. |
| `no-idle` | `waiterHeartbeat` | path | none | File a live waiter keeps touching. |
| `no-idle` | `waiterFreshMinutes` | number | `3` | How recent the heartbeat must be. |
| `no-idle` | `waiterCheck` | command | none | Exits 0 when a waiter is alive. |
| `no-idle` | `waiterCheckArgs` | list of text | none | Arguments for `waiterCheck`. |
| `no-idle` | `waiterHint` | text | none | Hint shown with the waiter message. |
| `no-idle` | `header` | text | `you may not end this turn yet.` | First line of the block message. |
| `no-idle` | `hookName` | text | `no-idle` | Name shown in the block message. |
| `double-check` | `quote` | text | none | Shown before the checklist. |
| `double-check` | `checklist` | list of text | six built-in lines | The checklist. |
| `double-check` | `minToolCalls` | number | `0` | Ask only after this many tool calls. |
| `double-check` | `label` | text | none | Name in the header. |
| `read-ledger-gate` | `ledgerFile` | path | `.codex/READ-LEDGER.md` | The read ledger. |
| `read-ledger-gate` | `upstreamRoots` | list of paths | the project folder | Where relative row paths are looked up. |
| `read-ledger-gate` | `requireExisting` | boolean | `true` | Every row must name a real file. |
| `read-ledger-gate` | `verifyLines` | boolean | `true` | The stated count must equal the real line count. |
| `read-ledger-gate` | `minEntries` | number | `1` | Rows needed before code may be written. |
| `read-ledger-gate` | `minLines` | number | `0` | Real lines read, in total. |
| `read-ledger-gate` | `mustMention` | list of text | none | Each word must appear in some row path. |
| `read-ledger-gate` | `codePattern` | regex | built-in | Paths that count as code. |
| `read-ledger-gate` | `exemptPattern` | regex | built-in | Paths never gated. |
| `read-ledger-gate` | `shellWritePattern` | regex | built-in | Shell commands that write files. |
| `read-ledger-gate` | `rowPattern` | regex | built-in | A ledger row: path, then count. |
| `read-ledger-gate` | `label` | text | project folder name | Name in the block message. |
| `read-ledger-gate` | `skillName` | text | none | Prefix on the block message. |
| `read-ledger-gate` | `nextStep` | text | built-in | Last line of the block message. |
| `measure-gate` | `receiptFile` | path | none | One receipt file. |
| `measure-gate` | `receiptDir` | path | none | Folder of receipts; the newest counts. |
| `measure-gate` | `receiptPattern` | regex | `.` | Receipt file names. |
| `measure-gate` | `requireMatch` | regex | none | Text the newest receipt must contain. |
| `measure-gate` | `codeDirs` | list of paths | the project folder | Folders scanned for code. |
| `measure-gate` | `codePattern` | regex | built-in | Paths that count as code. |
| `measure-gate` | `ignorePattern` | regex | built-in | Folders never scanned. |
| `measure-gate` | `maxDepth` | number | `8` | Folder depth scanned. |
| `measure-gate` | `maxBlocks` | number | `3` | Blocks per turn before giving up. |
| `measure-gate` | `measureCommand` | text | none | Shown in the block message. |
| `measure-gate` | `label` | text | project folder name | Name in the block message. |
| `measure-gate` | `hookName` | text | `measure-gate` | Name in the block message. |
| `delayed-report` | `minutes` | number | `20` | Delay before the informational report. |
| `delayed-report` | `runsDir` | path | none | Folder of worker folders. |
| `delayed-report` | `minutesFile` | path | `<runsDir>/.rewake-seconds` | Seconds that replace `minutes`. |
| `delayed-report` | `lockFile` | file name | `.rewake-lock.json` | Lock file in `runsDir`. |
| `delayed-report` | `logNames` | list | `["run.jsonl", "stream.jsonl"]` | Log file names, first one found wins. |
| `delayed-report` | `handledFile` | text | `handled.txt` | Recorded-action file in a worker folder. |
| `delayed-report` | `finishedFile` | text | `finished.txt` | File that marks a worker as finished. |
| `delayed-report` | `quietMinutes` | number | `15` | Quiet-time label in legacy folder mode; not proof of failure. |
| `delayed-report` | `lookbackHours` | number | `48` | Only logs changed this recently are listed. |
| `delayed-report` | `label` | text | the project folder name | Project name in the header. |
| `delayed-report` | `hookName` | text | `delayed-report` | Name in the header. |
| `delayed-report` | `timeZone` | IANA name | `America/Denver` | Time zone used for the printed time. |
| `delayed-report` | `timeZoneName` | text | `Mountain` | Zone name printed after the time. |
| `delayed-report` | `footer` | text | built-in | Last line of the delayed report. |
| `delayed-report` | `tokenModule` | path | none | Module that adds a `tokens:` line per worker. |
