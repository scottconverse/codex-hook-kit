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
