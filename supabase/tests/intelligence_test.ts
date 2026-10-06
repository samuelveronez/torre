import {splitCandidates,validateExtraction,triageMany,extractionModel} from '../functions/_shared/intelligence.ts';
import {classifierModel} from '../functions/_shared/openrouter.ts';
import {allocate,validateOrder} from '../functions/_shared/planning.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
function rejects(fn:()=>unknown){let error=false;try{fn();}catch{error=true;}assert(error);}
Deno.test('List boundaries preserve numbers, quoted text and parentheses',()=>{
 assert(splitCandidates('receita de bolo, concertar o carro; comprar notebook').length===3);
 assert(splitCandidates('pagar R$ 2,50, comprar "bolo, chocolate", revisar (A, B)').length===3);
 assert(splitCandidates('\n; tarefa,\n').join('')==='tarefa');
 rejects(()=>splitCandidates(Array(21).fill('tarefa').join(',')));
});
Deno.test('Extraction must reference original text and cannot silently truncate',()=>{
 const text='preciso comprar frutas e revisar o relatório';
 assert(validateExtraction({tasks:[{title:'Comprar frutas',description:'Comprar frutas',sourceText:'comprar frutas'}]},text).length===1);
 rejects(()=>validateExtraction({tasks:[{title:'Enviar email',description:'',sourceText:'não existe'}]},text));
 rejects(()=>validateExtraction({tasks:[]},text));
});
Deno.test('Free text extraction then batched classification uses only free models',async()=>{
 const original=fetch,calls:any[]=[];
 try{globalThis.fetch=async(url,opts)=>{const body=JSON.parse(opts!.body as string);calls.push({url,body});if(body.model===extractionModel)return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({tasks:[{title:'Consertar o carro',description:'concertar o carro',sourceText:'concertar o carro'},{title:'Comprar notebook',description:'comprar notebook',sourceText:'comprar notebook'}]})}}]});
 return Response.json({answers:{task_0_waiting:{type:'noul',noul:.1},task_1_waiting:{type:'noul',noul:.1},task_0_area:{type:'choice',choice:'personal',probabilities:{personal:.95}},task_1_area:{type:'choice',choice:'professional',probabilities:{professional:.95}},task_0_label_0:{type:'noul',noul:.95},task_1_label_0:{type:'noul',noul:.1}}});};
 const result=await triageMany({text:'concertar o carro, comprar notebook',labels:[{id:'car',name:'Manutenção',description:'carro'}]},'fake-key','free');
 assert(result.results.length===2&&result.results[0].labelIds[0]==='car'&&result.results[1].labelIds.length===0);assert(calls[0].body.model==='openrouter/free'&&calls[1].body.model===classifierModel);assert(calls[0].body.response_format.type==='json_object');assert(!JSON.stringify(calls).includes('attachment'));assert(result.results[0].title==='Consertar o carro');
 }finally{globalThis.fetch=original;}
});
Deno.test('Uncertain list boundaries merge instead of making extra tasks',async()=>{
 const original=fetch;let call=0;
 try{globalThis.fetch=async()=>Response.json(++call===1?{answers:{boundary_1:{type:'noul',noul:.2},boundary_2:{type:'noul',noul:.95}}}:{answers:{task_0_waiting:{type:'noul',noul:.1},task_1_waiting:{type:'noul',noul:.1},task_0_area:{type:'choice',choice:'personal',probabilities:{personal:1}},task_1_area:{type:'choice',choice:'personal',probabilities:{personal:1}}}});
 const output=await triageMany({text:'comprar ingredientes, farinha, consertar carro',labels:[]},'fake','list');assert(output.results.length===2&&output.results[0].description==='comprar ingredientes, farinha');
 }finally{globalThis.fetch=original;}
});
Deno.test('Allocator respects duration, area, busy intervals and insufficient space',()=>{
 const snapshot={preferences:{timezone:'America/Sao_Paulo'},tasks:[{id:'a',duration_minutes:30,area:'professional'},{id:'b',duration_minutes:30,area:'personal'},{id:'c',duration_minutes:480,area:'professional'}],hours:[{weekday:1,enabled:true,start_time:'09:00',end_time:'10:00'}],blocks:[],busy:[{start_at:'2026-10-05T12:00:00Z',end_at:'2026-10-05T12:30:00Z'}]};
 const result=allocate(snapshot,[{taskId:'a',reason:''},{taskId:'b',reason:''},{taskId:'c',reason:''}],'2026-10-05T10:00:00Z','2026-10-05T14:00:00Z',Date.parse('2026-10-05T10:00:00Z'));
 assert(result.placements[0].start==='2026-10-05T12:30:00.000Z');assert(result.placements[1].start==='2026-10-05T10:00:00.000Z');assert(result.unplaced[0]==='c');
 rejects(()=>validateOrder({order:[{taskId:'a',reason:''},{taskId:'a',reason:''}]},['a','b']));
});
