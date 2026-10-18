// Inject a project's rules file into every prompt (UserPromptSubmit / SessionStart).
// Port of reference/tr-inject-rules.mjs: same JSON output shape, rules file from config.
// Config section "inject-rules": { rulesFile, heading }
//   rulesFile: path to the rules text (absolute, or relative to the project folder that holds .codex/)
//   heading:   the line put in front of it
import fs from "node:fs";
import { loadFromStdin, load, resolveIn } from "../lib/config.mjs";
import {recordOwnerPrompt,readLifecycle} from '../lib/stop-policy.mjs';
import {consumeDelayedReport} from '../lib/delayed-delivery.mjs';

const { input, section, cfg } = loadFromStdin("inject-rules");
const contexts=[];
if(cfg && input.hook_event_name==='UserPromptSubmit') {
  const canonical=load('delayed-report',input);
  const delayed=Object.hasOwn(cfg.config,'delayed-report')?canonical.section:load('wake',input).section;
  if(delayed) {
    recordOwnerPrompt(cfg.dir,input);
    const state=readLifecycle(cfg.dir,input);
    if(!state.paused && !state.answerOnly && !state.stateError) {
      const report=consumeDelayedReport(cfg.dir,input);
      if(report) contexts.push('DELAYED WORKER REPORT (recorded at the previous Stop; current status may have changed):\n'+report);
    }
  }
}

const file = section && resolveIn(section.cfg, section.rulesFile);
let text = "";
let rulesRead=false;
try {
  if(file) {text = fs.readFileSync(file, "utf8");rulesRead=true;}
} catch {}
if(rulesRead) contexts.push(String(section.heading || "PROJECT RULES (obey every line, no exceptions):")+'\n'+text);
if(!contexts.length) process.exit(0);

let event = "UserPromptSubmit";
try {
  if (input.hook_event_name) event = input.hook_event_name;
} catch {}

const out = {
  hookSpecificOutput: {
    hookEventName: event,
    additionalContext: contexts.join('\n\n'),
  },
};
process.stdout.write(JSON.stringify(out));
