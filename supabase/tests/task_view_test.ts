import {dayGroups,newest,matchesTask,dateKey} from '../../src/taskView.ts';
import type {Task} from '../../src/task.ts';
const task=(id:string,fields:Partial<Task>={}):Task=>({id,title:id,area:'Pessoal',minutes:30,due:'',source:'Torre',done:false,...fields});
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);}
Deno.test('Meu dia groups overlap midnight, exclude completed and avoid duplicate due reservations',()=>{
 const d=new Date('2026-10-05T12:00:00');const day=dateKey(d);
 const rows=[task('reserved',{at:new Date('2026-10-05T09:00:00').toISOString(),due:day}),task('midnight',{at:new Date('2026-10-04T23:45:00').toISOString()}),task('due',{due:day}),task('late',{due:'2026-10-04'}),task('follow',{situation:'waiting',followUp:day,due:day}),task('future',{situation:'waiting',followUp:'2026-10-06'}),task('done',{done:true,due:day})];
 const groups=dayGroups(rows,d);equal(groups.reserved.map(t=>t.id),['midnight','reserved']);equal(groups.due.map(t=>t.id),['due']);equal(groups.late.map(t=>t.id),['late']);equal(groups.follow.map(t=>t.id),['follow']);
});
Deno.test('Newest uses creation time and preserves capture order for simultaneous tasks',()=>{
 const rows=[task('second',{createdAt:'2026-10-05T12:00:00Z',captureId:'capture',capturePosition:1}),task('old',{createdAt:'2026-10-04T12:00:00Z'}),task('first',{createdAt:'2026-10-05T12:00:00Z',captureId:'capture',capturePosition:0})];equal(rows.sort(newest).map(t=>t.id),['first','second','old']);
});
Deno.test('Shared area and search combine for every task view',()=>{
 const t=task('one',{area:'Profissional',title:'Revisar relatório',waitingFor:'Equipe'});equal(matchesTask(t,'Pessoal','relatório'),false);equal(matchesTask(t,'Profissional',' RELATÓRIO '),true);equal(matchesTask(t,'Tudo','equipe'),true);equal(matchesTask(t,'Tudo','carro'),false);
});
