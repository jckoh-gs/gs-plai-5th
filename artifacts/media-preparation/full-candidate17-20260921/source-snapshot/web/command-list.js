export const emptyCommandList=()=>({rows:[],loading:true,error:'',checkedAt:null});
// This reader owns only a GET. No response error body is reflected into the UI.
export async function readCommandList(plantId,signal,{fetcher=fetch,getToken=()=>'',onAuth=()=>{}}={}){
 const token=getToken();
 const response=await fetcher('/api/plants/'+encodeURIComponent(plantId)+'/commands',{method:'GET',redirect:'error',signal,headers:token?{Authorization:'Bearer '+token}:{}});
 if(signal.aborted)throw Error('aborted');
 if(response.status===401)onAuth();
 if(!response.ok)throw Object.assign(Error('http'),{httpStatus:response.status});
 const rows=await response.json();
 if(signal.aborted)throw Error('aborted');
 if(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('format');
 return rows.slice(0,20);
}
export function pollCommandList({read,onChange,now=Date.now,intervalMs=2000,timeoutMs=15000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let stopped=false,timer,deadline,controller,state=emptyCommandList();
 const emit=change=>{if(!stopped){state={...state,...change};onChange(state)}};
 async function load(){
  if(stopped)return;
  controller=new AbortController();const owned=controller;
  emit({loading:true});
  try{
   const rows=await Promise.race([Promise.resolve().then(()=>read(owned.signal)),new Promise((_,reject)=>{deadline=setTimer(()=>{owned.abort();reject(Error('timeout'))},timeoutMs)})]);
   emit({rows,loading:false,error:'',checkedAt:new Date(now()).toISOString()});
  }catch(error){emit({loading:false,error:error?.message==='timeout'?'조회 대기 15초가 지났습니다.':Number.isInteger(error?.httpStatus)?`조회 실패 (HTTP ${error.httpStatus})`:'응답을 확인하지 못했습니다.'})}
  finally{clearTimer(deadline);if(!stopped)timer=setTimer(load,intervalMs)}
 }
 load();
 return ()=>{stopped=true;clearTimer(timer);clearTimer(deadline);controller?.abort()};
}
