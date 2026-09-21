// UI convenience validation only. Server validation remains authoritative.
export const commandFields=[
 {key:'targetKw',label:'목표 출력 (kW)',min:0,hint:'0 이상 · 정격 이내 목표, 가용 출력 초과 시험 가능'},
 {key:'toleranceKw',label:'허용 오차 (kW)',min:0.01,max:10000,hint:'0.01–10000 kW · 소수 허용'},
 {key:'timeoutSeconds',label:'실행 timeout (초)',min:1,max:3600,hint:'1–3600초 · 소수 허용'},
 {key:'validSeconds',label:'전달 유효기간 (초)',min:0,hint:'0 이상 · 소수 허용, 0초는 즉시 만료 시험'},
 {key:'priority',label:'우선순위 (0–100)',min:0,max:100,hint:'0–100 · 소수 허용'}
];
export function validateCommandForm(form,now){
 for(const field of commandFields){const value=form[field.key];if(typeof value!=='number'||!Number.isFinite(value)||value<field.min||(field.max!==undefined&&value>field.max))return {error:{field:field.key,message:`${field.label}: ${field.max===undefined?field.min+' 이상의':field.min+'–'+field.max+' 범위의'} 유한한 숫자를 입력하세요.`}};}
 const date=new Date(now+form.validSeconds*1000);
 if(!Number.isFinite(date.getTime()))return {error:{field:'validSeconds',message:'전달 유효기간으로 유효한 만료일을 만들 수 없습니다. 값을 확인하세요.'}};
 let expiresAt;try{expiresAt=date.toISOString()}catch{return {error:{field:'validSeconds',message:'전달 유효기간을 날짜로 변환할 수 없습니다. 값을 확인하세요.'}};}
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiresAt))return {error:{field:'validSeconds',message:'만료일이 서버에서 지원하는 네 자리 연도 범위를 벗어납니다. 전달 유효기간을 확인하세요.'}};
 return {expiresAt};
}
