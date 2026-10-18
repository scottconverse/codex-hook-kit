# Existing evidence without automatic test loops

Both `measure-gate` and `completion-gate` accept `mode: "evidence"`, an
`evidenceFile`, and `requiredIds` listing the unchanged authorized requirements.
This mode launches no commands, builds, tests or goal updates. It does not replace
installed verification with a source check or treat a newer timestamp as a pass.

The JSON evidence record has `scope` and `requirements`. Each requirement has an
`id`, a `status` (`passed`, `failed`, or `unverified`), and optionally explanatory
notes. A passed requirement needs at least one `evidence` entry with `path` and
`sha256`. Missing/duplicate required IDs, missing files and changed hashes are
reported incomplete. If configuration supplies `candidate`, passed requirements
must name that exact candidate. Paths resolve against the authoritative project.
An agent-written status and matching hash are still claims: a person or agent must
read the artifact and determine whether it actually proves the requirement.

Measurement reports changed evidence status once per session. Completion also
accepts `claimPattern`, matched against the event's `last_assistant_message`.
Use a narrowly anchored affirmative completion phrase. A matching claim with
incomplete evidence requests at most one correction for that unchanged evidence;
continuation events do not block again. This is not semantic detection of every
possible completion claim. Missing final-message input cannot enforce that check.
Status-only reports do not start correction cycles. Unwritable notice state emits
an explicit warning and suppresses continuation rather than creating a loop.

Legacy timestamp and acceptance-command modes are unchanged. Evidence mode is for
multi-stage work whose real acceptance cannot safely run inside a short Stop hook.
