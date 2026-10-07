import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
let handler,cfg={chat_id:123,test_after:null},claim=true,mode='success',cleared=0;
const uid='10000000-0000-4000-8000-000000000001';
class Query{
 update(v){this.value=v;return this;}eq(){return this;}not(){return this;}or(){return this;}select(){this.selecting=true;return this;}
 then(resolve,reject){if(this.value?.test_after===null)cleared++;return Promise.resolve({data:this.selecting?(claim?[{user_id:uid}]:[]):null,error:null}).then(resolve,reject);}
}
globalThis.__telegramTest={db:{auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},from:()=>new Query()},checked:async p=>(await p).data,config:async()=>cfg,sendDigest:async(_uid,_date,onSending)=>{if(mode==='ai-error')throw new Error('A IA demorou a responder.');await onSending();if(mode==='uncertain')throw new Error('Telegram não confirmou a entrega.');return {messageId:7};},secret:async()=>null,credentials:async()=>({}),telegramApi:async()=>({}),sha:async()=>''};
globalThis.Deno={serve:fn=>handler=fn,env:{get:()=>''}};
let source=await readFile(new URL('../functions/torre-telegram-settings/index.ts',import.meta.url),'utf8');
source=source.replace(/import \{([^}]+)\} from '\.\.\/_shared\/telegram.ts';/,(_,names)=>`const {${names}}=globalThis.__telegramTest;`).replace("from '../_shared/telegramDigest.ts'",`from '${new URL('../functions/_shared/telegramDigest.ts',import.meta.url).href}'`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const test=()=>handler(new Request('https://test.example',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'application/json'},body:'{"action":"test"}'}));
let r=await test();assert.equal(r.status,200);assert.equal((await r.json()).delivered,true);
cfg={chat_id:null,test_after:null};r=await test();assert.equal(r.status,409);assert.equal((await r.json()).code,'CHAT_NOT_LINKED');
cfg={chat_id:123,test_after:new Date(Date.now()+30000).toISOString()};claim=false;r=await test();assert.equal(r.status,429);const cooldown=await r.json();assert.equal(cooldown.code,'TEST_COOLDOWN');assert.ok(cooldown.retryAfter<=30);assert.match(cooldown.error,/Seu chat está vinculado/);
claim=true;mode='ai-error';r=await test();assert.equal(r.status,400);assert.equal(cleared,1,'Pre-send failure releases test throttle');
mode='uncertain';r=await test();assert.equal(r.status,400);assert.equal(cleared,1,'Uncertain delivery retains throttle to avoid duplicates');
console.log('PASS: delivery acknowledgement, missing chat vs cooldown, pre-send failure recovery and uncertain-send duplicate protection');
