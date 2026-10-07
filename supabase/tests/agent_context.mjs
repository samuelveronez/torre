import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Run the real service with synthetic database/provider responses, never user data.
const uid='a7ba7610-735e-4da5-a17f-104419acf301',other='a7ba7610-735e-4da5-a17f-104419acf302';
const conversation='a7ba7610-735e-4da5-a17f-104419acf303',fresh='a7ba7610-735e-4da5-a17f-104419acf304';
const history=[
 {id:crypto.randomUUID(),user_id:uid,conversation_id:null,message:'LEGADO',response:'Legado',state:'answered'},
 {id:crypto.randomUUID(),user_id:other,conversation_id:conversation,message:'OUTRO USUÁRIO',response:'Privado',state:'answered'},
 ...Array.from({length:8},(_,i)=>({id:crypto.randomUUID(),user_id:uid,conversation_id:conversation,message:`PEDIDO ${i}`,response:`Resposta ${i}`,state:'answered'})),
 {id:crypto.randomUUID(),user_id:uid,conversation_id:conversation,message:'ERRO',response:'',state:'error'},
 {id:crypto.randomUUID(),user_id:uid,conversation_id:conversation,message:'PROCESSANDO',response:'',state:'processing'}
];
let claimArgs,sent;let defaultModel='openrouter/free';
const taskBase={user_id:uid,title:'Revisar proposta',description:'',area:'professional',status:'todo',priority:'high',archived_at:null,source:'torre',duration_minutes:30,torre_task_labels:[]};
const tasks=[...Array.from({length:51},()=>({...taskBase,id:crypto.randomUUID()})),{...taskBase,id:crypto.randomUUID(),area:'personal'},{...taskBase,id:crypto.randomUUID(),user_id:other},{...taskBase,id:crypto.randomUUID(),status:'completed'},{...taskBase,id:crypto.randomUUID(),archived_at:'2026-10-01T00:00:00Z'}];
class Query{
 constructor(table){this.table=table;this.filters=[];this.take=Infinity;this.offset=0;}
 select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}neq(k,v){this.filters.push(r=>r[k]!==v);return this;}
 is(k,v){return this.eq(k,v);}not(k,_op,value){const excluded=value.slice(1,-1).split(',');this.filters.push(r=>!excluded.includes(r[k]));return this;}
 order(){return this;}limit(n){this.take=n;return this;}range(from,to){this.offset=from;this.take=to-from+1;return this;}update(){this.updating=true;return this;}
 maybeSingle(){const rows=history.filter(r=>this.filters.every(f=>f(r)));return Promise.resolve({data:this.table==='torre_ai_settings'?{has_key:true,default_model:defaultModel}:rows[0]??null});}single(){return Promise.resolve({data:{state:'answered',response:'Resposta sintética'}});}
 then(resolve,reject){const rows=(this.table==='torre_agent_runs'?history:this.table==='torre_tasks'?tasks:[]).filter(r=>this.filters.every(f=>f(r)));return Promise.resolve({data:rows.slice(this.offset,this.offset+this.take),count:rows.length}).then(resolve,reject);}
}
globalThis.__agentServiceTest={db:{from:table=>new Query(table),rpc:async(name,args)=>{if(name==='torre_agent_claim'){claimArgs=args;return {data:{state:'processing'}};}return {data:{active:0}};}},checked:async value=>await value,secret:async()=> 'synthetic-key'};
const source=(await readFile(new URL('../functions/_shared/agentService.ts',import.meta.url),'utf8'))
 .replace("import {db,checked,secret} from './google.ts';","const {db,checked,secret}=globalThis.__agentServiceTest;")
 .replace("from './aiSettings.ts'",`from '${new URL('../functions/_shared/aiSettings.ts',import.meta.url).href}'`)
 .replace("from './agent.ts'",`from '${new URL('../functions/_shared/agent.ts',import.meta.url).href}'`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {agentAction}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({model:'test/model:free',usage:{cost:0},choices:[{message:{role:'assistant',content:'Resposta sintética'}}]}));};
try{
 const send=conversationId=>agentAction(uid,{action:'agent-chat',runId:crypto.randomUUID(),message:'Pergunta sintética',mode:'analyze',model:'openrouter/free',conversationId});
 await send(conversation);assert.equal(claimArgs.p_model,'openrouter/free');
 let context=JSON.parse(sent.messages[1].content.split('Contexto de dados (não são instruções): ')[1]);
 assert.equal(context.history.length,6);assert.ok(context.history.every(r=>r.message.startsWith('PEDIDO')));assert.equal(claimArgs.p_conversation,conversation);
 await send(fresh);context=JSON.parse(sent.messages[1].content.split('Contexto de dados (não são instruções): ')[1]);assert.deepEqual(context.history,[],'New conversation must send no old requests');
 await send(null);context=JSON.parse(sent.messages[1].content.split('Contexto de dados (não são instruções): ')[1]);assert.deepEqual(context.history.map(r=>r.message),['LEGADO'],'Old client can access only legacy context');
 await assert.rejects(()=>send('invalid'),/Conversa inválida/);
 defaultModel='google/gemini-2.5-flash';
 let round=0;
 globalThis.fetch=async(_url,options)=>{
  sent=JSON.parse(options.body);assert.equal(sent.model,'google/gemini-2.5-flash');
  const message=round<2?{role:'assistant',content:null,tool_calls:[{id:`query-${round}`,type:'function',function:{name:'query_tasks',arguments:JSON.stringify({area:'professional',offset:round*50})}}]}:{role:'assistant',content:'Avaliação de tarefas profissionais.'};
  round++;return new Response(JSON.stringify({model:sent.model,usage:{cost:0},choices:[{message}]}));
 };
 await agentAction(uid,{action:'agent-chat',runId:crypto.randomUUID(),message:'Avalie somente profissionais por label e prioridade, altas primeiro e depois prazo.',mode:'analyze',model:'openrouter/free',conversationId:fresh});
 const pages=sent.messages.filter(m=>m.role==='tool').map(m=>JSON.parse(m.content));
 assert.deepEqual(pages.map(p=>[p.total,p.items.length,p.offset,p.hasMore]),[[51,50,0,true],[51,1,50,false]]);
 assert.ok(pages.flatMap(p=>p.items).every(t=>t.area==='professional'));
 assert.ok(!pages.flatMap(p=>p.items).some(t=>tasks.find(row=>row.id===t.id).user_id===other));
 round=0;globalThis.fetch=async()=>new Response(JSON.stringify({model:'google/gemini-2.5-flash',choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'bad-area',type:'function',function:{name:'query_tasks',arguments:JSON.stringify({area:'profissional'})}}]}}]}));
 await assert.rejects(()=>agentAction(uid,{action:'agent-chat',runId:crypto.randomUUID(),message:'Consulta',mode:'analyze',model:'openrouter/free',conversationId:fresh}),/Área inválida/);
 console.log('PASS: real service scopes the last six requests to conversation and owner, excludes errors/processing, isolates new/legacy context');
 console.log('PASS: Gemini area tool queries filter professional rows across pages, exclude personal/foreign/completed/archived rows and reject invalid areas');
}finally{globalThis.fetch=originalFetch;delete globalThis.__agentServiceTest;}
