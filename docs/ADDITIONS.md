# Implemented improvements and remaining limits

This page replaces the original port's forward-looking suggestions. It records
current distinctions; it does not authorize extra work or new gates.

| Original suggestion | Current implementation | Remaining limitation |
|---|---|---|
| Evidence of inspection/reuse | Exact ledger targets, optional SHA256 freshness, explicit task-reading prerequisites; optional completion retained-region checks | Matching bytes/rows do not prove reading, comprehension, licensing or sufficient reuse |
| Measurements tied to checked code | Acceptance-command input fingerprints/cache; evidence mode checks configured per-requirement product inputs and artifact hashes | Hash binding does not prove that an artifact demonstrates the requirement; external state can change |
| Shared bounded Stop policy | Default two continuation requests shared across installed Stop hooks, plus per-hook limits and native snapshot deduplication | No active-time/no-progress meter or global cross-project budget |
| Visible broken policy | Invalid present configuration, mappings and configured regexes fail explicitly | Policy/authorization/evidence state remains ordinary editable files |
| Process ownership/recovery | Delayed-report PID locks, bounded diagnostic children and transactional install recovery | Arbitrary product subprocess ownership and dependency-aware cleanup are not supplied |
| Desktop activation proof | Selected earlier Desktop guard observations and historical isolated CLI fixtures are identified separately | Exact current-candidate activation, async delivery and goal-tool interception require their own runtime evidence |

See [COMPLETION.md](COMPLETION.md), [evidence-mode.md](evidence-mode.md),
[desktop-workers.md](desktop-workers.md), [ledger-mapping.md](ledger-mapping.md),
[lifecycle.md](lifecycle.md), [INSTALLATION.md](INSTALLATION.md) and
[DIAGNOSTICS.md](DIAGNOSTICS.md) for configuration and verified scope.

These remain cooperative workflow checks. Stronger security enforcement requires
protected policy and runtime permissions rather than trusting agent-editable files.
