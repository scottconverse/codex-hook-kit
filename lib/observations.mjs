// Metadata only: emission does not prove Desktop delivery.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function recordObservation(root,hookName,input) {
  const dir=path.join(root,'.codex','hook-observations');
  const key=createHash('sha256').update(hookName+'\0'+String(input.hook_event_name || '')).digest('hex');
  const receipt={hook:hookName,event:input.hook_event_name || 'unknown',time:new Date().toISOString(),session:input.session_id || null,tool:input.tool_name || null,provenance:'hook invocation; replay cannot be excluded',delivery:'not established by this receipt'};
  try {fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,key+'.json'),JSON.stringify(receipt));return receipt;} catch {return null;}
}
