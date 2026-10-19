import type {Placement} from './planning.ts';
function overlaps(a:number,b:number,blocks:any[]){return blocks.some(x=>a<Date.parse(x.end_at)&&b>Date.parse(x.start_at));}
export function allocate(snapshot:any,order:{taskId:string;reason:string}[],from:string,to:string,now=Date.now()){
 const tz=snapshot.preferences?.timezone??'America/Sao_Paulo';
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const minutesOf=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
 const prefs=snapshot.preferences;
 const lunch=prefs?.lunch_enabled===false?null:{start:minutesOf(prefs?.lunch_start??'12:00'),end:minutesOf(prefs?.lunch_end??'13:30')};
 const blocks=[...(snapshot.blocks??[]).filter((b:any)=>b.kind!=='reminder'),...(snapshot.busy??[])];const placements:Placement[]=[],unplaced:string[]=[];
 for(const row of order){const task=snapshot.tasks.find((t:any)=>t.id===row.taskId);let placed=false;
  for(let at=Math.max(Date.parse(from),Math.ceil(now/900000)*900000);at+task.duration_minutes*60000<=Date.parse(to);at+=900000){
   const parts=Object.fromEntries(format.formatToParts(new Date(at)).map(x=>[x.type,x.value]));const date=`${parts.year}-${parts.month}-${parts.day}`,weekday=new Date(date+'T12:00:00Z').getUTCDay();
   const start=Number(parts.hour)*60+Number(parts.minute),end=start+task.duration_minutes,h=snapshot.hours.find((x:any)=>x.weekday===weekday);const hs=h?Number(h.start_time.slice(0,2))*60+Number(h.start_time.slice(3,5)):0,he=h?Number(h.end_time.slice(0,2))*60+Number(h.end_time.slice(3,5)):0;
   if(start<(snapshot.preferences?.agenda_start_hour??7)*60||end>(snapshot.preferences?.agenda_end_hour??22)*60||task.area==='professional'&&(!h?.enabled||start<hs||end>he)||task.area==='personal'&&h?.enabled&&start<he&&end>hs)continue;
   if(task.area==='professional'&&lunch&&start<lunch.end&&end>lunch.start)continue;
   const until=at+task.duration_minutes*60000;if(overlaps(at,until,blocks))continue;
   placements.push({taskId:task.id,start:new Date(at).toISOString(),end:new Date(until).toISOString(),reason:row.reason});blocks.push({start_at:new Date(at).toISOString(),end_at:new Date(until).toISOString()});placed=true;break;
  }
  if(!placed)unplaced.push(task.id);
 }
 return {placements,unplaced};
}
