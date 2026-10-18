// Opt-in Stop gate: existing acceptance command + optional exact upstream reuse.
import { loadFromStdin, block } from '../lib/config.mjs';
import { evaluate } from '../lib/completion.mjs';
import { evidenceDecision } from '../lib/acceptance-evidence.mjs';

const { input, section } = loadFromStdin('completion-gate');
if (!section) process.exit(0);
if(section.mode==='evidence') {
  const result=evidenceDecision(section.cfg.dir,section,input,'completion-gate');
  if(result)process.stdout.write(JSON.stringify(result));
  process.exit(0);
}
let result;
try { result = evaluate(section.cfg.dir, section); }
catch { result = { terminal: true, reason: 'completion-gate: INCOMPLETE; could not evaluate or persist state' }; }
if (result.pass) process.exit(0);
if (result.terminal) {
  process.stdout.write(JSON.stringify({ continue: false, stopReason: result.reason, systemMessage: result.reason }));
} else block(result.reason);
