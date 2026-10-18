# Publication scope and database endpoints

`deploy-gate.authorizationFile` opts into an existing owner scope record instead of
the legacy gate checklist. Paths are relative to the project root. A record such as
`{"authorized":false,"source":"owner instruction / goal reference"}` blocks matching
publication commands. This does not block candidate builds or checks unless their
commands match `commandPattern`.

An already granted publication go uses
`{"authorized":true,"source":"existing owner go reference","commit":"<full commit>"}`.
The commit must exactly match `shaFrom` (default `HEAD` in this mode) in `repoDir`.
Explicit `--source-sha` and `--target` arguments must match it too. Missing, invalid,
unattributed, or mismatched records block publication. This record is an attributable
receipt, not authenticated authority, and must preserve the owner's actual scope.
There is no expiry or requirement to repeat permission already granted. Without
`authorizationFile`, the original deployment checklist behavior remains active.

Command and skip regexes are evaluated separately for each shell statement in this
mode. Use a narrowly anchored dry-run skip for the actual publisher invocation. Never
skip an entire command because it contains `echo`, `Set-Content`, or `--dry-run`:
those may occur alongside a separate publication statement. This command inspection
is a shell heuristic; it cannot discover arbitrary script bodies, dynamic invocation,
or aliases.

For the inspected CivicCast publisher, `publish_beta_candidate.py` publishes by
default; `--dry-run` is its local preparation mode. It has no `--publish` or `--github`
flag. The native-beta-candidate-artifacts workflow builds candidate artifacts and
does not invoke this publisher. A starting configuration for ordinary direct commands:

```json
{
  "deploy-gate": {
    "commandPattern": "publish_beta_candidate[.]py|\\bgh(?:[.]exe)?\\s+release\\s+(?:create|edit|upload|delete|delete-asset)\\b",
    "skipPatterns": ["^\\s*(?:&\\s*)?(?:python(?:[.]exe)?|py)\\s+[\"']?(?:[^\\s\"']*[/\\\\])?publish_beta_candidate[.]py[\"']?\\s+(?=[^;\\r\\n]*--dry-run(?:\\s|$))"],
    "authorizationFile": ".codex/publication-scope.json",
    "repoDir": ".",
    "shaFrom": "HEAD"
  }
}
```

`gh release view/list/download` are reads. Create/edit/upload/delete alter external
release state, including drafts. Other repositories' release tools may use explicit
publish flags; match those actual commands only after inspecting their behavior.

`db-write-guard.hosts` opts into endpoint-aware rules. Set `hosts` to the protected
server's literal names/addresses, `port` to its live port, and `defaultHost` /
`defaultPort` to the endpoint used when flags are omitted. The guard recognizes
`-h`/`--host`, `-p`/`--port`, PostgreSQL URIs, and inline `PGHOST`/`PGPORT` assignments.
It inspects each statement so a guest command cannot exempt a later local command.
Explicit different database names (`-d`/`--dbname` or URI path) remain separate from
the live database. An omitted database is conservatively treated as live.

```json
{
  "hosts": ["127.0.0.1", "localhost", "::1"],
  "port": 5432,
  "defaultHost": "127.0.0.1",
  "defaultPort": 5432,
  "databases": ["civiccast"]
}
```

With that endpoint configuration, local live writes are guarded; writes to a guest
at `172.18.33.75:5432`, another port, or an explicitly named test database pass.
Reads pass. Existing `okFile` freshness/`okMinutes` authorization behavior is retained.
The guard cannot resolve inherited environment variables, libpq service files, DNS
aliases, or application-internal database connections; list known live aliases and
configure client commands to match the actual entrypoints. Legacy projects without
`hosts` keep their port-only behavior.
