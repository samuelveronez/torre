import type {Task} from '../task';
import type {Label} from '../features';
import type {Priority} from '../priority';
import {dateKey,groupByPerson} from '../taskView';

export const NO_THEME='Sem tema';
export const NO_THEME_COLOR='#9aa3ae';
export const WINDOW_BEFORE=15;
export const WINDOW_DAYS=35;
const weight:Record<Priority,number>={high:3,medium:2,low:1,none:0};

export type PTask={
 id:string;
 title:string;
 status:'todo'|'waiting';
 prio:Priority;
 /** Day number (days since 1970-01-01) of the due date, or of the follow-up for waiting tasks. */
 date:number|null;
 kind:'prazo'|'retorno';
 labels:string[];
 who:string|null;
 created:number;
 raw:Task;
};

export function dayNumber(key:string){
 return Math.round(Date.UTC(+key.slice(0,4),+key.slice(5,7)-1,+key.slice(8,10))/86400000);
}
export function dayKey(day:number){
 return new Date(day*86400000).toISOString().slice(0,10);
}
export function dayLabel(day:number){
 const key=dayKey(day);
 return `${key.slice(8,10)}/${key.slice(5,7)}`;
}
export function todayNumber(){
 return dayNumber(dateKey(new Date()));
}

export function toPainelTasks(tasks:Task[],labels:Label[]):PTask[]{
 const names=new Map(labels.filter(l=>!l.archived).map(l=>[l.id,l.name]));
 return tasks.filter(t=>!t.done).map(t=>{
  const waiting=t.situation==='waiting';
  const key=waiting?(t.followUp||t.due):t.due;
  const who=(t.waitingFor??'').trim();
  return {
   id:t.id,
   title:t.title,
   status:waiting?'waiting':'todo',
   prio:t.priority??'none',
   date:key?dayNumber(key):null,
   kind:waiting?'retorno':'prazo',
   labels:(t.labelIds??[]).map(id=>names.get(id)).filter((name):name is string=>!!name),
   who:who||null,
   created:t.createdAt?dayNumber(dateKey(new Date(t.createdAt))):-1e9,
   raw:t,
  };
 });
}

export function snapshot(tasks:PTask[],day:number){
 const all=tasks.filter(t=>t.created<=day);
 const dated=all.filter(t=>t.date!==null);
 return {
  all,
  over:dated.filter(t=>t.date!<day),
  soon:dated.filter(t=>t.date!>=day&&t.date!<=day+7),
  later:dated.filter(t=>t.date!>day+7),
  undated:all.filter(t=>t.date===null),
  wait:all.filter(t=>t.status==='waiting'||t.who),
 };
}

export type Focus={task:PTask;verb:string;late:boolean};
export function focusList(tasks:PTask[],day:number,limit=5):Focus[]{
 const score=(t:PTask)=>(t.date!==null&&t.date<day?100+(day-t.date)*2:0)+(t.date!==null&&t.date>=day&&t.date<=day+2?60:0)+weight[t.prio]*10;
 return tasks.filter(t=>t.created<=day).sort((a,b)=>score(b)-score(a)).slice(0,limit).map(task=>{
  const late=task.date!==null&&task.date<day;
  const verb=task.who?'COBRAR '+task.who.toLocaleUpperCase('pt-BR'):late?'CONCLUIR OU REPLANEJAR':task.date!==null?'ENTREGAR':'DEFINIR PRAZO';
  return {task,verb,late};
 });
}

export type PersonBlock={name:string;tasks:PTask[];days:number;sum:number};
export function peopleBlocks(tasks:PTask[],day:number):PersonBlock[]{
 const byId=new Map(tasks.map(t=>[t.id,t]));
 const waiting=tasks.filter(t=>t.who&&t.created<=day);
 return groupByPerson(waiting.map(t=>t.raw)).filter(g=>g.key).map(group=>{
  const rows=group.items.map(item=>byId.get(item.id)!);
  const ages=rows.map(t=>Math.max(0,day-(t.date??t.created)));
  return {name:group.label,tasks:rows,days:Math.max(...ages),sum:ages.reduce((a,b)=>a+b,0)};
 }).sort((a,b)=>b.sum-a.sum);
}

export type ThemeGroup={name:string;color:string;tasks:PTask[];overdue:number};
export function themeGroups(tasks:PTask[],labels:Label[],day:number):ThemeGroup[]{
 const colors=new Map(labels.map(l=>[l.name,l.color]));
 const groups=new Map<string,PTask[]>();
 for(const task of tasks.filter(t=>t.created<=day)){
  const name=task.labels[0]??NO_THEME;
  groups.set(name,[...(groups.get(name)??[]),task]);
 }
 return [...groups.entries()].sort((a,b)=>b[1].length-a[1].length).map(([name,rows])=>({
  name,
  color:colors.get(name)??NO_THEME_COLOR,
  tasks:[...rows].sort((a,b)=>Number(a.date===null)-Number(b.date===null)||(a.date??0)-(b.date??0)),
  overdue:rows.filter(t=>t.date!==null&&t.date<day).length,
 }));
}

export function scrubberDays(tasks:PTask[],today:number){
 return Array.from({length:WINDOW_DAYS},(_,i)=>{
  const day=today-WINDOW_BEFORE+i;
  return {day,due:tasks.filter(t=>t.date===day).length};
 });
}

export function overdueTrend(tasks:PTask[],today:number){
 return Array.from({length:WINDOW_DAYS},(_,i)=>{
  const day=today-WINDOW_BEFORE+i;
  return {day,count:tasks.filter(t=>t.created<=day&&t.date!==null&&t.date<day).length};
 });
}

export type TimelineEvent={when:number;kind:string;task:PTask};
export function timeline(tasks:PTask[],day:number,limit=9):TimelineEvent[]{
 const events:TimelineEvent[]=[];
 for(const task of tasks){
  if(task.created<=day)events.push({when:task.created,kind:'Nova',task});
  if(task.date!==null&&task.date<=day)events.push({when:task.date,kind:task.kind==='retorno'?`Retorno ${task.who??''}:`:'Venceu:',task});
 }
 return events.sort((a,b)=>b.when-a.when||weight[b.task.prio]-weight[a.task.prio]).slice(0,limit);
}
