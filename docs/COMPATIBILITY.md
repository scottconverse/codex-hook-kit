# Compatibility and verification

Current source: 1.1.0, October 18, 2026. Tested environment: Windows, Node 24.15.0, versioned Codex runtime 0.160.0. Node 22.13 or newer is required; other platforms and minimum-version execution are not yet tested.

## Evidence boundaries

| Layer | Evidence and limit |
|---|---|
| Current source | Consolidated `npm test`: 156 tests, 156 passed, 0 failed/skipped, exit 0, 15897.3231 ms on Windows/Node 24.15.0. Coverage includes mapping/ledger, publication/database scope, worker adoption/terminal states, lifecycle/shared Stop limits and product-bound evidence. Source tests alone do not prove client routing. |
| Existing Desktop installation | Selected real tool calls observed rule injection, covered patch denial, command denials/allowances and Stop review continuation. This was an earlier installation, not blanket activation of every current-candidate path. |
| Current candidate native CLI | A versioned 0.160.0 CLI probe used the installer-pinned Node command: denied scratch write left its marker absent; admitted write created it; subprocess exited zero. This is CLI evidence, not current Desktop activation. |
| Read-only doctor | Versioned 0.160.0 supports the hook-list API. After candidate installation, all 16 registrations report trusted-current. Node 24.15.0 SQLite capability passed; the diagnostic child closed. Trust does not establish event delivery. |
| Native worker compatibility | Read-only snapshots matched the setup workers' observed start/completion states. Open spawn edges also existed for completed tasks; silence is not failure. |
| Native lifecycle hooks | Documented SubagentStart/SubagentStop fields are implemented and directly tested. Actual delivery must be observed on the installed client before claiming runtime support. |
| Delayed report | Output generation, locking, pause suppression and metadata receipts are directly tested. Async Desktop delivery remains a separate runtime acceptance item. No automatic wake/resumption is supplied. |
| Goal operations | A current isolated CLI probe denied an unauthorized goal pause and admitted explicit owner pause, with two model requests per case and no active real goal. This proves that tested CLI route; Desktop goal-tool routing remains pending. |
| Historical CLI fixtures | The October 16 isolated probes exercised structured shell denial/allowance and acceptance-command Stop continuation using a deterministic local model endpoint. See the historical receipts below. |

## Current Desktop observations, October 18

The installed candidate delivered SessionStart project instructions and the Stop
double-check reminder into the actual conversation. Shell PreToolUse receipts
were recorded. All configured Stop scripts were invoked; disabled sections still
remain off. The delayed reporter emitted its three-second probe output, but its
message was not observed in the conversation. The delay was restored to 20 minutes.

A fresh real worker produced no SubagentStart receipt, and a nested get_goal call
produced no goal-hook receipt. A subsequent owner message produced an inject-rules
UserPromptSubmit receipt, but no goal-lifecycle receipt. Consequently this route does not currently establish
native worker-event delivery, goal interception, or owner-prompt authorization
tracking. Without prompt events, the shared Stop budget remains session-bounded;
it cannot reliably reset for each owner message or enforce their pause intent.
Do not rely on those protections on this route. The prompt event exists, but the
new lifecycle registration has not been observed executing in this open session.

Live process inspection identifies Desktop 26.1013.4894.0 running the external
Codex 0.160.0 app-server with code mode enabled. Runtime log rows 260420446 and
260420460 identify successful native collaborationspawn_agent dispatch and
thread_spawn handling. Therefore an orchestration bypass is not an established
cause. No supported live refresh remedy was established. A fresh Desktop session
is the next diagnostic boundary for distinguishing retained registrations from
missing routing; it is not a promised fix.

The existing SQLite compatibility adapter did identify the newly running worker,
while labeling older terminal results ADOPTED-HISTORY rather than newly ignored.
This is working compatibility monitoring, not proof of a public worker-control API.

The requested outcomes are reconciled in [CURRENT-VERIFICATION.md](CURRENT-VERIFICATION.md); installation and doctor details are in [INSTALLATION.md](INSTALLATION.md) and [DIAGNOSTICS.md](DIAGNOSTICS.md). Windows commands target the default PowerShell hook executor; customized `cmd` execution has not been verified. Do not infer trust, activation or async delivery from a configuration file, hook listing, subprocess fixture or emission receipt alone.

## Protocol and tool coverage

The [official Codex hook reference](https://learn.chatgpt.com/docs/hooks) documents command inputs, structured outputs, trust and lifecycle events. Hook availability still depends on the actual runtime and orchestration path. Local registrations should not be assumed to apply to cloud sessions.

| Path or concern | Handling | Boundary |
|---|---|---|
| Project policy | Nearest `.codex/hook-kit.json`, explicit mappings and per-section opt-in | Editable policy is not an independent trust boundary |
| Native registration | Selected home `hooks.json` and generated command paths | Other inline/plugin hook layers may also remain active |
| `Bash` | Canonical command input checked | Shell recognition is heuristic |
| `apply_patch` | Add/Update/Delete/Move targets and changed text parsed | Partial updates do not contain complete file bodies |
| Named shell aliases | Explicit matcher/normalization support | Actual routing needs a runtime probe |
| `write_stdin` | No new PreToolUse for an existing session | Interactive commands can bypass command guards |
| Arbitrary MCP/hosted/opaque writes | Not a complete effects detector | Do not claim universal write enforcement |
| Tool denial | Installed `--codex` structured JSON | Historical fixture found exit code 2 alone insufficient |
| Stop continuations | Shared default maximum two plus applicable per-hook limits | No active-time or global cross-project budget |
| Owner lifecycle | Narrow explicit pause/resume/answer-only recognition | No semantic authorization proof |
| Native workers | Supported hook receipts; observed SQLite compatibility fallback | SQLite and transcript formats are internal/unstable |
| Async information | Delayed-report output, subject to runtime processing | Cannot start an idle turn |

Malformed present project configuration, mappings and configured regexes fail visibly. Explicit disabled/absent policy remains off. Metadata observation receipts cannot exclude replay and expressly do not prove delivery.

## Historical receipts

[native-probe.json](native-probe.json) and [completion-probe.json](completion-probe.json) belong to the October 16 Windows CLI fixture environment, identified in [VERIFICATION.md](VERIFICATION.md). They are not current Desktop activation receipts. The historical native patch fixture did not expose its tool reliably; subsequent selected Desktop patch observations do not retroactively make that fixture pass.

Original behavioral parity remains useful for inherited filesystem policy. Native worker mode adds adoption and evidence semantics; delayed reporting intentionally differs from automatic Claude wake behavior. See [desktop-workers.md](desktop-workers.md).

## Remaining limits

Ledger rows/hashes do not prove reading, comprehension or reuse. Existing evidence hashes prove only artifact/product binding, not that the artifact proves its claim. Timestamp-only measurement retains its weaker meaning. Command inspection cannot reliably detect dynamic scripts, shell aliases or inherited connection state. Ordinary policy, marker, lifecycle and evidence files remain editable. Restoring only a plain registration backup does not restore script bytes; use the transaction rollback guide. These are workflow guardrails requiring review, not an access-control sandbox.
