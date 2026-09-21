import {timingSafeEqual} from 'node:crypto';
export function readConfig(env=process.env) {
  const number=(key,fallback,min,max)=>{const value=Number(env[key]??fallback);if(!Number.isInteger(value)||value<min||value>max)throw Error(`${key}: expected integer ${min}..${max}`);return value;};
  const host=env.HOST||'127.0.0.1', token=env.API_TOKEN||'';
  if(!['127.0.0.1','::1','localhost'].includes(host)&&token.length<24)throw Error('Non-loopback HOST requires API_TOKEN of at least 24 characters');
  const prefix=env.MQTT_PREFIX||'vpp';
  if(!/^[A-Za-z0-9_/-]+$/.test(prefix)||prefix.startsWith('/')||prefix.endsWith('/'))throw Error('MQTT_PREFIX must be a concrete topic prefix');
  const url=env.MQTT_URL||'mqtt://127.0.0.1:1883';
  const parsed=new URL(url);if(!['mqtt:','mqtts:','ws:','wss:'].includes(parsed.protocol))throw Error('MQTT_URL protocol is unsupported');
  return {host,token,port:number('PORT',3001,1,65535),dbPath:env.DB_PATH||'data/lab.sqlite',url,prefix,telemetrySeconds:number('TELEMETRY_SECONDS',60,1,3600),retentionDays:number('RETENTION_DAYS',30,1,3650),seedDemo:env.SEED_DEMO!=='false'};
}
export function authorized(header,token) {
  if(!token)return true;
  const actual=Buffer.from(header||''),expected=Buffer.from(`Bearer ${token}`);
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function redact(message) {
  return String(message).replace(/(mqtts?|https?|wss?):\/\/[^\s/@]+:[^\s/@]+@/gi,'$1://[redacted]@').replace(/(authKey|token|password)=([^\s&]+)/gi,'$1=[redacted]');
}
