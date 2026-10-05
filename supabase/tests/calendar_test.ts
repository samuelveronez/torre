import {invitationResponse,blocksPlanning} from '../functions/_shared/calendar.ts';
import {layoutIntervals,intersects} from '../../src/agendaLayout.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
Deno.test('Read our invitation response without assuming the shared calendar owner is us',()=>{
 for(const status of ['accepted','tentative','needsAction','declined'] as const){
  assert(invitationResponse({attendees:[{email:'Me@Example.com',responseStatus:status}]},'me@example.com','shared')===status);
 }
 assert(invitationResponse({attendees:[{self:true,responseStatus:'accepted'}]},'me@example.com','other@example.com')===null);
 assert(invitationResponse({attendees:[{self:true,responseStatus:'tentative'}]},'me@example.com','me@example.com')==='tentative');
 assert(invitationResponse({attendees:[{self:true,email:'owner@example.com',responseStatus:'accepted'},{email:'me@example.com',responseStatus:'declined'}]},'me@example.com','owner@example.com')==='declined');
 assert(invitationResponse({},'me@example.com','me@example.com')===null);
 assert(invitationResponse({attendees:[{email:'me@example.com',responseStatus:'unknown'}]},'me@example.com','me@example.com')===null);
});
Deno.test('Automatic planning avoids accepted, tentative and unanswered invitations, not declined or free events',()=>{
 for(const status of ['accepted','tentative','needsAction',null] as const)assert(blocksPlanning(true,undefined,status));
 assert(!blocksPlanning(true,undefined,'declined'));
 assert(!blocksPlanning(true,'transparent','accepted'));
 assert(!blocksPlanning(false,undefined,'tentative'));
});
Deno.test('Overlap columns handle simultaneous, nested and chained intervals without changing times',()=>{
 const rows=[{id:'a',start:0,end:60},{id:'b',start:0,end:30},{id:'c',start:15,end:45},{id:'d',start:45,end:90},{id:'e',start:90,end:120}];
 const result=layoutIntervals(rows);
 assert(result.slice(0,4).every(x=>x.columns===3));assert(result[4].columns===1);
 assert(result.find(x=>x.id==='a')!.overlaps.length===3);
 for(const x of result){const original=rows.find(row=>row.id===x.id)!;assert(x.start===original.start&&x.end===original.end);for(const y of result)if(x.id!==y.id&&intersects(x,y))assert(x.column!==y.column);}
 assert(JSON.stringify(result)===JSON.stringify(layoutIntervals(rows.reverse())));
 assert(layoutIntervals([{id:'bad',start:1,end:0}]).length===0);
});
