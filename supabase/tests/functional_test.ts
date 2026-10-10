import {importedTask} from '../functions/_shared/googleImport.ts';
import {allocate} from '../functions/_shared/allocation.ts';
import {chooseReservation,needsReservationChoice} from '../../src/reservationChoices.ts';
import {reservationError,reservationWarning,slotAt} from '../../src/scheduling.ts';
const assert=(value:unknown)=>{if(!value)throw new Error('Assertion failed');};
Deno.test('Reimport preserves all local decisions, and deleted remote tasks remain local',()=>{
 assert(importedTask({title:'Changed remotely',status:'needsAction'},true)===null);
 assert(importedTask({deleted:true},false)===null);
 const task=importedTask({title:' Initial ',notes:'notes',due:'2026-10-12T00:00:00Z',status:'completed'},false)!;
 assert(task.title==='Initial'&&task.due_date==='2026-10-12'&&task.status==='completed'&&!task.google_completion_pending);
});
Deno.test('Reservation changes require choice; waiting keeps only a nonblocking reminder',()=>{
 const task={id:'a',title:'Test',source:'Torre',due:'',minutes:30,area:'Profissional' as const,done:false,at:'2026-10-12T12:00:00Z',situation:'todo' as const};
 assert(!needsReservationChoice(task,{...task,title:'Other'}));
 assert(needsReservationChoice(task,{...task,minutes:60}));
 const reminder=chooseReservation({...task,situation:'waiting'},true);
 assert(reminder.at===task.at&&reminder.reservationKind==='reminder');
 assert(!chooseReservation(task,false).at);
 assert(needsReservationChoice(reminder,{...reminder,situation:'todo'}));
 assert(reservationWarning(task,new Date(task.at),[{...reminder,id:'b'}],[])==='');
});
Deno.test('Configured range controls manual reservation and pointer snapping',()=>{
 const task={id:'a',title:'Test',source:'Torre',due:'',minutes:30,area:'Pessoal' as const,done:false};
 const hours=Array.from({length:7},()=>({enabled:false,start:9,end:18}));
 assert(slotAt(100,100,{start:5,end:23})===300);
 assert(reservationError(task,new Date(2026,9,12,5),hours,[],[],0,{start:5,end:23})==='');
 assert(reservationError(task,new Date(2026,9,12,4),hours,[],[],0,{start:5,end:23}).includes('5h'));
});
Deno.test('Suggestions obey range and work hours, and ignore retained reminders',()=>{
 const from='2026-10-12T00:00:00Z',to='2026-10-19T00:00:00Z';
 const snapshot={preferences:{timezone:'UTC',agenda_start_hour:5,agenda_end_hour:8},tasks:[{id:'a',area:'professional',duration_minutes:30}],hours:[{weekday:1,enabled:true,start_time:'05:00',end_time:'08:00'}],busy:[],blocks:[{kind:'reminder',start_at:'2026-10-12T05:00:00Z',end_at:'2026-10-12T06:00:00Z'}]};
 const result=allocate(snapshot,[{taskId:'a',reason:'Test'}],from,to,Date.parse(from));
 assert(result.placements[0].start==='2026-10-12T05:00:00.000Z');
 const busy=allocate({...snapshot,busy:[{start_at:'2026-10-12T05:00:00Z',end_at:'2026-10-12T06:00:00Z'}]},[{taskId:'a',reason:'Test'}],from,to,Date.parse(from));
 assert(busy.placements[0].start==='2026-10-12T06:00:00.000Z');
});
