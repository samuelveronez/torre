import type {Task} from './task';
export const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const includedAt=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Data indisponível';
export function newest(a:Task,b:Task){return (b.createdAt??'').localeCompare(a.createdAt??'')||(a.captureId&&a.captureId===b.captureId?(a.capturePosition??0)-(b.capturePosition??0):a.id.localeCompare(b.id));}
export function matchesTask(t:Task,area:string,query:string){return (area==='Tudo'||t.area===area)&&[t.title,t.description,t.waitingFor].join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));}
const normalizedPerson=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').trim().replace(/s+/g,' ').toLocaleLowerCase('pt-BR');
export type PersonGroup={key:string;label:string;items:Task[]};
/** Groups waiting tasks by who they wait for, ignoring case and accents. Keeps the incoming order inside each group; "Sem responsável" goes last. */
export function groupByPerson(tasks:Task[]):PersonGroup[]{
 const groups=new Map<string,PersonGroup>();
 for(const task of tasks){
  const name=(task.waitingFor??'').trim().replace(/s+/g,' ');
  const key=name?normalizedPerson(name):'';
  let group=groups.get(key);
  if(!group){group={key,label:name?name[0].toLocaleUpperCase('pt-BR')+name.slice(1):'Sem responsável',items:[]};groups.set(key,group);}
  group.items.push(task);
 }
 return [...groups.values()].sort((a,b)=>!a.key?1:!b.key?-1:a.label.localeCompare(b.label,'pt-BR'));
}
export function dayGroups(tasks:Task[],date:Date){
 const day=dateKey(date);const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
 const open=tasks.filter(t=>!t.done);const reserved=open.filter(t=>t.at&&Date.parse(t.at)<end.getTime()&&Date.parse(t.at)+t.minutes*60000>start.getTime()).sort((a,b)=>a.at!.localeCompare(b.at!));
 const ids=new Set(reserved.map(t=>t.id));const due=open.filter(t=>!ids.has(t.id)&&t.situation!=='waiting'&&t.due===day).sort(newest);due.forEach(t=>ids.add(t.id));
 const late=open.filter(t=>!ids.has(t.id)&&t.situation!=='waiting'&&t.due&&t.due<day).sort((a,b)=>a.due.localeCompare(b.due)||newest(a,b));
 const follow=open.filter(t=>!ids.has(t.id)&&t.situation==='waiting'&&t.followUp&&t.followUp<=day).sort((a,b)=>a.followUp!.localeCompare(b.followUp!)||newest(a,b));
 const focus=open.filter(t=>t.focusDate===day).sort(newest);
 const today=Array.from(new Map([...focus,...reserved,...due].map(t=>[t.id,t])).values());
 const todayIds=new Set(today.map(t=>t.id));
 return {reserved,due,today,late:late.filter(t=>!todayIds.has(t.id)),follow:follow.filter(t=>!todayIds.has(t.id))};
}
