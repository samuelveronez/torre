import assert from 'node:assert/strict';
const tests=[];
globalThis.Deno={test:(name,run)=>tests.push({name,run})};
for(const file of ['task_view_test','scheduling_test','calendar_test','task_drag_test','label_area_test','functional_test'])await import(`./${file}.ts`);
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
let failed=0;
for(const {name,run} of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.message);}}
console.log(`${tests.length-failed}/${tests.length} testes passaram`);
process.exitCode=failed?1:0;
