import {aiModel,assertModelResponse,decisionsAsChat,parseDecisions,selectedAiModel} from '../functions/_shared/aiSettings.ts';
import {triageMany,request} from '../functions/_shared/intelligence.ts';
import {propose} from '../functions/_shared/planning.ts';
import {extractConversation} from '../functions/_shared/conversationExtraction.ts';
const assert=(v:unknown)=>{if(!v)throw new Error('Assertion failed');};
const rejects=(fn:()=>unknown)=>{let failed=false;try{fn();}catch{failed=true;}assert(failed);};
const paid='google/gemini-2.5-flash';
Deno.test('global model accepts only allowed options and refuses paid responses in free mode',()=>{
 assert(aiModel(undefined)==='openrouter/free');assert(aiModel(paid)===paid);rejects(()=>aiModel('arbitrary/model'));
 rejects(()=>assertModelResponse({model:paid,usage:{cost:.01}},'openrouter/free'));rejects(()=>assertModelResponse({model:'another:free'},paid));
 assertModelResponse({model:'test:free',usage:{cost:0}},'openrouter/free');
 const q={area:{type:'choice',criteria:{personal:'Pessoal',professional:'Trabalho'}}};
 rejects(()=>parseDecisions({choices:[{message:{content:'{"answers":{}}'}}]},q));
 rejects(()=>parseDecisions({choices:[{message:{content:'{"answers":{"area":{"type":"choice","choice":"other","probabilities":{}}}}}'}}]},q));
 assert(decisionsAsChat({state:{text:'texto'},questions:q},paid).model===paid);
});
Deno.test('global model lookup is scoped to owner and defaults to free for a new account',async()=>{
 let owner='';const client={from:()=>({select:()=>({eq:(_field:string,uid:string)=>{owner=uid;return {maybeSingle:()=>({data:null,error:null})};}})})};
 assert(await selectedAiModel(client,'owner')==='openrouter/free');assert(owner==='owner');
});
Deno.test('Gemini handles capture extraction, classification, deadlines, planning and conversation through the paid model',async()=>{
 const previous=fetch;const calls:any[]=[];
 globalThis.fetch=async(url,opts)=>{
  const body=JSON.parse(opts?.body as string);calls.push({url,body});assert(body.model===paid);assert(String(url).endsWith('/v1/chat/completions'));
  const instructions=body.messages[0].content;let output:any;
  if(instructions.includes('Classifique o state'))output={answers:{task_0_area:{type:'choice',choice:'personal',probabilities:{personal:1,professional:0}},task_0_waiting:{type:'noul',noul:0}}};
  else if(instructions.includes('Extraia o prazo'))output={items:[{index:0,dueDate:null,dueEvidence:null}]};
  else if(instructions.includes('Organize as tarefas'))output={order:[{taskId:'a',reason:'Sugestão baseada nos dados'}]};
  else if(instructions.includes('Organize o registro'))output={checkIn:[],decisions:[],agreements:[]};
  else output={tasks:[{title:'Comprar frutas',description:'comprar frutas',sourceText:'comprar frutas'}]};
  return Response.json({model:paid,usage:{cost:.001},choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
 };
 try{
  const capture=await triageMany({text:'comprar frutas',labels:[]},'synthetic','free',paid);assert(capture.results[0].title==='Comprar frutas');assert(capture.audit.model===paid);
  await propose({tasks:[{id:'a',title:'Comprar frutas',duration_minutes:30,area:'personal'}],hours:[],busy:[],blocks:[]},'2026-10-07T00:00:00Z','2026-10-14T00:00:00Z','', 'synthetic',paid);
  await extractConversation('Sem combinados futuros.','2026-10-07','Ana','synthetic',paid);
  assert(calls.length>=4);
 }finally{globalThis.fetch=previous;}
});
Deno.test('free request rejects a billed model without switching providers',async()=>{
 const previous=fetch;let count=0;globalThis.fetch=async()=>{count++;return Response.json({model:paid,usage:{cost:.01}});};
 try{let failed=false;try{await request('v1/chat/completions',{model:'openrouter/free'},'synthetic');}catch{failed=true;}assert(failed&&count===1);}finally{globalThis.fetch=previous;}
});
