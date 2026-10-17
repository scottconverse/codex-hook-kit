import fs from 'node:fs';

// Best-effort compatibility only. Codex documents transcripts as unstable;
// native turn_id is preferred by the measurement gate.
export function transcriptStats(file) {
  const lines = fs.readFileSync(String(file || ''), 'utf8').trim().split('\n');
  let calls = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    let m;
    try { m = JSON.parse(lines[i]); } catch { continue; }
    const p = m?.payload;
    const c = m?.message?.content;
    if (m?.type === 'response_item') {
      if (p?.type === 'message' && p.role === 'user') return { calls, turnKey: 'L' + i };
      if (p?.type === 'function_call' || p?.type === 'custom_tool_call') calls++;
    }
    if (m?.type === 'user' && !(Array.isArray(c) && c.some(x => x?.type === 'tool_result'))) {
      return { calls, turnKey: 'L' + i };
    }
    if (m?.type === 'assistant' && Array.isArray(c)) calls += c.filter(x => x?.type === 'tool_use').length;
  }
  return { calls, turnKey: 'unknown' };
}
