# Configuration keys

The optional `completion-gate` section and its `taskId`, `inputs`, `check`, `reuse`, `maxFailures` and `maxMinutes` fields are documented in [COMPLETION.md](COMPLETION.md). The original nine sections follow.

Adapted from the original kit. See MANUAL.md for Codex protocol differences and limits.

## 11. Config key reference

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
| `db-write-guard` | `skipPattern` | regex | built-in (section 6.4) | Notes and edits that are allowed. |
| `db-write-guard` | `sqlArgPattern` | regex | built-in (section 6.4) | Overrides a skip match. |
| `db-write-guard` | `portPattern` | regex | built-in, from `port` (section 6.4) | Matches the live port. |
| `db-write-guard` | `writePattern` | regex | built-in (section 6.4) | SQL write words. |
| `db-write-guard` | `filePattern` | regex | built-in (section 6.4) | SQL file arguments. |
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
| `no-idle` | `quietMinutes` | number | `15` | Minutes of silence before a worker is stuck. |
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
| `double-check` | `checklist` | list of text | six built-in lines (section 6.6) | The checklist. |
| `double-check` | `minToolCalls` | number | `0` | Ask only after this many tool calls. |
| `double-check` | `label` | text | none | Name in the header. |
| `read-ledger-gate` | `ledgerFile` | path | `.codex/READ-LEDGER.md` | The read ledger. |
| `read-ledger-gate` | `upstreamRoots` | list of paths | the project folder | Where relative row paths are looked up. |
| `read-ledger-gate` | `requireExisting` | boolean | `true` | Every row must name a real file. |
| `read-ledger-gate` | `verifyLines` | boolean | `true` | The stated count must equal the real line count. |
| `read-ledger-gate` | `minEntries` | number | `1` | Rows needed before code may be written. |
| `read-ledger-gate` | `minLines` | number | `0` | Real lines read, in total. |
| `read-ledger-gate` | `mustMention` | list of text | none | Each word must appear in some row path. |
| `read-ledger-gate` | `codePattern` | regex | built-in (section 6.8) | Paths that count as code. |
| `read-ledger-gate` | `exemptPattern` | regex | built-in (section 6.8) | Paths never gated. |
| `read-ledger-gate` | `shellWritePattern` | regex | built-in (section 6.8) | Shell commands that write files. |
| `read-ledger-gate` | `rowPattern` | regex | built-in (section 6.8) | A ledger row: path, then count. |
| `read-ledger-gate` | `label` | text | project folder name | Name in the block message. |
| `read-ledger-gate` | `skillName` | text | none | Prefix on the block message. |
| `read-ledger-gate` | `nextStep` | text | built-in (section 6.8) | Last line of the block message. |
| `measure-gate` | `receiptFile` | path | none | One receipt file. |
| `measure-gate` | `receiptDir` | path | none | Folder of receipts; the newest counts. |
| `measure-gate` | `receiptPattern` | regex | `.` | Receipt file names. |
| `measure-gate` | `requireMatch` | regex | none | Text the newest receipt must contain. |
| `measure-gate` | `codeDirs` | list of paths | the project folder | Folders scanned for code. |
| `measure-gate` | `codePattern` | regex | built-in (section 6.8) | Paths that count as code. |
| `measure-gate` | `ignorePattern` | regex | built-in (section 6.9) | Folders never scanned. |
| `measure-gate` | `maxDepth` | number | `8` | Folder depth scanned. |
| `measure-gate` | `maxBlocks` | number | `3` | Blocks per turn before giving up. |
| `measure-gate` | `measureCommand` | text | none | Shown in the block message. |
| `measure-gate` | `label` | text | project folder name | Name in the block message. |
| `measure-gate` | `hookName` | text | `measure-gate` | Name in the block message. |
| `wake` | `minutes` | number | `20` | Delay before the informational report. |
| `wake` | `runsDir` | path | none | Folder of worker folders. |
| `wake` | `minutesFile` | path | `<runsDir>/.rewake-seconds` | Seconds that replace `minutes`. |
| `wake` | `lockFile` | file name | `.rewake-lock.json` | Lock file in `runsDir`. |
| `wake` | `logNames` | list | `["run.jsonl", "stream.jsonl"]` | Log file names, first one found wins. |
| `wake` | `handledFile` | text | `handled.txt` | Recorded-action file in a worker folder. |
| `wake` | `finishedFile` | text | `finished.txt` | File that marks a worker as finished. |
| `wake` | `quietMinutes` | number | `15` | Minutes of silence before a worker is stalled. |
| `wake` | `lookbackHours` | number | `48` | Only logs changed this recently are listed. |
| `wake` | `label` | text | the project folder name | Project name in the header. |
| `wake` | `hookName` | text | `wake` | Name in the header. |
| `wake` | `timeZone` | IANA name | `America/Denver` | Time zone used for the printed time. |
| `wake` | `timeZoneName` | text | `Mountain` | Zone name printed after the time. |
| `wake` | `footer` | text | built-in (section 6.7) | Last line of the wake-up message. |
| `wake` | `tokenModule` | path | none | Module that adds a `tokens:` line per worker. |
