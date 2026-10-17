// PreToolUse hook (Write|Edit|Bash|PowerShell): a walk brief must tell the walker to press
// Publish and must carry the required closing line and sections. Exit 2 = blocked.
// Port of reference/tr-guard-walk-briefs.mjs.
// Config section "walk-brief-guard":
//   pathPattern     regex string matching a walk brief path
//   heredocPattern  optional; a shell command matching this counts as a full file body
//   bannedPatterns  [{ pattern, message }] regex strings that block
//   requiredLines   [{ pattern, message, onlyFullBody }] regex strings the text must contain
//   requiredSections same shape, checked as ^pattern$m (e.g. "^EVERY DOOR:")
import fs from "node:fs";
import { block, loadFromStdin, rx } from "../lib/config.mjs";
import { patchChanges } from "../lib/tool-input.mjs";

const { input, section } = loadFromStdin("walk-brief-guard");
if (!section) process.exit(0);

const s = section;
const ti = input.tool_input || {};
const tool = String(input.tool_name || "");
const changes = tool === "apply_patch" ? patchChanges(input) : [{
  path: String(ti.file_path || ti.path || ""),
  text: String(ti.content ?? ti.new_string ?? ti.command ?? ""),
  fullBody: tool === "Write",
}];

const pathRx = rx(s.pathPattern, "i");
if (!pathRx) process.exit(0);
const isWalkBriefPath = (v) => pathRx.test(v);

const problems = [];
for (const change of changes) {
const target = change.path;
const text = change.text;
let isWalkBrief = false;
if (tool === "Write" || tool === "Edit" || tool === "apply_patch") isWalkBrief = isWalkBriefPath(target);
else isWalkBrief = isWalkBriefPath(text); // Bash / PowerShell heredoc writes
if (!isWalkBrief) continue;

// Only a full file body (Write, or a shell heredoc) can be checked for closing lines.
const heredocRx = rx(s.heredocPattern, "");
const fullBody = change.fullBody || (heredocRx ? heredocRx.test(text) : false);

for (const b of Array.isArray(s.bannedPatterns) ? s.bannedPatterns : []) {
  const r = rx(b.pattern, "i");
  if (r && r.test(text)) problems.push(String(b.message || "banned pattern: " + b.pattern));
}
for (const r of Array.isArray(s.requiredLines) ? s.requiredLines : []) {
  if (r.onlyFullBody && !fullBody) continue;
  const rrp = rx(r.pattern, "");
  if (rrp && !rrp.test(text)) problems.push(String(r.message || "missing " + r.pattern));
}
for (const r of Array.isArray(s.requiredSections) ? s.requiredSections : []) {
  if (r.onlyFullBody && !fullBody) continue;
  const rrp = rx(r.pattern, "m");
  if (rrp && !rrp.test(text)) problems.push(String(r.message || "missing section " + r.pattern));
}

}
if (problems.length) {
  block(
    "BLOCKED by " + (s.skillName ? s.skillName + ": " : "") + "this walk brief is not allowed:\n  - " +
      problems.join("\n  - ") +
      "\n" + String(s.footer || "Every walk brief must tell the walker how to finish the walk."),
  );
}
process.exit(0);
