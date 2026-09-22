import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {commandId} from '../web/browser-compat.js';
import {createCommandReceipts} from '../web/command-receipts.js';

test('HTTP command IDs use random bytes and remain UUIDv4 command identifiers',async()=>{
  const httpCrypto={getRandomValues:values=>webcrypto.getRandomValues(values)};
  const seen=new Set(),requests=[];
  const receipts=createCommandReceipts({uuid:()=>commandId(httpCrypto),request:async(path,method,body)=>{
    if(method!=='POST')return {plants:[]};
    requests.push(body);
    return {...body,plantId:'http-plant',source:'REST',status:'accepted'};
  }});
  for(let i=0;i<100;i++){
    const receipt=await receipts.send({id:'http-plant',name:'HTTP fixture'},{action:'set_target',targetKw:10});
    assert.match(receipt.commandId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(receipt.confirmed,true);assert.equal(receipt.pending,false);seen.add(receipt.commandId);
  }
  assert.equal(seen.size,100);assert.equal(requests.length,100);
});

test('native UUID support remains available and random-source failure is not replaced with weak randomness',()=>{
  assert.equal(commandId({randomUUID:()=> 'native-id'}),'native-id');
  assert.throws(()=>commandId({getRandomValues:()=>{throw Error('entropy unavailable')}}),/entropy unavailable/);
});
