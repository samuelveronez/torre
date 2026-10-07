import assert from 'node:assert/strict';
import {agentModel,validateAgentPatch,needsAgentReview,agentInstructions,callAgentModel,classifyAgentError,testAgentModel,agentTools,AgentModelError} from '../functions/_shared/agent.ts';
assert.throws(()=>validateAgentPatch('task',{user_id:'foreign'}));
assert.throws(()=>validateAgentPatch('task',{at:'2026-10-07T12:00:00Z'}));
assert.throws(()=>validateAgentPatch('task',{due_date:'2026-02-30'}));
assert.throws(()=>validateAgentPatch('task',{duration_minutes:7}));
assert.throws(()=>validateAgentPatch('task',{label_ids:['not-an-id']}));
assert.throws(()=>validateAgentPatch('label',{archived:'false'}));
assert.throws(()=>validateAgentPatch('label',{name:''},true));
assert.deepEqual(validateAgentPatch('task',{title:'Comprar leite',label_ids:['new:mercado'],due_date:null},true),{title:'Comprar leite',label_ids:['new:mercado'],due_date:null});
assert.equal(needsAgentReview([{patch:{archived:true}},{patch:{archived_at:'date'}}]),true);
assert.equal(needsAgentReview([{patch:{status:'completed'}}]),false);
assert.match(agentInstructions('analyze','2026-10-06'),/nenhuma alteração é permitida/);
assert.deepEqual(agentTools.find(t=>t.function.name==='query_tasks').function.parameters.properties.area.enum,['personal','professional']);
assert.match(agentInstructions('analyze','2026-10-06'),/nunca use professional, profissional, personal ou pessoal em query/);
let sent;
const fake=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({model:'test/model:free',choices:[{message:{role:'assistant',content:'Há uma tarefa atrasada.'}}]}));};
await callAgentModel([],'analyze','test',fake);
assert.equal(sent.model,'openrouter/free');
assert.equal('temperature' in sent,false);
assert.equal('parallel_tool_calls' in sent,false);
assert.equal(sent.provider.require_parameters,false);
assert.equal('models' in sent,false,'No paid fallback list');
assert.equal(sent.tools.some(t=>t.function.name==='propose_changes'),false);
await callAgentModel([],'execute','test',fake);
assert.equal(sent.tools.some(t=>t.function.name==='propose_changes'),true);
await assert.rejects(()=>callAgentModel([],'execute','test',async()=>new Response(JSON.stringify({model:'paid/model',choices:[{message:{content:'ok'}}]}))),/gratuitos/);
await assert.rejects(()=>callAgentModel([],'execute','test',async()=>new Response('{}',{status:429})),/limite/);
const patchSchema=agentTools.find(t=>t.function.name==='propose_changes').function.parameters.properties.operations.items.properties.patch;
assert.equal(patchSchema.additionalProperties,false);
for(const field of ['title','due_date','duration_minutes','label_ids','name','color','archived'])assert.ok(patchSchema.properties[field]);
assert.equal('user_id' in patchSchema.properties,false);
assert.equal('at' in patchSchema.properties,false);
for(const [status,message,reason] of [
 [401,'Invalid API key','key'],[403,'Forbidden','policy'],
 [404,'No endpoints available matching your guardrail restrictions and data policy','policy'],
 [404,'No endpoints found that support tool use','incompatible'],[404,'No endpoints found','unavailable'],
 [429,'Daily free-model quota exceeded','quota'],[429,'Provider rate limit exceeded','capacity'],
 [400,'Invalid function schema','request'],[504,'Upstream timeout','timeout']
]){
 const error=classifyAgentError(status,{error:{code:status,message}});
 assert.equal(error.reason,reason);assert.equal(error.status,status);assert.match(error.message,/Nenhuma alteração/);
}
const privateMarker='sk-or-v1-secret-test-private-task';const diagnostic=classifyAgentError(404,{error:{code:404,message:'No endpoints '+privateMarker,metadata:{raw:privateMarker}}});
assert.equal(JSON.stringify(diagnostic.diagnostic()).includes(privateMarker),false);
assert.equal(diagnostic.message.includes(privateMarker),false);
assert.equal(classifyAgentError(200,{error:{code:429,message:'Daily quota'}}).reason,'quota');
const originalWarn=console.warn,logs=[];console.warn=value=>logs.push(value);
try{
 await assert.rejects(()=>callAgentModel([],'analyze','test',async()=>new Response(JSON.stringify({error:{code:404,message:'No endpoints matching data policy '+privateMarker}}),{status:404})),e=>e instanceof AgentModelError&&e.reason==='policy');
 await assert.rejects(()=>callAgentModel([],'analyze','test',async()=>new Response(JSON.stringify({error:{code:429,message:'Daily quota'}}))),e=>e.reason==='quota');
 await assert.rejects(()=>callAgentModel([],'analyze','test',async()=>new Response('bad json')),e=>e.reason==='invalid_response');
 await assert.rejects(()=>callAgentModel([],'analyze','test',async()=>{const e=new Error('private');e.name='TimeoutError';throw e;}),e=>e.reason==='timeout');
 await assert.rejects(()=>callAgentModel([],'analyze','test',async()=>{throw new Error(privateMarker);}),e=>e.reason==='network');
 assert.ok(logs.length>=5);assert.equal(logs.join('').includes(privateMarker),false);
}finally{console.warn=originalWarn;}
const testResponse=async()=>new Response(JSON.stringify({model:'test/model:free',choices:[{message:{role:'assistant',tool_calls:[{id:'test-call',type:'function',function:{name:'propose_changes',arguments:JSON.stringify({response:'Teste',operations:[{entity:'label',id:'new:teste',patch:{name:'Teste sintético'}}]})}}]}}]}));
assert.equal((await testAgentModel('test',testResponse)).ok,true);
await assert.rejects(()=>testAgentModel('test',fake),/não usou a ferramenta/);
assert.equal(agentModel(undefined),'openrouter/free');assert.equal(agentModel('google/gemini-2.5-flash'),'google/gemini-2.5-flash');
for(const invalid of ['google/gemini-pro','auto','',null])assert.throws(()=>agentModel(invalid),/Escolha/);
const paid='google/gemini-2.5-flash';let paidCalls=0;
const paidFake=async(_url,options)=>{paidCalls++;sent=JSON.parse(options.body);return new Response(JSON.stringify({model:paid,usage:{cost:.001},choices:[{message:{role:'assistant',content:'Resposta Gemini.'}}]}));};
assert.equal((await callAgentModel([],'analyze','test',paidFake,paid)).model,paid);assert.equal(sent.model,paid);assert.equal('models' in sent,false);assert.equal(sent.tools.some(t=>t.function.name==='propose_changes'),false);
await callAgentModel([],'execute','test',paidFake,paid);assert.equal(sent.tools.some(t=>t.function.name==='propose_changes'),true);
await assert.rejects(()=>callAgentModel([],'analyze','test',paidFake,'unknown/model'),/Escolha/);assert.equal(paidCalls,2,'Unknown model must not invoke provider');
await assert.rejects(()=>callAgentModel([],'analyze','test',fake,paid),e=>e.reason==='unexpected_model'&&e.requestedModel===paid);
await assert.rejects(()=>callAgentModel([],'analyze','test',paidFake),e=>e.reason==='paid_model','Free selection still rejects paid response');
const credit=classifyAgentError(402,{error:{code:402,message:'Insufficient credits '+privateMarker}},paid);assert.match(credit.message,/Saldo/);assert.equal(credit.message.includes('gratuito'),false);assert.equal(credit.requestedModel,paid);assert.equal(JSON.stringify(credit.diagnostic()).includes(privateMarker),false);
console.log('PASS: schemas, explicit model allowlist, free guard, Gemini routing, safe diagnostics, provider errors and synthetic tool test');
