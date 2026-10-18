# Owner authorization and bounded Stop behavior

Installed hooks share a default budget of two continuation requests per owner
prompt. Configure `"stop-policy": {"maxContinuations": 2}` (integer 0–10).
Concurrent hooks claim the budget exclusively. A busy or unwritable state file
suppresses continuation with an unfinished-work notice. Exhaustion never marks a
goal complete. Legacy direct invocation without `--codex` retains exit-code behavior.

`UserPromptSubmit` records explicit standalone `pause`, `stop`, `resume`,
`continue`, or `go` commands, optionally with `please` and `work`, `the goal`,
`the task`, `here`, or `now`. A later resume replaces a pause. Requests containing
`answer only`, `read only`, `report only`, or `do not act` suppress Stop work for
that prompt. Resume forms such as `resume work from handoff` and `resume work on
the current task` also clear the recorded pause. Other natural-language authorization remains an interpretation for
the assistant and owner; this parser is deliberately not a semantic classifier.
Hook-generated continuation prompts do not replenish the budget. Without prompt
events, the fallback budget is finite for the session rather than replenished on
every Stop event. Pauses suppress Stop checks before acceptance commands run.

Early October 18 observations omitted new lifecycle hooks because the open Desktop session retained earlier configuration/trust. A Settings hook toggle, restored to its original value, refreshed the session without restarting; actual Desktop get_goal PreToolUse/PostToolUse then ran. A subsequent real owner “continue” prompt invoked lifecycle recording and delivered a pending worker report as model context. Without prompt events the fallback remains session-bounded. The assistant must follow the owner regardless of coverage. See [installation](INSTALLATION.md) and [current verification](CURRENT-VERIFICATION.md).

Opt in to `"goal-lifecycle": {}` to deny a `PreToolUse` event for
`update_goal(status="paused")` unless the latest recorded authorization is a
pause. PostToolUse records the observed operation, not an invented authoritative
goal state. These hooks do not call goal tools, change goals themselves, or certify
completion. The underlying tool result remains authoritative.

**Coverage depends on the runtime delivering those tool events.** The installed Desktop route has observed get_goal PreToolUse/PostToolUse. Pause denial/admission was separately exercised in isolated CLI threads; no real Desktop goal was changed as a probe. A runtime omitting goal events cannot enforce this guard. Reminders and operation receipts alone do not certify goal state or completion.

State is project-local under `.codex/hook-lifecycle`, keyed by session. No prompt
text, tool result content, or credentials are retained. This is cooperative agent
guarding, not a security boundary against modification of its own configuration.
