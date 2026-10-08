import {enrichDeadlines,enrichWaiting,waitingDate} from '../functions/_shared/workflow.ts';
import {triageMany,extractionModel} from '../functions/_shared/intelligence.ts';
import {buildQuestions} from '../functions/_shared/openrouter.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
function rejects(fn:()=>unknown){let failed=false;try{fn();}catch{failed=true;}assert(failed);}
const result={title:'Aguardo Ana',description:'Já enviei, aguardo Ana',labelIds:[],situation:'waiting' as const};
Deno.test('Deadlines require valid dates and evidence from the corresponding task',()=>{
 const sources=[{sourceText:'Entregar amanhã'},{sourceText:'Cobrar sexta'}];
 const output=enrichDeadlines([result,result],sources,{items:[{index:1,dueDate:null,dueEvidence:null},{index:0,dueDate:'2026-10-07',dueEvidence:'amanhã'}]});
 assert(output[0].dueDate==='2026-10-07'&&output[1].dueDate===undefined);
 for(const item of [{index:0,dueDate:'2026-02-30',dueEvidence:'amanhã'},{index:0,dueDate:'2026-10-09',dueEvidence:'sexta'},{index:2,dueDate:null,dueEvidence:null},{index:0,dueDate:'2026-10-07',dueEvidence:''}])rejects(()=>enrichDeadlines([result],[sources[0]],{items:[item]}));
 rejects(()=>enrichDeadlines([result,result],sources,{items:[{index:0,dueDate:null},{index:0,dueDate:null}]}));
 rejects(()=>enrichDeadlines([result],sources,{items:[]}));
});
Deno.test('Waiting details are source grounded, date default is visible and uses Sao Paulo',()=>{
 const output=enrichWaiting([result],[{sourceText:'Já enviei, aguardo Ana'}],{items:[{index:0,waitingFor:'Ana',followUpDate:null,dateEvidence:null}]},'2026-12-31');
 assert(output[0].waitingFor==='Ana'&&output[0].followUpDate==='2027-01-01');assert(output[0].description.includes('sugerido automaticamente'));
 assert(waitingDate(new Date('2026-10-07T01:00:00Z'))==='2026-10-06');
 const anonymous=enrichWaiting([result],[{sourceText:'aguardando retorno'}],{items:[{index:0,waitingFor:null,followUpDate:null,dateEvidence:null}]},'2026-10-06');assert(anonymous[0].waitingFor==='Responsável não informado');
});
Deno.test('Invented responsible, invalid dates, duplicate and foreign indexes are rejected',()=>{
 const source=[{sourceText:'Aguardo Ana, acompanhar amanhã'}];
 for(const item of [{index:0,waitingFor:'Pedro',followUpDate:null},{index:0,waitingFor:'Ana',followUpDate:'2026-02-30',dateEvidence:'amanhã'},{index:0,waitingFor:'Ana',followUpDate:'2026-10-07',dateEvidence:'sexta'},{index:1,waitingFor:'Ana',followUpDate:null}])rejects(()=>enrichWaiting([result],source,{items:[item]},'2026-10-06'));
 rejects(()=>enrichWaiting([result],source,{items:[]},'2026-10-06'));
 const explicit=enrichWaiting([result],source,{items:[{index:0,waitingFor:'Ana',followUpDate:'2026-10-07',dateEvidence:'amanhã'}]},'2026-10-06');assert(explicit[0].followUpDate==='2026-10-07'&&!explicit[0].description.includes('sugerido'));
});
Deno.test('Workflow questions distinguish actions and waiting; label-only batch stays compatible',()=>{
 assert(!('waiting' in buildQuestions({text:'',labels:[]})));
 const q=buildQuestions({text:'',labels:[]},true).waiting as any;
 assert(q.instructions.includes('Enviar proposta para Ana')&&q.instructions.includes('aguardando aprovação'));
});
Deno.test('Mixed capture persists workflow independently per task; ambiguous waiting stays todo',async()=>{
 const original=fetch;let call=0;
 try{globalThis.fetch=async(_url,opts)=>{const body=JSON.parse(opts!.body as string);call++;if(body.messages?.[0]?.content.includes('Extraia o prazo'))return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:[0,1,2].map(index=>({index,dueDate:index===0?'2026-10-09':null,dueEvidence:index===0?'até 09/10/2026':null}))})}}]});
 if(call===1)return Response.json({answers:{boundary_1:{type:'noul',noul:.98},boundary_2:{type:'noul',noul:.98}}});
 if(call===2){assert(body.questions.task_0_waiting&&body.questions.task_1_waiting);return Response.json({answers:{task_0_area:{type:'choice',choice:'professional',probabilities:{professional:1}},task_1_area:{type:'choice',choice:'professional',probabilities:{professional:1}},task_2_area:{type:'choice',choice:'personal',probabilities:{personal:1}},task_0_waiting:{type:'noul',noul:.01},task_1_waiting:{type:'noul',noul:.98},task_2_waiting:{type:'noul',noul:.84}}});}
 assert(body.model===extractionModel);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:[{index:1,waitingFor:'Ana',followUpDate:null,dateEvidence:null}]})}}]});};
 const output=await triageMany({text:'Enviar proposta para Ana até 09/10/2026; já enviei contrato e aguardo Ana; conversar sobre o retorno',labels:[]},'fake','list');
 assert(output.results[0].situation==='todo'&&output.results[0].waitingFor===undefined);assert(output.results[1].situation==='waiting'&&output.results[1].waitingFor==='Ana');assert(output.results[2].situation==='todo');assert(output.results[0].dueDate==='2026-10-09'&&output.results[1].dueDate===undefined);assert(call===4);
 }finally{globalThis.fetch=original;}
});
