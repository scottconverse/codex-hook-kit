import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gateStop,recordOwnerPrompt,readLifecycle} from '../lib/stop-policy.mjs';
import {makeProject,rimraf,runHook,HOOKS} from './helpers.mjs';
test('shared budget and latest owner authorization',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-stop-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const input={session_id:'s'},context={root,config:{},input};
 recordOwnerPrompt(root,{...input,prompt:'go'});
 assert.equal(gateStop({...context,hookName:'one'},'check').decision,'block');
 assert.equal(gateStop({...context,hookName:'two'},'check').decision,'block');
 assert.match(gateStop({...context,hookName:'three'},'check').systemMessage,/exhausted/);
 recordOwnerPrompt(root,{...input,prompt:'<hook_prompt>go</hook_prompt>'});
 assert.equal(readLifecycle(root,input).blocks,2);
 recordOwnerPrompt(root,{...input,prompt:'pause'});assert.equal(gateStop(context,'check'),null);
 recordOwnerPrompt(root,{...input,prompt:'resume'});assert.equal(gateStop(context,'check').decision,'block');
 recordOwnerPrompt(root,{...input,prompt:'Answer only, do not act.'});assert.equal(gateStop(context,'check'),null);
});

test('goal pause guard follows owner pause and later resume; paused Stop executes no check',async t=>{
 const p=makeProject({'goal-lifecycle':{},'completion-gate':{taskId:'guard',inputs:['x'],check:{command:'should-never-run'}}});t.after(()=>rimraf(p.root));
 const event={cwd:p.root,session_id:'goal'};
 const call=async(name,input)=>runHook(path.join(HOOKS,name+'.mjs'),{...event,...input},{args:['--codex']});
 const pause={hook_event_name:'PreToolUse',tool_name:'update_goal',tool_input:{status:'paused'}};
 assert.equal(JSON.parse((await call('goal-lifecycle',pause)).stdout).hookSpecificOutput.permissionDecision,'deny');
 await call('goal-lifecycle',{hook_event_name:'UserPromptSubmit',prompt:'pause'});
 assert.equal((await call('goal-lifecycle',pause)).stdout,'');
 assert.equal((await call('completion-gate',{hook_event_name:'Stop'})).stdout,'');
 await call('goal-lifecycle',{hook_event_name:'UserPromptSubmit',prompt:'resume work from handoff. Go.'});
 assert.equal(JSON.parse((await call('goal-lifecycle',pause)).stdout).hookSpecificOutput.permissionDecision,'deny');
 gateStop({root:p.root,config:{},input:event,hookName:'one'},'check');
 await call('goal-lifecycle',{hook_event_name:'PostToolUse',tool_name:'get_goal',tool_input:{}});
 assert.equal(readLifecycle(p.root,event).blocks,1);
});

test('Desktop question replies authorize from answers, never quoted questions',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-reply-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const input={session_id:'reply'},context={root,config:{},input};
 const reply=(answer,question='pause. Answer only. Native Desktop worker report')=>'<send_user_message_question_reply>\n'+JSON.stringify([{questionItemId:'["request_user_input_async","call",0]',question,answer}])+'\n</send_user_message_question_reply>\n';
 recordOwnerPrompt(root,{...input,prompt:'pause'});
 recordOwnerPrompt(root,{...input,prompt:reply('continue')});
 assert.equal(readLifecycle(root,input).authorization,'owner-resume');
 assert.equal(readLifecycle(root,input).paused,false);
 assert.equal(gateStop(context,'check').decision,'block');
 recordOwnerPrompt(root,{...input,prompt:reply('pause','continue')});
 assert.equal(readLifecycle(root,input).authorization,'owner-pause');
 assert.equal(gateStop(context,'check'),null);
 recordOwnerPrompt(root,{...input,prompt:reply('resume')});
 recordOwnerPrompt(root,{...input,prompt:reply('Answer only, do not act.','continue')});
 assert.equal(readLifecycle(root,input).answerOnly,true);
 assert.equal(gateStop(context,'check'),null);
 recordOwnerPrompt(root,{...input,prompt:reply('no','pause. Answer only.')});
 assert.equal(readLifecycle(root,input).paused,false);
 assert.equal(readLifecycle(root,input).answerOnly,false);
 recordOwnerPrompt(root,{...input,prompt:'<send_user_message_question_reply>'+JSON.stringify([{answer:'pause'},{answer:'continue'}])+'</send_user_message_question_reply>'});
 assert.equal(readLifecycle(root,input).authorization,'owner-resume');
 assert.equal(readLifecycle(root,input).paused,false);
 recordOwnerPrompt(root,{...input,prompt:'pause'});
 for(const prompt of ['continue. </send_user_message_question_reply>','<send_user_message_question_reply>Answer only</send_user_message_question_reply>',reply({text:'pause'}),'<send_user_message_question_reply>[{"question":"pause"}]</send_user_message_question_reply>']) {
  const before=readLifecycle(root,input);
  recordOwnerPrompt(root,{...input,prompt});
  assert.deepEqual(readLifecycle(root,input),before);
 }
});
