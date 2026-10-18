# Reuse and provenance

Source: https://github.com/scottconverse/claude-hook-kit
Local revision: 5371320e12ffc74c99640077ea1400fd8d86f1e8
License: MIT, Copyright 2026 Scott Converse.
The local main branch was one commit ahead of its origin/main tracking branch. The local source is authoritative for this port.

The original hooks and libraries are preserved byte-for-byte in reference/claude-hook-kit/. The six earlier TownReporter reference hooks remain in reference/. SOURCE.json records upstream file hashes, including tests and documentation.

| Upstream code | Reused behavior | Codex adaptation |
|---|---|---|
| lib/config.mjs | stdin, nearest ancestor lookup, opt-in sections, relative paths, regex handling | .codex config, input normalization, explicit --codex JSON decisions |
| lib/hook-entries.mjs | one registration source, grouping and owned-entry identification | native matchers, --codex, async informational wake, stricter kit ownership |
| lib/settings.mjs | registration merging, backups, idempotence, unrelated-entry preservation | hooks.json naming |
| install.mjs, uninstall.mjs, init-project.mjs | copy runtime, merge/remove entries, dry run, project initializer | CODEX_HOME precedence, Codex files and trust notice |
| hooks/inject-rules.mjs | rules injection | .codex paths; JSON shape already compatible |
| hooks/deploy-gate.mjs | exact-commit gate and report/findings checks | common JSON block adapter |
| hooks/db-write-guard.mjs | live DB command checks and fresh approval marker | normalized shell input and JSON block adapter |
| hooks/walk-brief-guard.mjs | required/banned brief content | multi-file patch handling, JSON block adapter |
| hooks/read-ledger-gate.mjs | file rows, real line counts, thresholds and mentions | all patch target types, JSON block adapter |
| hooks/no-idle.mjs | worker logs and waiter checks | JSON Stop continuation |
| hooks/double-check.mjs | one review continuation and configurable checklist | Codex transcript-call counting |
| hooks/measure-gate.mjs | receipt-versus-code freshness and retry budget | native turn IDs, continuation preservation, project/session state, JSON termination warning |
| hooks/wake.mjs | delay, lock and worker status report | async report only, no unsupported automatic wake |
| tests/* | six reference parity suites, project scope and installer tests | Codex paths; wake compares status but intentionally different protocol |
| lib/tool-input.mjs, lib/transcript.mjs | new glue only | native payload and transcript compatibility |
| tools/probe-codex.mjs | new verification tool | deterministic local fixture exercising actual CLI enforcement |

The table describes original reuse boundaries. Version 1.1.0 also adds explicit
project mappings, exact ledger coverage, native lifecycle/adoption adapters,
publication/database scope, product-bound evidence, shared Stop limits and visible
configuration errors. These changes are opt-in where configured and are described
in the current manual and focused guides. The preserved reference snapshot remains
the provenance baseline; it is not a claim that every current behavior is unchanged.

