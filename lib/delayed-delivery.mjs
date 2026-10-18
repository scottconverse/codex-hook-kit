// One bounded pending report per project/session. Stop warnings are UI output;
// UserPromptSubmit supplies the supported model-context delivery point.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const MAX_REPORT_CHARS=16384;
function pendingFile(root,input) {
  if(typeof input.session_id!=='string' || !input.session_id) return null;
  return path.join(root,'.codex','delayed-reports',createHash('sha256').update(input.session_id).digest('hex')+'.json');
}
export function queueDelayedReport(root,input,report) {
  const file=pendingFile(root,input);
  if(!file) return false;
  const temporary=file+'.'+randomUUID()+'.tmp';
  try {
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(temporary,JSON.stringify({session:input.session_id,report:String(report).slice(0,MAX_REPORT_CHARS)}),{flag:'wx'});
    fs.renameSync(temporary,file);
    return true;
  } catch {return false;}
  finally {try {fs.unlinkSync(temporary);} catch {}}
}
export function consumeDelayedReport(root,input) {
  const file=pendingFile(root,input);
  if(!file) return null;
  const claim=file+'.'+randomUUID()+'.consuming';
  try {
    // Rename claims this snapshot atomically. New reports use the original path;
    // concurrent consumers cannot claim this one, and a crash holds no mutex.
    fs.renameSync(file,claim);
    if(fs.statSync(claim).size>MAX_REPORT_CHARS*6+1024) return null;
    const value=JSON.parse(fs.readFileSync(claim,'utf8'));
    if(value.session!==input.session_id || typeof value.report!=='string' || value.report.length>MAX_REPORT_CHARS) return null;
    return value.report;
  } catch {return null;}
  finally {try {fs.unlinkSync(claim);} catch {}}
}
