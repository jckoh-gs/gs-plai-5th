// File-only preservation. This helper does not authorize or perform final recording.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const codeFiles=['scripts/media/media-deadline.cjs','scripts/media/record-demo.cjs','scripts/media/recording-sources.cjs','scripts/media/release-binding.cjs','scripts/media/release-features.cjs','scripts/media/validate-command-download.cjs','scripts/media/scene-plan.cjs','scripts/media/prepare-final-scenes.cjs','scripts/verify-release.mjs','scripts/pod-identity.mjs','scripts/vpp-client.js','scripts/client-message.js','package.json','package-lock.json'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function preserveRecordingSources({configPath,out,root=process.cwd()}){
 const resolve=p=>path.resolve(root,p),originalConfig=fs.readFileSync(resolve(configPath)),config=JSON.parse(originalConfig);
 const manifestBytes=fs.readFileSync(resolve(config.releaseManifest)),manifest=JSON.parse(manifestBytes);
 for(const url of [config.baseUrl,config.mqtt?.url].filter(Boolean)){const parsed=new URL(url);if(parsed.username||parsed.password)throw Error('Credentials must use private files, not recorded URLs');}
 const secrets=[config.tokenFile,config.mqtt?.passwordFile].filter(Boolean).map(file=>fs.readFileSync(resolve(file),'utf8').trim()).filter(Boolean);
 if(secrets.some(secret=>originalConfig.includes(Buffer.from(secret))))throw Error('Recording configuration contains a credential value');
 const privatePath=resolve('artifacts/private'),privateReal=fs.existsSync(privatePath)?fs.realpathSync(privatePath):privatePath;
 const within=(base,target)=>{const relative=path.relative(base,target);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
 const credentialPaths=[config.tokenFile,config.mqtt?.passwordFile].filter(Boolean).map(file=>fs.realpathSync(resolve(file)));
 const uploads=[...new Set(config.scenes.flatMap(s=>(s.actions||[]).filter(a=>a.type==='upload').map(a=>a.file)))];
 // Validate all inputs before creating or copying any delivery files.
 const assets=uploads.map((source,i)=>{
  if(typeof source!=='string'||!source)throw Error('Recording input asset path required');
  const absolute=resolve(source),real=fs.realpathSync(absolute);
  if(within(privatePath,absolute)||within(privateReal,real)||credentialPaths.includes(real))throw Error('Recording input asset cannot be a private credential path');
  const bytes=fs.readFileSync(real);if(secrets.some(secret=>bytes.includes(Buffer.from(secret))))throw Error('Recording input asset contains a credential value');
  return {source,path:`source/input-${i+1}-${path.basename(source)}`,bytes};
 });
 const inputs=[...codeFiles.map(source=>({source,path:'source/code/'+source,bytes:fs.readFileSync(resolve(source))})),...assets];
 const output=path.resolve(root,out),sourceDir=path.join(output,'source');fs.mkdirSync(sourceDir,{recursive:true});
 const write=(relative,bytes)=>{const destination=path.join(output,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});};
 write('source/recording-config.original.json',originalConfig);write('source/release-manifest.json',manifestBytes);
 const files=[];for(const input of inputs){write(input.path,input.bytes);files.push({source:input.source,path:input.path,sha256:sha(input.bytes)});}
 const reproduction={schemaVersion:1,releaseCommit:manifest.source.commit,recordingConfig:'source/recording-config.original.json',recordingConfigSha256:sha(originalConfig),files,credentialsIncluded:false,instructions:'Use the repository and recorded source hashes. Supply fresh local credential files and verify the intended deployment. Change outputDir to a new directory. Final-mode time and release guards remain mandatory.'};
 write('source/reproduction.json',JSON.stringify(reproduction,null,2)+'\n');return reproduction;
}
module.exports=preserveRecordingSources;module.exports.codeFiles=Object.freeze(codeFiles);
