import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const task=crypto.randomUUID(),user=crypto.randomUUID();
let google={connected:true,calendar_synced_at:'2000-01-01',error:'Offline',range_start:null,range_end:null};
let called=0;
const mocks={radarThemes:[],radarThemeIds:async()=>mocks.radarThemes,checked:async q=>q,secret:async()=> 'synthetic-key',selectedAiModel:async()=> 'openrouter/free',propose:async snapshot=>{assert.equal(snapshot.google,google);called++;return {placements:[],unplaced:[task]};},db:{rpc:async()=>({data:{tasks:[{id:task,status:'todo'}],blocks:[],google},error:null}),from:()=>({insert:()=>({select:()=>({single:async()=>({data:{id:crypto.randomUUID(),expires_at:new Date(Date.now()+900000).toISOString()},error:null})})})})}};
globalThis.__planFreshnessTest=mocks;
try{
 const source=(await readFile(new URL('../functions/_shared/planService.ts',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
 const js=ts.transpileModule('const {db,checked,secret,selectedAiModel,propose,radarThemeIds}=globalThis.__planFreshnessTest;\n'+source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {preparePlan}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+8*86400000).toISOString();
 await preparePlan(user,{taskIds:[task],start,end,instruction:''});
 google={connected:true,calendar_synced_at:null};
 await preparePlan(user,{taskIds:[task],start,end,instruction:''});
 assert.equal(called,2);
 await assert.rejects(()=>preparePlan(user,{taskIds:[],start,end,instruction:''}),/Selecione/);
 mocks.radarThemes=[task];
 await assert.rejects(()=>preparePlan(user,{taskIds:[task],start,end,instruction:''}),/Radar/);
 assert.equal(called,2,'Radar themes never reach the planner');
 console.log('PASS: stale/offline/missing calendar sync does not gate proposal generation; input validation remains');
}finally{delete globalThis.__planFreshnessTest;}
