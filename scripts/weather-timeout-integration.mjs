import assert from 'node:assert/strict';
import {refreshWeather} from '../server/weather.js';
const weather={wind_speed_ms:8,wind_direction_deg:220,temperature:21,irradiance_wm2:700};
const plant={runId:'timeout-fixture',station:108,replay:{freezeLiveWeather:false},weather:{...weather},weatherSource:'csv',weatherObservedAt:'2026-01-01T00:00:00.000Z'};
const start=Date.now();let aborted=false;
const result=await refreshWeather(plant,{authKey:'private-fixture-never-output',fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{aborted=true;const error=new Error('abort');error.name='AbortError';reject(error);},{once:true});})});
const elapsedMs=Date.now()-start;
assert(aborted);assert(elapsedMs>=11900&&elapsedMs<16000);assert.equal(result.ok,false);assert.match(result.error,/12초/);assert.deepEqual(plant.weather,weather);assert.equal(plant.weatherSource,'csv');assert.equal(plant.weatherObservedAt,'2026-01-01T00:00:00.000Z');
console.log(JSON.stringify({result:'PASS',suite:'weather-timeout',elapsedMs,abortSignalObserved:true,lastValidWeatherSourceAndTimePreserved:true}));
