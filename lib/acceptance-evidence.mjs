// Read existing evidence; never launch tests, mutate goal state, or infer semantic
// completion from file timestamps. A recorded pass remains an operator claim.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const hash = x => createHash('sha256').update(x).digest('hex');

export function inspectEvidence(root, section) {
  const file = path.resolve(root, section.evidenceFile);
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const required = section.requiredIds;
  if (!Array.isArray(required) || !required.length || new Set(required).size !== required.length) throw Error('requiredIds must contain the original unique requirement IDs');
  if (!Array.isArray(data.requirements)) throw Error('requirements must be an array');
  const issues=[]; let passed=0;
  for (const id of required) {
    const rows=data.requirements.filter(r=>r.id===id);
    if(rows.length!==1) {issues.push(`${rows.length?'duplicate':'missing'} requirement ${id}`); continue;}
    const r=rows[0];
    if(r.status!=='passed') {issues.push(`${id}: ${r.status||'unverified'}`);continue;}
    if(!Array.isArray(r.evidence)||!r.evidence.length) {issues.push(`${id}: no evidence`);continue;}
    let valid=true;
    if(section.candidate && r.candidate!==section.candidate) {issues.push(`${id}: candidate mismatch`);valid=false;}
    for(const e of r.evidence) {
      try {
        if(!e.path||!/^[a-f0-9]{64}$/i.test(e.sha256||'')) throw Error('missing path or SHA256');
        if(hash(fs.readFileSync(path.resolve(root,e.path)))!==e.sha256.toLowerCase()) throw Error('hash mismatch');
      } catch(error) {issues.push(`${id}: ${error.message}`);valid=false;}
    }
    if(valid) passed++;
  }
  return {passed,total:required.length,issues,message:`${data.scope||'Authorized work'}: ${passed}/${required.length} requirements have recorded passes with matching evidence. ${issues.length?'INCOMPLETE: '+issues.join('; '):'Evidence bindings match; this does not independently establish that each artifact proves its claim.'}`};
}

export function evidenceDecision(root,section,input,name) {
  let result;
  try {result=inspectEvidence(root,section);} catch(error) {result={issues:[error.message],message:'INCOMPLETE: evidence unavailable: '+error.message};}
  // Completion claim matching is configurable, not a semantic truth detector.
  // Use anchored affirmative patterns; negation/quotation needs human judgment.
  let claim=false;
  if(name==='completion-gate' && section.claimPattern) {
    try {claim=new RegExp(section.claimPattern,'i').test(String(input.last_assistant_message||''));}
    catch {result.issues.push('Invalid claimPattern');result.message+='; Invalid claimPattern';}
  }
  const dir=path.join(root,'.codex','evidence-state');
  const stateFile=path.join(dir,hash(name+'\0'+String(input.session_id||'unknown'))+'.json');
  let state={};try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{}
  if(!state||typeof state!=='object'||Array.isArray(state))state={};
  const key=hash(result.message);
  const shouldBlock=claim&&result.issues.length&&!input.stop_hook_active&&state.blocked!==key;
  const shouldReport=state.reported!==key;
  state.reported=key;if(shouldBlock)state.blocked=key;
  try {fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(state));}
  catch {return {systemMessage:result.message+'; cannot persist evidence notice state; continuation suppressed.'};}
  if(shouldBlock)return {decision:'block',reason:result.message+' Correct the completion claim; do not start broad tests or rebuilds from this hook.'};
  if(shouldReport)return {systemMessage:result.message};
  return null;
}
