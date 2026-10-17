# What I would add next

The narrow [completion gate](COMPLETION.md) now implements exact retained-region checks, command execution bound to input content, caching, and a shared task correction limit. The broader suggestions below remain recommendations, not claims of protection.

## 1. Evidence of inspection and reuse — highest priority

The present ledger accepts accurate file counts. An agent can compute those without reading the source, and can read it without reusing it.

Add a capability reuse map containing upstream repository and commit, file hashes, relevant functions, destination files, adapter boundaries and a concrete gap justification for new code. Verify file identities and copied/adapted regions mechanically. Supplement it with observed tool-read records where tool coverage permits. Neither proves comprehension; a review must still assess the integration.

Do not use a large minimum line count as a proxy for good engineering. Deduplicate ledger rows, constrain canonical paths to approved upstream roots, and handle spaces in file paths.

## 2. Measurements tied to the code actually checked

Require a structured receipt with source revision or dirty-tree content hash, command, exit status, measured numerator/denominator, environment identity and artifacts. Verify receipt schema and binding. An edited receipt file or a newer mtime must not suffice.

For installations, record the executable and data roots observed outside application redirection, plus the actual user launch path. For research, record source recall and successful acquisition separately.

## 3. A bounded stop policy shared by all hooks

Carry an owner-defined total budget, no-progress duration and cumulative defect retry count across continuations, compaction and sessions. End with an explicit incomplete status when exhausted. Give no-idle a cap so it cannot force indefinite continuation. A hook requesting another review should not reset the budget.

## 4. Protect the gate itself

Validate configuration instead of silently disabling malformed policy. Identify missing prerequisites before starting work. Separate owner approvals from agent-written markers and keep authority outside agent-writable directories when stronger enforcement is desired.

Do not call a user-writable JSON file a security boundary. Inventory unsupported tools and shell write routes explicitly.

## 5. Process ownership and dependency-aware cleanup

Record each owned PID, start time, executable, port and data folder. Require observed exit for owned processes. Before cleanup, resolve junctions and dependent checkouts and produce an exact retention/removal manifest. This addresses the orphan-server and deleted-dependency failures from Siftwing.

## 6. Desktop activation proof

Provide a short visible client acceptance flow: a deliberately denied scratch edit, a valid-evidence edit, one bounded Stop continuation, and uninstall. Store client/runtime identity in the result. CLI validation must remain separately labeled.

I would start with items 1 and 2 for Siftwing. They address skipped reuse and unsupported completion claims directly.

