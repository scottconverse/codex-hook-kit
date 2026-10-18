// Split shell statements outside quotes. This is a guard heuristic, not a shell parser.
// Database callers keep pipelines together so piped SQL stays with its client.
export function shellSegments(command, { keepPipelines = false } = {}) {
  const parts = [];
  let start = 0, quote = '';
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '`' || (c === '\\' && quote === '"' && /["\\]/.test(command[i + 1] || ''))) { i++; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === ';' || c === '\n' || (c === '&' && command[i + 1] === '&') || (c === '|' && (!keepPipelines || command[i + 1] === '|'))) {
      parts.push(command.slice(start, i));
      if (command[i + 1] === c && (c === '&' || c === '|')) i++;
      start = i + 1;
    }
  }
  parts.push(command.slice(start));
  return parts.filter(p => p.trim());
}
