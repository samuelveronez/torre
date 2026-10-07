import type {AiModel} from './aiSettings.ts';
import {generate} from './intelligence.ts';
export type Placement={taskId:string;start:string;end:string;reason:string};
function overlaps(a:number,b:number,blocks:any[]){return blocks.some(x=>a<Date.parse(x.end_at)&&b>Date.parse(x.start_at));}
export function allocate(snapshot:any,order:{taskId:string;reason:string}[],from:string,to:string,now=Date.now()){
 const tz=snapshot.preferences?.timezone??'America/Sao_Paulo';
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const blocks=[...(snapshot.blocks??[]),...(snapshot.busy??[])];const placements:Placement[]=[],unplaced:string[]=[];
 for(const row of order){const task=snapshot.tasks.find((t:any)=>t.id===row.taskId);let placed=false;
  for(let at=Math.max(Date.parse(from),Math.ceil(now/900000)*900000);at+task.duration_minutes*60000<=Date.parse(to);at+=900000){
   const parts=Object.fromEntries(format.formatToParts(new Date(at)).map(x=>[x.type,x.value]));const date=`${parts.year}-${parts.month}-${parts.day}`,weekday=new Date(date+'T12:00:00Z').getUTCDay();
   const start=Number(parts.hour)*60+Number(parts.minute),end=start+task.duration_minutes,h=snapshot.hours.find((x:any)=>x.weekday===weekday);const hs=h?Number(h.start_time.slice(0,2))*60+Number(h.start_time.slice(3,5)):0,he=h?Number(h.end_time.slice(0,2))*60+Number(h.end_time.slice(3,5)):0;
   if(start<420||end>1320||task.area==='professional'&&(!h?.enabled||start<hs||end>he)||task.area==='personal'&&h?.enabled&&start<he&&end>hs)continue;
   const until=at+task.duration_minutes*60000;if(overlaps(at,until,blocks))continue;
   placements.push({taskId:task.id,start:new Date(at).toISOString(),end:new Date(until).toISOString(),reason:row.reason});blocks.push({start_at:new Date(at).toISOString(),end_at:new Date(until).toISOString()});placed=true;break;
  }
  if(!placed)unplaced.push(task.id);
 }
 return {placements,unplaced};
}
export function validateOrder(data:any,ids:string[]){
 if(!Array.isArray(data?.order)||data.order.length!==ids.length||new Set(data.order.map((r:any)=>r.taskId)).size!==ids.length||data.order.some((r:any)=>!ids.includes(r?.taskId)||typeof r.reason!=='string'||r.reason.length>400))throw new Error('A IA retornou uma ordem inválida. Gere novamente.');
 return data.order as {taskId:string;reason:string}[];
}
export async function propose(snapshot:any,from:string,to:string,instruction:string,key:string,model:AiModel='openrouter/free'){
 const {data}=await generate('Organize as tarefas por prioridade para reservar na semana. Considere prazos explícitos e a orientação do usuário, sem inventar dependências. Não sugira horários nem altere tarefas. Retorne cada ID exatamente uma vez: {"order":[{"taskId":"ID existente","reason":"justificativa curta em português"}]}.', {tasks:snapshot.tasks.map((t:any)=>({id:t.id,title:t.title,area:t.area,duration:t.duration_minutes,due:t.due_date})),instruction},key,model);
 return allocate(snapshot,validateOrder(data,snapshot.tasks.map((t:any)=>t.id)),from,to);
}
