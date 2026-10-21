import {chargePrompt,dayNumber,toPainelTasks,snapshot,focusList,peopleBlocks,themeGroups,scrubberDays,overdueTrend,timeline} from '../../src/painel/painelModel.ts';
import type {Task} from '../../src/task.ts';
import type {Label} from '../../src/features.ts';
const task=(id:string,fields:Partial<Task>={}):Task=>({id,title:id,area:'Profissional',minutes:30,due:'',source:'Torre',done:false,createdAt:'2026-10-01T12:00:00',...fields});
const label=(id:string,name:string,fields:Partial<Label>={}):Label=>({id,name,description:'',color:'#123456',archived:false,...fields});
const today=dayNumber('2026-10-20');
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);}

Deno.test('Painel converts tasks: skips done, uses follow-up date for waiting tasks and falls back to the due date',()=>{
 const rows=toPainelTasks([
  task('todo',{due:'2026-10-21',priority:'high'}),
  task('wait',{situation:'waiting',waitingFor:'Iran',followUp:'2026-10-18',due:'2026-10-25'}),
  task('wait-no-follow',{situation:'waiting',waitingFor:'Iran',due:'2026-10-25'}),
  task('no-date'),
  task('done',{done:true,due:'2026-10-21'}),
 ],[]);
 equal(rows.map(r=>r.id),['todo','wait','wait-no-follow','no-date']);
 equal(rows.map(r=>r.date),[today+1,today-2,today+5,null]);
 equal(rows.map(r=>r.kind),['prazo','retorno','retorno','prazo']);
 equal(rows.map(r=>r.prio),['high','none','none','none']);
 equal(rows[1].who,'Iran');
});

Deno.test('Painel keeps only active labels and uses their names; no label means no theme',()=>{
 const labels=[label('a','GSA'),label('b','Antiga',{archived:true})];
 const rows=toPainelTasks([task('one',{labelIds:['a','b']}),task('two',{labelIds:['b']}),task('three')],labels);
 equal(rows.map(r=>r.labels),[['GSA'],[],[]]);
});

Deno.test('Painel snapshot splits overdue, next 7 days, later, undated and waiting, ignoring tasks created after the day',()=>{
 const rows=toPainelTasks([
  task('late',{due:'2026-10-19'}),
  task('today',{due:'2026-10-20'}),
  task('edge',{due:'2026-10-27'}),
  task('later',{due:'2026-10-28'}),
  task('none'),
  task('wait',{situation:'waiting',waitingFor:'Eduardo',followUp:'2026-10-30'}),
  task('future-created',{due:'2026-10-19',createdAt:'2026-10-22T09:00:00'}),
 ],[]);
 const now=snapshot(rows,today);
 equal([now.over,now.soon,now.later,now.undated,now.wait].map(g=>g.map(t=>t.id)),[['late'],['today','edge'],['later','wait'],['none'],['wait']]);
 const tomorrow=snapshot(rows,today+2);
 equal(tomorrow.over.map(t=>t.id),['late','today','future-created']);
});

Deno.test('Painel focus list scores lateness and priority first, then due soon, and names the next step',()=>{
 const rows=toPainelTasks([
  task('older',{due:'2026-10-10',priority:'low'}),
  task('late-high',{due:'2026-10-18',priority:'high'}),
  task('soon',{due:'2026-10-21',priority:'medium'}),
  task('undated-high',{priority:'high'}),
  task('chase',{situation:'waiting',waitingFor:'Cardia',followUp:'2026-10-15'}),
  task('far',{due:'2026-12-01',priority:'high'}),
 ],[]);
 const list=focusList(rows,today,5);
 equal(list.map(f=>f.task.id),['late-high','older','chase','soon','undated-high']);
 equal(list.map(f=>f.late),[true,true,true,false,false]);
 equal(list.map(f=>f.verb),['CONCLUIR OU REPLANEJAR','CONCLUIR OU REPLANEJAR','COBRAR CARDIA','ENTREGAR','DEFINIR PRAZO']);
});

