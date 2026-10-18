# Project mapping and read coverage

A chat directory can use another project's configuration by placing this in its
nearest `.codex/hook-kit.json`:

```json
{ "projectConfig": "C:/Projects/CivicCast/.codex/hook-kit.json" }
```

`projectConfig` must be an absolute file path. It delegates the entire configuration;
sections beside the mapping are not merged. Mapping chains are supported, and cycles,
missing/unreadable targets, malformed JSON and non-object mapped configs explicitly
block with a configuration error. In Codex mode this uses the native denial response.
Without a mapping, existing discovery and disabled-section behavior is unchanged.

The final config file owns relative paths. For a config inside `.codex/`, its parent
project directory is the root. For a config elsewhere, the directory containing the
file is the root. This applies to the ledger, upstream roots and task reading files.
Tool target paths remain relative to the hook event's `cwd` (or the process cwd when
absent); mapping a chat does not change where its tool writes happen.

Enable relevant reading with this section in the authoritative project config:

```json
{
  "read-ledger-gate": {
    "requireTargetCoverage": true,
    "upstreamRoots": ["."],
    "taskReadingFiles": ["src/existing-component.ts"]
  }
}
```

With `requireTargetCoverage: true`, every existing gated code target must have its own
readable ledger row at the same resolved file path. An unrelated `AGENTS.md` row or a
different file with the same basename does not cover it. For new code targets, declare
the existing files relevant to that task in `taskReadingFiles`; all declared files must
have actual readable ledger rows. These entries are relative to the authoritative
project root, or absolute. A nonexistent row never satisfies task coverage even with
`requireExisting: false`. Existing line-count and minimum-entry rules still apply.
Target coverage is off by default, preserving the earlier upstream-ledger behavior.

After actually reading a file, record its path and line count in the ledger:

```text
- src/existing-component.ts — 42 lines
```

Optionally append `sha256:<64 hex characters>` (or `sha256=<64 hex characters>`) to a
row. When recorded, the digest must match the file's current bytes even when
`verifyLines: false`; a change with the same line count is rejected. Empty or malformed
digests are rejected. Hashes are optional, so older rows remain valid. Use the digest
of the exact bytes read, then read and update the row again when those bytes change.

The gate checks recorded evidence against files; it does not prove comprehension or
record reads automatically. Do not populate rows for files that have not been read.
