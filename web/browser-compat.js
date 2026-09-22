// getRandomValues remains available on HTTP origins where randomUUID is absent.
export function commandId(cryptoApi=globalThis.crypto){
  if(typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID();
  const bytes=cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;
  bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export async function copyText(text){
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(text);return}catch{/* Try the HTTP-compatible path. */}
  }
  const active=document.activeElement,selection=document.getSelection();
  const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
  const input=document.createElement('textarea');
  input.value=text;input.readOnly=true;
  input.style.cssText='position:fixed;left:-9999px;top:0;font-size:16px';
  document.body.append(input);
  try{
    input.select();
    if(!document.execCommand('copy'))throw Error('코드를 선택한 뒤 직접 복사해 주세요.');
  }finally{
    input.remove();active?.focus({preventScroll:true});
    if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range)}
  }
}
