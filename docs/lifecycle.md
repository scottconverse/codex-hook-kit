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

The October 18 Desktop observation received UserPromptSubmit for rule injection,
but did not invoke the newly registered goal-lifecycle hook. On that observed route, automatic pause/resume recording and
per-prompt budget renewal are unavailable; the assistant must still follow the
owner directly. This is a runtime coverage gap, not successful enforcement.

Opt in to `"goal-lifecycle": {}` to deny a `PreToolUse` event for
`update_goal(status="paused")` unless the latest recorded authorization is a
pause. PostToolUse records the observed operation, not an invented authoritative
goal state. These hooks do not call goal tools, change goals themselves, or certify
completion. The underlying tool result remains authoritative.

**Coverage depends on the runtime delivering those tool events.** Direct hook
tests prove the decision logic, not Desktop interception of goal calls. A runtime
that does not expose goal tools to hooks cannot enforce this guard. The diagnostic
reports that distinction. Reminder injection alone is not enforcement.

State is project-local under `.codex/hook-lifecycle`, keyed by session. No prompt
text, tool result content, or credentials are retained. This is cooperative agent
guarding, not a security boundary against modification of its own configuration.
