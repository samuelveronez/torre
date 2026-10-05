import {slotAt,reservationError,reservationWarning} from '../../src/scheduling.ts';
function assert(value:unknown){if(!value)throw new Error('Assertion failed');}
Deno.test('Pointer positions snap to quarters without card-size offsets',()=>{
 assert(slotAt(100,100)===420);assert(slotAt(112,100)===435);assert(slotAt(147,100)===465);assert(slotAt(-200,100)===420);assert(slotAt(2000,100)===1305);
});
Deno.test('Manual reservations allow conflicts but preserve duration, area and future-time rules',()=>{
 const hours=Array.from({length:7},()=>({enabled:true,start:9,end:18}));const task={id:'a',title:'Task',minutes:30,area:'Profissional' as const,done:false,due:'',source:'Torre'};const at=new Date(2026,9,12,9,15);
 assert(reservationError(task,at,hours,[],[],0)==='');
 assert(reservationError(task,at,hours,[],[{start:9.5,end:10,blocks:true}],0)==='');
 const other={...task,id:'b',area:'Pessoal' as const,at:new Date(2026,9,12,9,30).toISOString()};
 assert(reservationError(task,at,hours,[other],[],0)==='');
 assert(reservationWarning(task,at,[other],[{start:9.5,end:10,blocks:true,title:'Reunião'}]).includes('Reunião · Task'));
 assert(reservationWarning(task,at,[{...other,at:at.toISOString(),id:task.id}],[])==='');
 assert(reservationWarning(task,at,[],[{start:9.5,end:10,blocks:false}])==='');
 assert(reservationWarning(task,at,[{...other,at:new Date(2026,9,12,9,45).toISOString()}],[])==='');
 assert(reservationError({...task,area:'Pessoal'},at,hours,[],[],0).includes('área'));
 assert(reservationError(task,new Date(2026,9,12,17,45),hours,[],[],0).includes('área'));
 assert(reservationError(task,at,hours,[],[],at.getTime()+1).includes('futuro'));
 assert(reservationError(task,new Date('invalid'),hours,[],[],0).includes('válidos'));
});
