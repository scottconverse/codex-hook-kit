import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function lifecycleFile(root,input) {
  return path.join(root,'.codex','hook-lifecycle',createHash('sha256').update(String(input.session_id || 'unknown')).digest('hex')+'.json');
}
export function readLifecycle(root,input) {
  try {
    const state=JSON.parse(fs.readFileSync(lifecycleFile(root,input),'utf8'));
    if(!state || typeof state!=='object' || Array.isArray(state) || (state.blocks!==undefined && (!Number.isInteger(state.blocks)||state.blocks<0))) return {stateError:true};
    return state;
  } catch(error) {return error.code==='ENOENT'?{}:{stateError:true};}
}
export function recordOwnerPrompt(root,input) {
  const prompt=String(input.prompt || '').trim();
  if(input.stop_hook_active) return;
  let prompts=[prompt];
  if(/<\/?send_user_message_question_reply/.test(prompt)) {
    // Desktop includes the question as context; only the owner's answers carry intent.
    const wrapped=prompt.match(/^<send_user_message_question_reply>\s*([\s\S]*?)\s*<\/send_user_message_question_reply>$/);
    if(!wrapped) return;
    try {
      const replies=JSON.parse(wrapped[1]);
      if(!Array.isArray(replies) || !replies.length || replies.some(reply=>!reply || typeof reply.answer!=='string')) return;
      prompts=replies.map(reply=>reply.answer.trim());
    } catch {return;}
  }
  if(prompts.some(value=>/<hook_prompt\b|DOUBLE-CHECK|Native Desktop worker report/.test(value))) return;
  const file=lifecycleFile(root,input),lock=file+'.lock';
  fs.mkdirSync(path.dirname(file),{recursive:true});
  let fd;
  for(let attempt=0;attempt<50;attempt++) {
    try {fd=fs.openSync(lock,'wx');break;} catch(error) {
      if(error.code!=='EEXIST') throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
    }
  }
  if(fd===undefined) throw Error('owner authorization state is busy');
  try {
  const previous=readLifecycle(root,input);
  let pause=false,resume=false;
  for(const value of prompts) {
    if(/^(?:please\s+)?(?:pause|stop)(?:\s+(?:work|the goal|the task|here|now))?[.!\s]*$/i.test(value)) {pause=true;resume=false;}
    else if(/^(?:please\s+)?(?:resume|continue|go)(?:\s+(?:work|the goal|the task|now))?(?:[.!\s]*$|[.!]\s|\s+(?:on|from)\b)/i.test(value)) {resume=true;pause=false;}
  }
  const answerOnly=prompts.some(value=>/\b(?:answer|read|report)\s+only\b|\bdo not act\b/i.test(value));
  const state={...previous,stateError:false,epoch:input.turn_id || new Date().toISOString(),blocks:0,paused:pause?true:resume?false:previous.paused===true,answerOnly,authorization:pause?'owner-pause':resume?'owner-resume':previous.authorization || 'unestablished'};
  fs.writeFileSync(file,JSON.stringify(state));
  } finally {fs.closeSync(fd);fs.unlinkSync(lock);}
}
export function gateStop({root,config,input,hookName},message) {
  const file=lifecycleFile(root,input),lock=file+'.lock';
  let fd;
  try {fs.mkdirSync(path.dirname(file),{recursive:true});fd=fs.openSync(lock,'wx');}
  catch {return {systemMessage:`${hookName}: unfinished check; shared Stop state unavailable, continuation suppressed.`};}
  try {
    const state=readLifecycle(root,input);
    if(state.stateError) return {systemMessage:'INCOMPLETE: shared Stop state is malformed; continuation suppressed until a new owner prompt.'};
    if(state.paused || state.answerOnly) return null;
    const limit=config?.['stop-policy']?.maxContinuations ?? 2;
    if(!Number.isInteger(limit)||limit<0||limit>10) return {systemMessage:'INCOMPLETE: invalid stop-policy.maxContinuations (expected 0–10).'};
    if((state.blocks || 0)>=limit) return {systemMessage:`INCOMPLETE: shared Stop continuation budget exhausted. ${message}`};
    state.blocks=(state.blocks || 0)+1;fs.writeFileSync(file,JSON.stringify(state));
    return {decision:'block',reason:message};
  } catch {return {systemMessage:`INCOMPLETE: cannot persist shared Stop budget; ${hookName} continuation suppressed.`};}
  finally {fs.closeSync(fd);fs.unlinkSync(lock);}
}
