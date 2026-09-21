// Observer timestamps measure local receipt/poll activity, not remote broker uptime.
export function createSoakDiagnostics(){
 let previousPoll=null,lastTelemetry=null,maxPollGapMs=0,maxTelemetryGapMs=0,connected=false,connectionEvents=0,disconnectionEvents=0,lastConnectedAt=null,lastDisconnectedAt=null;
 return {
  poll(now){if(previousPoll!==null)maxPollGapMs=Math.max(maxPollGapMs,now-previousPoll);previousPoll=now;},
  telemetry(now){if(lastTelemetry!==null)maxTelemetryGapMs=Math.max(maxTelemetryGapMs,now-lastTelemetry);lastTelemetry=now;},
  connect(now){if(!connected){connected=true;connectionEvents++;lastConnectedAt=new Date(now).toISOString();}},
  disconnect(now){if(connected){connected=false;disconnectionEvents++;lastDisconnectedAt=new Date(now).toISOString();}},
  snapshot(now){return {maxGapMs:maxPollGapMs,maxGapMeaning:'legacy alias of maxPollGapMs; observer poll start interval',maxPollGapMs,maxTelemetryGapMs,telemetryGapMeaning:'maximum interval between observed messages across all RTUs; not per-RTU loss proof',telemetrySilenceMs:lastTelemetry===null?null:Math.max(0,now-lastTelemetry),mqttConnected:connected,connectionEvents,disconnectionEvents,lastConnectedAt,lastDisconnectedAt};}
 };
}
