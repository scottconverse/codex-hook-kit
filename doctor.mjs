#!/usr/bin/env node
import { diagnose } from './lib/diagnostics.mjs';

const usage = 'usage: node doctor.mjs [--project <directory>] [--config-dir <directory>] [--codex <executable>] [--json]';
const options = {};
let json = false;
try {
  const args = process.argv.slice(2);
  for (let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--help'||arg==='-h') {console.log(usage);process.exit(0);}
    if(arg==='--json') {json=true;continue;}
    const match=/^--(project|config-dir|codex)(?:=(.*))?$/.exec(arg);
    if(!match) throw Error('unknown argument: '+arg);
    const value=match[2] ?? args[++i];
    if(!value||value.startsWith('--')) throw Error('--'+match[1]+' needs a value');
    options[match[1]==='config-dir'?'configDir':match[1]]=value;
  }
  const report=await diagnose(options);
  if(json) console.log(JSON.stringify(report,null,2));
  else {
    console.log('Node: '+report.runtime.node.version+' (minimum '+report.runtime.node.minimum+')');
    console.log('Codex: '+(report.runtime.codex.file||report.runtime.codex.error)+' '+(report.runtime.codex.version||report.runtime.codex.error||''));
    console.log('Hook API: '+report.hooks.support+(report.hooks.error?'; '+report.hooks.error:''));
    console.log('Kit trust: '+report.trust.status+'; registrations: '+report.trust.registrations.length);
    console.log('Project: '+report.project.status+'; '+(report.project.root||report.project.error||report.project.requested));
    for(const error of report.project.errors||[]) console.log('  '+error);
    for(const file of report.prerequisites.files) console.log('  '+(file.exists?'exists':'missing')+': '+file.path+' ('+file.hook+'.'+file.field+')');
    console.log('Invocation receipts: '+report.observations.receipts.length+'; '+report.observations.limitation);
    console.log(report.runtime.limitation);
    console.log('Goal interception: '+report.capabilities.goalToolInterception);
    console.log('Async delivery: '+report.capabilities.asyncDelivery);
    console.log('Idle resumption: '+report.capabilities.idleResumption);
    console.log('Use --json for current hashes, trust records, warnings and receipt metadata.');
  }
} catch(error) {console.error('doctor: '+error.message);process.exitCode=1;}
