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
let failed=0;
for(const {name,run} of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.message);}}
console.log(`${tests.length-failed}/${tests.length} testes passaram`);
process.exitCode=failed?1:0;
