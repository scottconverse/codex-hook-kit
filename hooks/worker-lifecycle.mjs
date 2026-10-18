// Supported SubagentStart/SubagentStop inputs; store only lifecycle metadata.
import { load, loadFromStdin } from '../lib/config.mjs';
import { recordWorkerLifecycle } from '../lib/desktop-workers.mjs';
const current=loadFromStdin('worker-lifecycle');
const {input}=current;
let section=load('no-idle',input).section;
if(section?.backend!=='codex-desktop') {
 const canonical=load('delayed-report',input);
 section=canonical.cfg && Object.hasOwn(canonical.cfg.config,'delayed-report') ? canonical.section : load('wake',input).section;
}
if(section?.backend==='codex-desktop') {
 try {recordWorkerLifecycle(section,input);process.stdout.write('{}');}
 catch {process.stdout.write(JSON.stringify({systemMessage:'UNKNOWN: native worker lifecycle receipt could not be persisted; verify event fields and project stateDir.'}));}
}
