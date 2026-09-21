import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const pattern=repo=>new RegExp('^127\\.0\\.0\\.1:15050/'+repo+'@sha256:[a-f0-9]{64}$');
export function renderDeployment(template,appImage,brokerImage){
 if(typeof appImage!=='string'||typeof brokerImage!=='string'||/[\r\n]/.test(appImage+brokerImage)||!pattern('grid').test(appImage)||!pattern('grid-mqtt').test(brokerImage))throw Error('Exact immutable app and broker digests required');
 if(typeof template!=='string'||template.includes('\r')||template.includes('\t'))throw Error('Unsupported deployment template formatting');
 const lines=template.split('\n');
 if(lines.filter(x=>x==='kind: Deployment').length!==1)throw Error('Exactly one deployment required');
 const expected=new Map([['containers/app',appImage],['containers/mqtt',brokerImage],['initContainers/migrate-mqtt-storage',brokerImage]]),seen=new Set();
 let section=null,slot=null,kind=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(line==='---')kind=null;
  if(line.startsWith('kind: '))kind=line.slice(6);
  if(/^      (initContainers|containers):$/.test(line)){if(kind!=='Deployment')throw Error('Container section outside deployment');section=line.trim().slice(0,-1);slot=null;continue;}
  if(line.trim()&&!line.trim().startsWith('#')&&/^\S|^ {1,6}\S/.test(line)){section=null;slot=null;}
  const name=line.match(/^        - name: ([a-z0-9-]+)$/);
  if(name){slot=section?section+'/'+name[1]:null;if(!expected.has(slot))throw Error('Unknown or misplaced container slot');if(seen.has(slot))throw Error('Duplicate container slot');seen.add(slot);if(!/^          image: \S+$/.test(lines[i+1]||''))throw Error('Expected single image immediately after container name');const old=lines[i+1].slice('          image: '.length),isApp=slot==='containers/app';if(old!==(isApp?'GRID_IMAGE':'MQTT_IMAGE')&&!pattern(isApp?'grid':'grid-mqtt').test(old))throw Error('Unexpected prior image');lines[++i]='          image: '+expected.get(slot);continue;}
  if(/^\s*image\s*:/.test(line))throw Error('Ambiguous or unexpected image field');
 }
 if(seen.size!==expected.size)throw Error('Missing required container slot');
 const output=lines.join('\n');if(/GRID_IMAGE|MQTT_IMAGE/.test(output))throw Error('Unresolved image placeholder');return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const [app,broker,file]=process.argv.slice(2);if(!file)throw Error();process.stdout.write(renderDeployment(readFileSync(file,'utf8'),app,broker));}catch{console.error('Deployment rendering failed; exact digests and canonical template slots required.');process.exitCode=1;}}
