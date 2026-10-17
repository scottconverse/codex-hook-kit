# Handoff to Codex: finish the Codex hook kit on the real runtime

Written October 17, 2026. This file is the brief. Start from this repository only; nothing
outside it is required context.

## What this kit is

A port of `claude-hook-kit` (commit `5371320`, now public) for local Codex sessions. Ten hooks,
per-project opt-in through `.codex/hook-kit.json`, registered once in `CODEX_HOME/hooks.json`.
Read `README.md`, then `docs/VERIFICATION.md`, then `docs/COMPATIBILITY.md`.

## What is proven

- 109 tests pass (`npm test`), all by running each hook as a child process with a hand-built
  event on stdin.
- Native **CLI** shell denial and allowance were verified once with a real `codex exec` probe
  and a deterministic loopback model (`docs/native-probe.json`, `docs/completion-probe.json`).

## What is not proven (your job)

Each item below ends with a receipt committed under `docs/`. Do not mark an item done without
its receipt. If an item cannot be done, write that in `docs/VERIFICATION.md` with the reason.

1. **Real install.** Run `node install.mjs` against a real `CODEX_HOME` (a throwaway one first:
   `node install.mjs --config-dir <temp>`; then the owner's, only after step 2 passes on the
   temp home). Record the exact `hooks.json` written and the trust prompt Codex shows.
2. **Desktop activation.** Open the Codex Desktop app in a project that has
   `.codex/hook-kit.json` (use `node init-project.mjs <dir> --example agent-build` and fill in
   real paths). Attempt an `apply_patch` to a code file with no `READ-LEDGER.md`. Capture the
   stdin event the app sent (the hooks can log it; add a `--dump <file>` flag if needed) and the
   app's response. `VERIFICATION.md:55` currently says this is UNVERIFIED. Make it VERIFIED or
   explain exactly why it cannot be.
3. **Native `apply_patch` blocking.** `VERIFICATION.md:54` and `COMPATIBILITY.md:34` say the
   native fixture could not expose `apply_patch`. Find the configuration that does, run
   `read-ledger-gate` and `walk-brief-guard` against a real patch, and record the denial JSON the
   runtime accepted. If exit code 2 is honored for `apply_patch` after all, say so and simplify.
4. **Stop continuation.** Prove on the real runtime that `measure-gate` blocks the first Stop,
   that `stop_hook_active` (or Codex's equivalent turn id) arrives on the next Stop, and that the
   `maxBlocks` give-up path ends the turn with the stale-receipt note visible to the user.
5. **`sprint-gate` port.** Port the state machine from `scottconverse/antistallcodex`
   (`scripts/antistall.py`): arm per project, block Stop while armed, honor `stop_hook_active`,
   cap. Then add the hardening the Claude original has and the Codex port never got: disarm
   requires a human secret (`scottconverse/AntiStallClaude`, `hooks/antistall.py:76-152`,
   PBKDF2 + masked dialog). Same config style as the other hooks; parity tests against the
   originals in `reference/`.
6. **Live install acceptance.** Port `scripts/check_plugin_install_acceptance.py --live` from
   `scottconverse/agent-pipeline-codex`: a fresh `codex exec` that proves the kit's hooks are
   loaded and trusted in a given `CODEX_HOME`. Wire it as `node doctor.mjs`.
7. **`docs/ADDITIONS.md` §3 and §6** (shared bounded-stop policy; Desktop activation proof) are
   the two additions the previous author ranked first. Do them after 1–4.

## Rules for this work

- Read the code you change before you change it. Add a row to `.codex/READ-LEDGER.md` for each
  file, with its real line count. The kit's own `read-ledger-gate` should be on for this repo
  while you work on it (`node init-project.mjs . --example agent-build`, then edit the config).
- Every step ends with a number or a captured event in `docs/`. "It works" without a receipt is
  not done.
- Never write a credential, token, or home-folder path from the owner's machine into this repo.
- Do not change `reference/` (the preserved Claude kit snapshot) or `SOURCE.json`.
- Keep `npm test` green; add tests for each new behavior; keep the installer idempotent and
  backed up.
- Commit per step. Do not push without the owner's go.

## Owner's known constraints

- Windows 11, Node 24, PowerShell 7. Codex Desktop and Codex CLI both installed.
- The owner's real `CODEX_HOME` is `%USERPROFILE%\.codex`. It currently has **no**
  `hooks.json`. Back it up before writing it.
- Hooks require trust approval in Codex before they fire. Installation alone does not arm them.
