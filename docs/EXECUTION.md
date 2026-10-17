# Codex hook-kit port

Follow-up 2026-10-16 21:15–21:24 UTC: user authorized testing the nine hooks and adding useful bounded completion guards. Baseline 104/104 passed after rerunning outside sandbox write restrictions. Added one opt-in completion-gate, four focused tests and one combined nine-hook protocol check. Final 109/109 passed. Real CLI failure/repair and bounded-stop probes passed; unchanged failure check runs once. Desktop activation and native patch remain unverified. No live install/commit/push. No further testing needed for this slice. One documentation patch context mismatch was corrected; no runtime defect retries were needed. Defaults remained within 60 minutes total, 30 no-progress and two corrections.

Started 2026-10-16 17:24 UTC. Budget: 60 active minutes, 30 minutes without progress, initial failure plus two corrections per defect.

Source: `claude-hook-kit` local main, commit `5371320e12ffc74c99640077ea1400fd8d86f1e8` (one commit ahead of its remote-tracking branch). Original remains unchanged. Scott authorized this Codex model to implement directly, overriding the parent worker preference for this task.

Acceptance: preserve the nine named hook concepts and project opt-in conventions; adapt supported events and inputs to Codex; supply installer, uninstaller, initializer, examples, generated snippet, manual, landing page, provenance and tests. Report unsupported behavior explicitly. No live configuration install, commit or push.

Main compatibility boundaries: apply_patch payloads, Codex turn identity/transcripts, JSON-only successful Stop output, hook trust, and lack of asyncRewake. Source checks use the official Codex hooks documentation retrieved on 2026-10-16.

Status: local port delivered. Final npm test: 104/104 PASS, exit 0. Native CLI shell deny/allow verified through an isolated deterministic local fixture. Source kit unchanged (46 file hashes); preserved snapshot exact (18 files).

Corrections: one wake syntax fix; one reference-fixture path fix; one backup-test filename fix; one native JSON-denial fix. Native patch verification stopped after two unsuccessful fixture corrections and remains explicitly unverified. Desktop activation and native Stop continuation were not exercised. No live install, commit or push.

Acceptance and limitations are reconciled in docs/VERIFICATION.md. Recommended additions are documented separately; they have not been silently added as new policy.
