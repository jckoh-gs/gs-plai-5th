const kst=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3,hourCycle:'h23'});
// The audit API's only time field is canonical UTC `created`. Never infer it.
export function eventTime(event){
 const created=event?.created;
 if(typeof created!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(created))return null;
 const date=new Date(created);if(!Number.isFinite(date.getTime())||date.toISOString()!==created)return null;
 const parts=Object.fromEntries(kst.formatToParts(date).map(p=>[p.type,p.value]));
 return {utc:created,text:`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}`};
}
