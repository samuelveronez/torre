import {radarLabelId,isRadarTheme,executableTasks,nextReviewDate,reviewPending,saoPauloDay,filterThemes,sortThemes,radarCounters,linkedActions,noFilters,type RadarTheme} from '../../src/radar/radarModel.ts';
import {dayGroups} from '../../src/taskView.ts';
import type {Task} from '../../src/task.ts';
const task=(id:string,fields:Partial<Task>={}):Task=>({id,title:id,area:'Profissional',minutes:30,due:'',source:'Torre',done:false,createdAt:'2026-10-01T12:00:00',...fields});
const theme=(id:string,record:Partial<RadarTheme['record']>={},fields:Partial<Task>={}):RadarTheme=>({task:task(id,fields),record:{taskId:id,temperature:'observar',intervalDays:15,nextReview:'2026-11-15',lastReviewedAt:null,notes:'',...record}});
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);}

Deno.test('Radar label: found by name ignoring case and spaces, archived labels do not count',()=>{
 const labels=[{id:'a',name:'Família',archived:false},{id:'r',name:' radar ',archived:false}];
 equal(radarLabelId(labels),'r');
 equal(radarLabelId([{id:'r',name:'Radar',archived:true}]),undefined);
 equal(radarLabelId([]),undefined);
});
Deno.test('Radar predicate: only the label makes a theme; linked actions stay executable',()=>{
 const theme1=task('theme',{labelIds:['r']});
 const action=task('action',{radarTaskId:'theme'});
 const plain=task('plain',{labelIds:['x']});
 equal(isRadarTheme(theme1,'r'),true);
 equal(isRadarTheme(action,'r'),false);
 equal(isRadarTheme(plain,'r'),false);
 equal(isRadarTheme(theme1,undefined),false);
 equal(executableTasks([theme1,action,plain],'r').map(t=>t.id),['action','plain']);
 equal(executableTasks([theme1,action],undefined).length,2);
 equal(linkedActions([theme1,action,plain],'theme').map(t=>t.id),['action']);
});
Deno.test('Radar theme with a preexisting due date is not overdue on Meu dia once excluded',()=>{
 const old=task('old-theme',{labelIds:['r'],due:'2026-10-01'});
 const real=task('real',{due:'2026-10-02'});
 const day=new Date('2026-10-20T12:00:00');
 equal(dayGroups([old,real],day).late.map(t=>t.id),['old-theme','real']);
 equal(dayGroups(executableTasks([old,real],'r'),day).late.map(t=>t.id),['real']);
});
Deno.test('Radar review: next date is the confirmation day plus the interval, in São Paulo time',()=>{
 equal(nextReviewDate(new Date('2026-10-30T15:00:00Z'),15),'2026-11-14');
 equal(nextReviewDate(new Date('2026-10-30T15:00:00Z'),7),'2026-11-06');
 equal(nextReviewDate(new Date('2026-10-30T15:00:00Z'),30),'2026-11-29');
 // 01:00 UTC ainda é a noite do dia anterior em São Paulo (UTC-3).
 equal(saoPauloDay(new Date('2026-11-01T01:00:00Z')),'2026-10-31');
 equal(nextReviewDate(new Date('2026-11-01T01:00:00Z'),7),'2026-11-07');
 // Virada de ano.
 equal(nextReviewDate(new Date('2026-12-28T15:00:00Z'),7),'2027-01-04');
});
Deno.test('Radar review is pending when the date is today or past, or missing; never "overdue"',()=>{
 equal(reviewPending({nextReview:'2026-10-29'},'2026-10-30'),true);
 equal(reviewPending({nextReview:'2026-10-30'},'2026-10-30'),true);
 equal(reviewPending({nextReview:'2026-10-31'},'2026-10-30'),false);
 equal(reviewPending({nextReview:null},'2026-10-30'),true);
});
Deno.test('Radar filters: by temperature, pending review and text in title, description and notes',()=>{
 const rows=[
  theme('Contrato',{temperature:'critico',nextReview:'2026-10-01',notes:'Aguardando jurídico'}),
  theme('Orçamento',{temperature:'atencao'},{description:'Ciclo 2027'}),
  theme('Ideias',{}),
 ];
 const today='2026-10-30';
 equal(filterThemes(rows,{...noFilters,temperature:'critico'},today).map(t=>t.task.id),['Contrato']);
 equal(filterThemes(rows,{...noFilters,pendingOnly:true},today).map(t=>t.task.id),['Contrato']);
 equal(filterThemes(rows,{...noFilters,query:'juridico'},today).map(t=>t.task.id),['Contrato']);
 equal(filterThemes(rows,{...noFilters,query:'ciclo'},today).map(t=>t.task.id),['Orçamento']);
 equal(filterThemes(rows,noFilters,today).length,3);
});
Deno.test('Radar order and counters: critical first, then pending review; counters ignore filters',()=>{
 const today='2026-10-30';
 const rows=[
  theme('b-observar',{nextReview:'2026-11-20'}),
  theme('a-observar-pendente',{nextReview:'2026-10-10'}),
  theme('c-atencao',{temperature:'atencao'}),
  theme('d-critico',{temperature:'critico'}),
 ];
 equal(sortThemes(rows,today).map(t=>t.task.id),['d-critico','c-atencao','a-observar-pendente','b-observar']);
 equal(radarCounters(rows,today),{monitored:4,attention:2,pending:1});
});
