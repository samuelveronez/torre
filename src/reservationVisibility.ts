import type {Task} from './task';
/** Count only reservations intersecting the displayed dates, including overnight tasks. */
export function hiddenReservationCount(all:Task[],visible:Task[],dates:Date[]){
 const ids=new Set(visible.map(task=>task.id));
 return all.filter(task=>{
  if(task.done||!task.at||ids.has(task.id))return false;
  const start=Date.parse(task.at),end=start+task.minutes*60000;
  return dates.some(date=>{const from=new Date(date);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);return start<to.getTime()&&end>from.getTime();});
 }).length;
}
