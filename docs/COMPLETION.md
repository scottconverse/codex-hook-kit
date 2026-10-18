# Finishing without an audit treadmill

`completion-gate` is an opt-in Stop hook. It runs **one existing acceptance command** and, when configured, verifies exact upstream code regions in destination files. It adds no product dependency and asks for no prose report, line-count quota, reviewer agent or new test suite. Keep the check specific to the agreed outcome.

Use `node init-project.mjs C:/dev/project --example completion` to create the sample configuration. Edit it to the actual project before enabling the section. The sample is disabled so placeholder paths cannot execute accidentally.

```json
{
  "completion-gate": {
    "taskId": "approved-feature-1",
    "inputs": ["src", "checks/acceptance.mjs", "package.json", "package-lock.json"],
    "check": {"command": "node", "args": ["checks/acceptance.mjs"], "timeoutMs": 30000},
    "maxFailures": 3,
    "maxMinutes": 60,
    "reuse": []
  }
}
```

`inputs` must cover the code, acceptance script, fixtures and configuration that affect the check. List real paths; symlinks fail visibly. Directory inputs omit `.git`, `.codex` and `node_modules`. Dependency lockfiles must be included. Results are not invalidated by installed dependency or external service changes; include a relevant version/fixture input, or use an uncached manual integration check for those boundaries. Avoid listing generated output among inputs: checks that mutate their inputs are rejected.

`command` runs directly, without a shell, in the project root. Use `node` plus a script, or `powershell.exe -NoProfile -File ...`; a Windows `.cmd` wrapper may require its interpreter. The process has a maximum 60-second timeout and 1 MiB output buffer. Use short checks that exit and do not launch background helpers. This timeout does not guarantee termination of arbitrary grandchildren. Commands need prior task authorization, just like normal tool calls.

A zero exit permits stopping. A nonzero exit, timeout, missing input or reuse mismatch requests a correction. The gate hashes input bytes and policy: both passing and failing results are cached until those bytes change. A fake newer PASS receipt has no effect. Output is discarded rather than written into receipts, to avoid copying secrets.

The default is one failure plus two opportunities to correct it. The count survives new Codex sessions and edits under the same `taskId`. Unchanged failures consume a continuation opportunity without rerunning the command. After three failures, or the elapsed window, `continue:false` ends the loop with an INCOMPLETE reason. The wall-clock window starts at the first Stop evaluation, **not the beginning of project work**. It is not an active-time or no-progress meter. Passed unchanged work stays passed after the window expires. Only a newly authorized task should get a new ID; do not reset state to evade an exhausted limit.

For a lean project, enable only the checks required by its acceptance contract. `double-check`, `measure-gate`, `no-idle` and `delayed-report` remain available for their specific behaviors; `wake` is a legacy alias. Installed Stop requests also share `stop-policy.maxContinuations`, default two, and explicit pause/answer-only state suppresses checks. The acceptance command's task failure limit is separate from this shared continuation budget.

## Existing-evidence mode

Set `mode: "evidence"` to inspect an existing structured report without executing tests or builds. Configure `evidenceFile`, the unchanged `requiredIds`, and optional exact `candidate`. For each required result, evidence paths and hashes must still match. To bind results to product bytes, configure `requiredInputs` as an object mapping each requirement ID to an array of product paths; each must appear exactly once in that result's `inputs` with its current SHA256. An unchanged report cannot certify changed configured product inputs.

`claimPattern` recognizes configured completion wording in `last_assistant_message`; it is not semantic detection. Incomplete matching claims request only a bounded correction. See [evidence-mode.md](evidence-mode.md). Matching hashes remain claims about evidence relevance, which must be assessed by a reader.

## Optional upstream reuse

Each `reuse` row names an upstream region that the owner expects to be retained:

```json
{"source":"../upstream/core.mjs","startLine":10,"endLine":25,"sha256":"<64 lowercase hex characters>","destination":"src/core.mjs"}
```

Hash the UTF-8 text of the inclusive source lines, normalizing CRLF to LF and joining with LF **without adding a trailing newline**. The destination must contain that exact region and differ from the source path. Both files enter the input fingerprint automatically. This checks actual retained bytes, including inside adapted files. It rejects an accurate read ledger with no retained destination code.

It does not prove comprehension, licensing, semantic equivalence of rewritten code, execution, or sufficient reuse. Do not fill the map with trivial unused snippets. Use the agreed acceptance command to exercise the real adapter/import path. An empty map disables reuse checking; it does not certify that reuse occurred.

## Enforcement boundary

Historical Codex CLI Stop continuation and terminal stop were exercised with an isolated deterministic local fixture. Current-candidate Desktop activation requires separate runtime evidence; see [COMPATIBILITY.md](COMPATIBILITY.md). Configuration and `.codex/completion-state` remain editable project files. Present malformed project JSON and configured invalid regexes now fail visibly. No hook can force good engineering or make an inadequate acceptance command meaningful.
