// Validate a downloaded stored-state DTO; never call it external VPP reception evidence.
module.exports=function(bytes,selectedPlantId,secrets=[]){
 if(bytes.length>1024*1024)throw Error('Command state download exceeds expected bound');
 const body=bytes.toString('utf8');for(const secret of secrets)if(secret&&body.includes(secret))throw Error('Known credential found in command state download');
 const dto=JSON.parse(body);const topFields=new Set(['schemaVersion','productVersion','contractVersion','exportedAt','plantId','scope','limit','redaction','commands']);
 if(!dto||typeof dto!=='object'||Array.isArray(dto)||Object.keys(dto).some(k=>!topFields.has(k)))throw Error('Unexpected export document fields');
 if(dto.schemaVersion!==1||dto.contractVersion!==2||dto.scope!=='recent-command-snapshots'||dto.limit!==20||dto.plantId!==selectedPlantId||!Array.isArray(dto.commands)||dto.commands.length>20)throw Error('Command state download schema or selected RTU mismatch');
 const allowed=new Set(['commandId','commandIdRedacted','runId','action','source','status','acceptedAt','dispatchedAt','deadlineAt','expiresAt','updatedAt','targetKw','actualKw','errorKw']);
 for(const row of dto.commands){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!allowed.has(k)))throw Error('Unexpected command state fields');for(const key of ['targetKw','actualKw','errorKw'])if(row[key]!==null&&(typeof row[key]!=='number'||!Number.isFinite(row[key])))throw Error('Invalid numeric command state');}
 return {schemaVersion:dto.schemaVersion,contractVersion:dto.contractVersion,productVersion:dto.productVersion,plantId:dto.plantId,scope:dto.scope,limit:dto.limit,count:dto.commands.length};
};
