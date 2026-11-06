import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Consultas de Radar e Conversas do Modo IA, com dados sintéticos e sem chamada ao modelo.
const me='a7ba7610-735e-4da5-a17f-104419acf301',other='a7ba7610-735e-4da5-a17f-104419acf302';
const id=n=>`b0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const ago=days=>new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
const tables={
 torre_people:[{id:id(1),user_id:me,name:'Ana Souza'},{id:id(2),user_id:me,name:'Bruno Lima'},{id:id(3),user_id:other,name:'Pessoa Alheia'}],
 torre_tasks:[
  {id:id(10),user_id:me,title:'Contrato fornecedor',description:'Renovação',area:'professional',status:'todo',waiting_for:'',radar_task_id:null,archived_at:null},
  {id:id(11),user_id:me,title:'Migração do ERP',description:'',area:'professional',status:'todo',waiting_for:'',radar_task_id:null,archived_at:null},
  {id:id(12),user_id:me,title:'Enviar minuta',description:'',area:'professional',status:'todo',waiting_for:'',radar_task_id:id(10),due_date:null,archived_at:null},
  {id:id(13),user_id:me,title:'Ação arquivada',description:'',area:'professional',status:'todo',waiting_for:'',radar_task_id:id(10),archived_at:'2026-01-01'},
  {id:id(14),user_id:other,title:'Tema de outro usuário',description:'',area:'professional',status:'todo',waiting_for:'',radar_task_id:null,archived_at:null}
 ],
 torre_radar:[
  {task_id:id(10),user_id:me,temperature:'critico',review_interval_days:7,next_review_date:ago(1),last_reviewed_at:null,notes:'Falar com jurídico sobre multa. '+'x'.repeat(4100)},
  {task_id:id(11),user_id:me,temperature:'observar',review_interval_days:30,next_review_date:ago(-20),last_reviewed_at:null,notes:'Aguardando cronograma'},
  {task_id:id(14),user_id:other,temperature:'critico',review_interval_days:7,next_review_date:null,last_reviewed_at:null,notes:'SEGREDO'}
 ],
 torre_task_people:[{task_id:id(10),user_id:me,name:'Ana Souza',role:'involved'}],
 torre_conversations:[
  {id:id(20),user_id:me,person_id:id(1),state:'saved',conversation_date:ago(3),raw_text:'texto bruto da ata com orçamento',check_in:'Check-in recente',decisions:'Fechar orçamento',agreements:[{title:'Enviar orçamento',owner:'me',person:'',due:ago(-2),followUp:'',taskId:id(12)}]},
  {id:id(21),user_id:me,person_id:id(1),state:'draft',conversation_date:ago(1),raw_text:'RASCUNHO NAO SALVO',check_in:'',decisions:'',agreements:[]},
  {id:id(22),user_id:me,person_id:id(2),state:'saved',conversation_date:ago(200),raw_text:'ata antiga',check_in:'Muito antiga',decisions:'',agreements:[]},
  {id:id(23),user_id:other,person_id:id(3),state:'saved',conversation_date:ago(2),raw_text:'SEGREDO DE OUTRO',check_in:'SEGREDO',decisions:'',agreements:[]}
 ]
};
class Query{
 constructor(table){this.table=table;this.filters=[];this.from=0;this.size=Infinity;this.sorts=[];}
 select(_c,options){this.counted=!!options?.count;return this;}
 eq(k,v){this.filters.push(r=>r[k]===v);return this;}is(k,v){return this.eq(k,v);}
 in(k,v){this.filters.push(r=>v.includes(r[k]));return this;}
 gte(k,v){this.filters.push(r=>r[k]>=v);return this;}lte(k,v){this.filters.push(r=>r[k]<=v);return this;}
 order(k,o){this.sorts.push([k,o?.ascending===false?-1:1]);return this;}limit(n){this.size=n;return this;}range(a,b){this.from=a;this.size=b-a+1;return this;}
 then(resolve,reject){
  const rows=(tables[this.table]??[]).filter(r=>this.filters.every(f=>f(r)));
  for(const [k,d] of [...this.sorts].reverse())rows.sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*d);
  return Promise.resolve({data:rows.slice(this.from,this.from+this.size),count:rows.length}).then(resolve,reject);
 }
}
globalThis.__sourcesTest={db:{from:t=>new Query(t)}};
const dir=new URL('../functions/_shared/',import.meta.url).href;
const source=(await readFile(new URL('../functions/_shared/agentSources.ts',import.meta.url),'utf8'))
 .replace("from './agent.ts'",`from '${dir}agent.ts'`).replace("from './conversationModel.ts'",`from '${dir}conversationModel.ts'`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {queryRadar,queryConversations,sourceSummary}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const src=(uid,themes)=>({db:globalThis.__sourcesTest.db,checked:async v=>await v,uid,themeIds:async()=>themes});
const mine=src(me,[id(10),id(11)]);

// Radar
let radar=await queryRadar(mine,{});
assert.deepEqual(radar.items.map(t=>t.id),[id(10),id(11)],'críticos primeiro');
assert.equal(radar.items[0].pending_review,true);assert.equal(radar.items[1].pending_review,false);
assert.equal(radar.items[0].notes.length,4000);assert.equal(radar.items[0].notesTruncated,true);
assert.deepEqual(radar.items[0].actions.map(a=>a.id),[id(12)],'ação arquivada não aparece');
assert.deepEqual(radar.items[0].people,[{name:'Ana Souza',role:'involved'}]);
assert.ok(!JSON.stringify(radar).includes('SEGREDO'),'tema de outro usuário não vaza');
assert.equal((await queryRadar(src(me,[id(14)]),{})).total,0,'tema de outro usuário não vaza nem se o id vier da view');
assert.deepEqual((await queryRadar(mine,{pending_review:true})).items.map(t=>t.id),[id(10)]);
assert.deepEqual((await queryRadar(mine,{temperature:'observar'})).items.map(t=>t.id),[id(11)]);
assert.deepEqual((await queryRadar(mine,{query:'cronograma'})).items.map(t=>t.id),[id(11)],'busca em anotações');
assert.equal((await queryRadar(src(me,[]),{})).total,0);
await assert.rejects(()=>queryRadar(mine,{temperature:'quente'}),/Temperatura inválida/);
await assert.rejects(()=>queryRadar(mine,{task_id:'x'}),/Tema inválido/);
await assert.rejects(()=>queryRadar(mine,{offset:-1}),/Página inválida/);

// Conversas
let conv=await queryConversations(mine,{});
assert.deepEqual(conv.items.map(c=>c.id),[id(20)],'janela de 60 dias, sem rascunho, sem outro usuário');
assert.equal(conv.items[0].person,'Ana Souza');assert.equal(conv.items[0].raw_text,undefined,'texto bruto fora da lista');
assert.equal(conv.items[0].agreements[0].task_id,id(12));
assert.deepEqual(conv.people.map(p=>p.name),['Ana Souza','Bruno Lima'],'lista só pessoas do usuário');
assert.ok(!JSON.stringify(conv).includes('SEGREDO')&&!JSON.stringify(conv).includes('RASCUNHO'));
conv=await queryConversations(mine,{person:'bruno'});
assert.deepEqual(conv.items.map(c=>c.id),[id(22)],'filtrar por pessoa abre a janela');
conv=await queryConversations(mine,{from:ago(400)});
assert.deepEqual(conv.items.map(c=>c.id),[id(20),id(22)]);
assert.deepEqual((await queryConversations(mine,{query:'orçamento'})).items.map(c=>c.id),[id(20)],'busca também no texto bruto');
conv=await queryConversations(mine,{conversation_id:id(20)});
assert.equal(conv.items[0].raw_text,'texto bruto da ata com orçamento','texto bruto só no detalhe');
assert.equal((await queryConversations(mine,{conversation_id:id(23)})).items.length,0,'conversa de outro usuário');
assert.equal((await queryConversations(mine,{conversation_id:id(21)})).items.length,0,'rascunho');
await assert.rejects(()=>queryConversations(mine,{from:'31/12/2026'}),/Data inválida/);
await assert.rejects(()=>queryConversations(mine,{conversation_id:'x'}),/Conversa inválida/);

// Visão geral
const summary=await sourceSummary(mine);
assert.deepEqual(summary.radar,{themes:2,byTemperature:{observar:1,atencao:0,critico:1},pendingReview:1});
assert.equal(summary.conversations.savedLast60Days,1);assert.equal(summary.conversations.latestDate,ago(3));
console.log('PASS: Radar and conversation queries are scoped to the owner, hide drafts, keep raw text for detail only and validate arguments');
