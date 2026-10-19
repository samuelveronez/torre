import type {Task} from './task';
import {hourToClock,lunchOverlapMinutes,type Lunch} from './hourClock';
// lunch is the single break from preferences, copied onto every weekday when loaded.
export type WorkHours={enabled:boolean;start:number;end:number;lunch?:Lunch};
export type DayLoad={planned:number;capacity:number;ratio:number};
export type LoadEvent={start_at:string;end_at:string;all_day:boolean;blocks_time:boolean};
type Interval={start:number;end:number};
/** Busy minutes inside the day: reserved tasks plus timed meetings, merged so overlaps count once. */
function busyMinutes(from:number,to:number,intervals:Interval[]){
 const clipped=intervals
  .map(i=>({start:Math.max(i.start,from),end:Math.min(i.end,to)}))
  .filter(i=>i.end>i.start)
  .sort((a,b)=>a.start-b.start);
 let total=0,cursor=from;
 for(const i of clipped){
  const start=Math.max(i.start,cursor);
  if(i.end>start){total+=i.end-start;cursor=i.end;}
 }
 return Math.round(total/60000);
}
/** Busy time of the day (tasks and meetings) against the working hours configured for that weekday. */
export function dayLoad(date:Date,hours:WorkHours[],tasks:Task[],events:LoadEvent[]=[]):DayLoad{
 const from=new Date(date);from.setHours(0,0,0,0);
 const to=new Date(from);to.setDate(to.getDate()+1);
 const intervals:Interval[]=[];
 for(const task of tasks){
  if(task.done||!task.at)continue;
  const start=Date.parse(task.at);
  intervals.push({start,end:start+task.minutes*60000});
 }
 for(const event of events){
  if(event.all_day||!event.blocks_time)continue;
  intervals.push({start:Date.parse(event.start_at),end:Date.parse(event.end_at)});
 }
 const planned=busyMinutes(from.getTime(),to.getTime(),intervals);
 const day=hours[date.getDay()];
 const capacity=day?.enabled&&day.end>day.start?Math.round((day.end-day.start)*60)-lunchOverlapMinutes(day.lunch,day.start,day.end):0;
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
const hhmm=hourToClock;
/** Earliest start to latest end among the enabled weekdays. */
export function hoursSummary(hours:WorkHours[]){
 const on=hours.filter(h=>h.enabled&&h.end>h.start);
 if(!on.length)return 'sem jornada';
 return `jornada ${hhmm(Math.min(...on.map(h=>h.start)))}–${hhmm(Math.max(...on.map(h=>h.end)))}`;
}
