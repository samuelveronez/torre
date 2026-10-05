import {slotAt,reservationError} from '../../src/scheduling.ts';
function assert(value:unknown){if(!value)throw new Error('Assertion failed');}
Deno.test('Pointer positions snap to quarters without card-size offsets',()=>{
 assert(slotAt(100,100)===420);assert(slotAt(112,100)===435);assert(slotAt(147,100)===465);assert(slotAt(-200,100)===420);assert(slotAt(2000,100)===1305);
});
Deno.test('A reservation uses the complete duration and blocks conflicts across areas',()=>{
 const hours=Array.from({length:7},()=>({enabled:true,start:9,end:18}));const task={id:'a',title:'Task',minutes:30,area:'Profissional' as const,done:false,due:'',source:'Torre'};const at=new Date(2026,9,12,9,15);
 assert(reservationError(task,at,hours,[],[],0)==='');
 assert(reservationError(task,at,hours,[],[{start:9.5,end:10,blocks:true}],0).includes('ocupado'));
 assert(reservationError(task,at,hours,[{...task,id:'b',area:'Pessoal',at:new Date(2026,9,12,9,30).toISOString()}],[],0).includes('ocupado'));
 assert(reservationError({...task,area:'Pessoal'},at,hours,[],[],0).includes('área'));
 assert(reservationError(task,new Date(2026,9,12,17,45),hours,[],[],0).includes('área'));
 assert(reservationError(task,at,hours,[],[],at.getTime()+1).includes('futuro'));
});