Deno.test('Painel groups people ignoring case and accents, sorted by summed waiting days',()=>{
 const rows=toPainelTasks([
  task('a',{situation:'waiting',waitingFor:'Iran',followUp:'2026-10-13'}),
  task('b',{situation:'waiting',waitingFor:' iran ',followUp:'2026-10-10'}),
  task('c',{situation:'waiting',waitingFor:'Micheli',followUp:'2026-10-19'}),
  task('d',{situation:'waiting',waitingFor:'Michéli',followUp:'2026-10-19'}),
  task('e',{due:'2026-10-10'}),
 ],[]);
 const people=peopleBlocks(rows,today);
 equal(people.map(p=>[p.name,p.tasks.map(t=>t.id),p.days,p.sum]),[['Iran',['a','b'],10,17],['Micheli',['c','d'],1,2]]);
});

Deno.test('Painel themes group by first label, use Sem tema when empty and sort by size',()=>{
 const labels=[label('a','GSA',{color:'#1673d1'}),label('b','Siasi',{color:'#da5100'})];
 const rows=toPainelTasks([
  task('1',{labelIds:['b'],due:'2026-10-10'}),
  task('2',{labelIds:['a']}),
  task('3',{labelIds:['a'],due:'2026-10-09'}),
  task('4'),
 ],labels);
 const themes=themeGroups(rows,labels,today);
 equal(themes.map(t=>[t.name,t.color,t.tasks.map(x=>x.id),t.overdue]),[['GSA','#1673d1',['3','2'],1],['Siasi','#da5100',['1'],1],['Sem tema','#9aa3ae',['4'],0]]);
});

Deno.test('Painel scrubber covers 35 days (15 before today) and counts deadlines per day; trend counts overdue each day',()=>{
 const rows=toPainelTasks([task('a',{due:'2026-10-20'}),task('b',{due:'2026-10-20'}),task('c',{due:'2026-10-25',createdAt:'2026-10-18T10:00:00'}),task('d')],[]);
 const days=scrubberDays(rows,today);
 equal([days.length,days[0].day,days[15].day,days[34].day],[35,today-15,today,today+19]);
 equal([days[15].due,days[20].due,days[0].due],[2,1,0]);
 const trend=overdueTrend(rows,today);
 equal([trend.length,trend[15].count,trend[16].count,trend[22].count],[35,0,2,3]);
});

Deno.test('Painel timeline lists new and overdue/return events up to the selected day, newest first',()=>{
 const rows=toPainelTasks([
  task('new',{createdAt:'2026-10-20T08:00:00'}),
  task('over',{due:'2026-10-18',createdAt:'2026-10-01T08:00:00'}),
  task('ret',{situation:'waiting',waitingFor:'Iran',followUp:'2026-10-19',createdAt:'2026-10-01T08:00:00'}),
  task('later',{due:'2026-10-30',createdAt:'2026-10-02T08:00:00'}),
 ],[]);
 const events=timeline(rows,today,9);
 equal(events.map(e=>[e.task.id,e.kind]),[['new','Nova'],['ret','Retorno Iran:'],['over','Venceu:'],['later','Nova'],['over','Nova'],['ret','Nova']]);
});

Deno.test('Painel charge prompt lists the person tasks with days waiting and asks only for text',()=>{
 const rows=toPainelTasks([
  task('Sindicância',{situation:'waiting',waitingFor:'Iran',followUp:'2026-10-07'}),
  task('Norma',{situation:'waiting',waitingFor:'Iran',followUp:'2026-10-19'}),
 ],[]);
 const [person]=peopleBlocks(rows,today);
 const prompt=chargePrompt(person,today);
 equal(prompt.split('\n'),[
  'Redija uma mensagem curta e objetiva para Iran cobrando o retorno destas tarefas:',
  '- Sindicância (parada há 13 dias)',
  '- Norma (parada há 1 dia)',
  'Sugira uma nova data de retorno. Não altere nenhuma tarefa; quero só o texto para eu enviar.',
 ]);
});
