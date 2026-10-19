import type {Task} from './task';
export type WorkHours={enabled:boolean;start:number;end:number};
export type DayLoad={planned:number;capacity:number;ratio:number};
/** Minutes of reserved tasks inside the day, against the working hours configured for that weekday. */
export function dayLoad(date:Date,hours:WorkHours[],tasks:Task[]):DayLoad{
 const from=new Date(date);from.setHours(0,0,0,0);
 const to=new Date(from);to.setDate(to.getDate()+1);
 const planned=tasks.reduce((sum,task)=>{
  if(task.done||!task.at)return sum;
  const start=Date.parse(task.at);
  const end=start+task.minutes*60000;
  const overlap=Math.min(end,to.getTime())-Math.max(start,from.getTime());
  return overlap>0?sum+Math.round(overlap/60000):sum;
 },0);
 const day=hours[date.getDay()];
 const capacity=day?.enabled&&day.end>day.start?(day.end-day.start)*60:0;
 return {planned,capacity,ratio:capacity?Math.min(1,planned/capacity):0};
}
const duration=(minutes:number)=>{
 const h=Math.floor(minutes/60),m=minutes%60;
 return h?(m?`${h} h ${String(m).padStart(2,'0')}`:`${h} h`):`${m} min`;
};
export function loadLabel(load:DayLoad){
 if(!load.capacity)return load.planned?`${duration(load.planned)} sem jornada`:'Sem jornada';
 return `${duration(load.planned)} de ${duration(load.capacity)}`;
}
const months=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
/** "19 a 25 de outubro", or both months when the week crosses a boundary. */
export function weekRangeLabel(first:Date){
 const last=new Date(first);last.setDate(last.getDate()+6);
 if(first.getMonth()===last.getMonth())return `${first.getDate()} a ${last.getDate()} de ${months[last.getMonth()]}`;
 return `${first.getDate()} de ${months[first.getMonth()]} a ${last.getDate()} de ${months[last.getMonth()]}`;
}
const hhmm=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
/** Earliest start to latest end among the enabled weekdays. */
export function hoursSummary(hours:WorkHours[]){
 const on=hours.filter(h=>h.enabled&&h.end>h.start);
 if(!on.length)return 'sem jornada';
 return `jornada ${hhmm(Math.min(...on.map(h=>h.start)))}–${hhmm(Math.max(...on.map(h=>h.end)))}`;
}
