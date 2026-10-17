// Codex canonical hook inputs use Bash.command and apply_patch.command.
// Also accept raw exec_command/cmd and freeform patch input for explicit replay.
export function normalizeInput(input) {
  const raw = input?.tool_input;
  const ti = typeof raw === 'string' ? { command: raw } : { ...(raw || {}) };
  if (typeof ti.command !== 'string') {
    if (typeof ti.cmd === 'string') ti.command = ti.cmd;
    else if (typeof ti.patch === 'string') ti.command = ti.patch;
    else if (typeof ti.input === 'string') ti.command = ti.input;
    else if (Array.isArray(ti.command)) ti.command = ti.command.join(' ');
  }
  return { ...input, tool_input: ti };
}

// Parse patch headers, not arbitrary source lines, so all files in a single call
// are checked. A move gates both the old and the new path. Update text is a
// fragment: only added/context lines are checked, never deleted text.
export function patchChanges(input) {
  if (input.tool_name !== 'apply_patch') return [];
  const text = String(input.tool_input?.command || '');
  const changes = [];
  let current;
  for (const line of text.split(/\r?\n/)) {
    const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
    if (header) {
      current = { path: header[2].trim(), text: '', fullBody: header[1] === 'Add', operation: header[1] };
      changes.push(current);
    } else if (line.startsWith('*** Move to: ') && current) {
      current.moveTo = line.slice(13).trim();
    } else if (current && (line.startsWith('+') || line.startsWith(' '))) {
      current.text += line.slice(1) + '\n';
    }
  }
  return changes.flatMap(change => change.moveTo ? [change, { ...change, path: change.moveTo }] : [change]);
}
