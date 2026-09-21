import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('samples',{recursive:true});
for(const type of ['wind','solar','hybrid']) {
  const rows=['timestamp,power_kw,wind_speed_ms,wind_direction_deg,irradiance_wm2,voltage,current_a'];
  for(let i=0;i<144;i++) {
    const wind=8+2*Math.sin(i/12),irr=Math.max(0,900*Math.sin(Math.PI*(i/6-6)/12));
    const power=Math.round(type==='wind'?4000+1200*Math.sin(i/12):type==='solar'?irr*3:2200+500*Math.sin(i/12)+irr*1.5);
    rows.push([new Date(Date.UTC(2026,8,20,15,i*10)).toISOString().replace('.000Z','Z'),power,wind.toFixed(2),240,irr.toFixed(2),380,(power*1000/380/Math.sqrt(3)).toFixed(2)].join(','));
  }
  writeFileSync(`samples/${type}.csv`,rows.join('\n')+'\n');
}
console.log('Created explicitly synthetic wind/solar/hybrid samples.');
