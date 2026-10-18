import {loadFromStdin,block} from '../lib/config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {recordOwnerPrompt,readLifecycle,lifecycleFile} from '../lib/stop-policy.mjs';
const {input,cfg,section}=loadFromStdin('goal-lifecycle');
if(!cfg || cfg.config.enabled===false) process.exit(0);
if(input.hook_event_name==='UserPromptSubmit') {
  try {recordOwnerPrompt(cfg.dir,input);} catch {process.stdout.write(JSON.stringify({systemMessage:'Hook lifecycle state could not be recorded; authorization is unestablished.'}));}
} else if(section && input.hook_event_name==='PreToolUse' && /(?:^|__)update_goal$/.test(input.tool_name || '')) {
  const state=readLifecycle(cfg.dir,input);
  if(input.tool_input?.status==='paused' && !state.paused) block('Goal pause denied: no current explicit owner pause is recorded.');
} else if(section && input.hook_event_name==='PostToolUse') {
  const observation={tool:input.tool_name,requestedStatus:input.tool_input?.status || null,time:new Date().toISOString(),result:'PostToolUse observed; consult authoritative goal tool result'};
  const file=lifecycleFile(cfg.dir,input)+'.goal.json';
  try {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(observation));}
  catch {process.stdout.write(JSON.stringify({systemMessage:'Goal operation observed but lifecycle receipt could not be saved.'}));}
}
