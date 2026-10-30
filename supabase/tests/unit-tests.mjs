import assert from 'node:assert/strict';
const tests=[];
globalThis.Deno={test:(name,run)=>tests.push({name,run})};
for(const file of ['task_view_test','scheduling_test','calendar_test','task_drag_test','label_area_test','painel_model_test','radar_model_test','functional_test'])await import(`./${file}.ts`);
const {primaryPerson,composePeople}=await import('../../src/task.ts');
tests.push({name:'Pessoa única da tarefa: prioriza quem se aguarda, converte nome antigo e preserva demais vínculos',run(){
 const ana={name:'Ana',personId:'p1',role:'involved'},rui={name:'Rui',personId:null,role:'waiting_for'};
 assert.deepEqual(primaryPerson({people:[ana,rui]}),{primary:rui,others:[ana]});
 assert.deepEqual(primaryPerson({people:[ana]}),{primary:ana,others:[]});
 assert.deepEqual(primaryPerson({waitingFor:' Cardia '}),{primary:{name:'Cardia',personId:null,role:'waiting_for'},others:[]});
 assert.deepEqual(primaryPerson({}),{primary:null,others:[]});
 assert.deepEqual(composePeople({name:'Cardia',personId:'p2'},true,[ana]),[{name:'Cardia',personId:'p2',role:'waiting_for'},ana]);
 assert.deepEqual(composePeople({name:'ana',personId:'p1'},false,[ana]),[{name:'ana',personId:'p1',role:'involved'}]);
 assert.deepEqual(composePeople(null,false,[]),[]);
}});
const {hiddenReservationCount}=await import('../../src/reservationVisibility.ts');
tests.push({name:'Aviso considera período, filtros, tarefas concluídas e reservas atravessando meia-noite',run(){
 const task=(id,at,extra={})=>({id,at,minutes:30,done:false,...extra});
 const rows=[task('night','2026-10-09T23:45:00'),task('day','2026-10-10T10:00:00'),task('future','2026-10-11T10:00:00'),task('done','2026-10-10T11:00:00',{done:true})];
 assert.equal(hiddenReservationCount(rows,[],[new Date('2026-10-10T12:00:00')]),2);
 assert.equal(hiddenReservationCount(rows,[rows[1]],[new Date('2026-10-10T12:00:00')]),1);
 assert.equal(hiddenReservationCount(rows,rows,[new Date('2026-10-10T12:00:00')]),0);
 assert.equal(hiddenReservationCount(rows,[],[new Date('2026-10-09T12:00:00'),new Date('2026-10-10T12:00:00')]),2);
}});
const {dayLoad,loadLabel}=await import('../../src/dayLoad.ts');
tests.push({name:'Carga do dia soma reservas ativas dentro da jornada e respeita dias sem jornada',run(){
 const hours=Array.from({length:7},(_,i)=>({enabled:i>0&&i<6,start:8,end:18}));
 const task=(at,minutes,extra={})=>({id:at,at,minutes,done:false,...extra});
 const rows=[task('2026-10-19T09:00:00',90),task('2026-10-19T14:00:00',120),task('2026-10-19T16:00:00',30,{done:true}),task('2026-10-18T23:30:00',60)];
 const monday=dayLoad(new Date('2026-10-19T12:00:00'),hours,rows);
 assert.deepEqual([monday.planned,monday.capacity,Math.round(monday.ratio*100)],[240,600,40]);
 assert.equal(loadLabel(monday),'4 h de 10 h');
 const sunday=dayLoad(new Date('2026-10-18T12:00:00'),hours,rows);
 assert.equal(sunday.planned,30);assert.equal(sunday.ratio,0);
 assert.equal(loadLabel(sunday),'30 min sem jornada');
 assert.equal(loadLabel(dayLoad(new Date('2026-10-24T12:00:00'),hours,[])),'Sem jornada');
 assert.equal(dayLoad(new Date('2026-10-19T12:00:00'),hours,[task('2026-10-19T08:00:00',900)]).ratio,1);
}});
const {groupConversations}=await import('../../src/agent/groupConversations.ts');
tests.push({name:'Histórico do Modo IA agrupa por Hoje, Ontem, Esta semana e Anteriores e omite grupos vazios',run(){
 const now=new Date('2026-10-19T15:00:00');
 const at=(days,hour=9)=>{const d=new Date(now);d.setDate(d.getDate()-days);d.setHours(hour,0,0,0);return d.toISOString();};
 const c=(id,days,hour)=>({conversation_id:id,title:id,updated_at:at(days,hour),run_count:1});
 const groups=groupConversations([c('a',0,1),c('b',1,23),c('c',2),c('d',6),c('e',7),c('f',30)],now);
 assert.deepEqual(groups.map(g=>[g.title,g.items.map(i=>i.conversation_id)]),[['Hoje',['a']],['Ontem',['b']],['Esta semana',['c','d']],['Anteriores',['e','f']]]);
 assert.deepEqual(groupConversations([c('x',0)],now).map(g=>g.title),['Hoje']);
 assert.deepEqual(groupConversations([],now),[]);
}});
tests.push({name:'Carga do dia soma tarefas e reuniões com horário sem contar duas vezes a sobreposição',run(){
 const hours=Array.from({length:7},(_,i)=>({enabled:i>0&&i<6,start:8,end:18}));
 const task=(at,minutes)=>({id:at,at,minutes,done:false});
 const meeting=(start,end,extra={})=>({start_at:start,end_at:end,all_day:false,blocks_time:true,...extra});
 const day=new Date('2026-10-20T12:00:00');
 const tasks=[task('2026-10-20T10:00:00',60)];
 const meetings=[meeting('2026-10-20T09:00:00','2026-10-20T10:30:00'),meeting('2026-10-20T14:00:00','2026-10-20T15:00:00')];
 const load=dayLoad(day,hours,tasks,meetings);
 assert.equal(load.planned,180,'09:00-11:00 merged (120) + 60 de reunião à tarde, tarefa sobreposta conta uma vez');
 assert.equal(loadLabel(load),'3 h de 10 h');
 assert.equal(dayLoad(day,hours,tasks,[meeting('2026-10-20T00:00:00','2026-10-21T00:00:00',{all_day:true})]).planned,60,'evento de dia inteiro não conta');
 assert.equal(dayLoad(day,hours,[],[meeting('2026-10-20T09:00:00','2026-10-20T10:00:00',{blocks_time:false})]).planned,0,'evento que não bloqueia não conta');
 assert.equal(dayLoad(day,hours,[],[meeting('2026-10-19T23:30:00','2026-10-20T00:30:00')]).planned,30,'reunião atravessando a meia-noite conta só a parte do dia');
}});
const {hourToClock,clockToHour}=await import('../../src/hourClock.ts');
tests.push({name:'Jornada aceita minutos quebrados e desconta o almoço da capacidade',run(){
 assert.equal(hourToClock(8.5),'08:30');assert.equal(hourToClock(8.25),'08:15');assert.equal(clockToHour('08:15'),8.25);
 const lunch={enabled:true,start:12,end:13.5};
 const hours=Array.from({length:7},()=>({enabled:true,start:8.5,end:18,lunch}));
 const day=dayLoad(new Date('2026-10-19T12:00:00'),hours,[]);
 assert.equal(day.capacity,9.5*60-90);
 hours[1].lunch={...lunch,enabled:false};
 assert.equal(dayLoad(new Date('2026-10-19T12:00:00'),hours,[]).capacity,9.5*60);
 hours[1].lunch={enabled:true,start:7,end:8};
 assert.equal(dayLoad(new Date('2026-10-19T12:00:00'),hours,[]).capacity,9.5*60);
}});
let failed=0;
for(const {name,run} of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.message);}}
console.log(`${tests.length-failed}/${tests.length} testes passaram`);
process.exitCode=failed?1:0;
