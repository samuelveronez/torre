import type {Task} from './task';
export const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const includedAt=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Data indisponível';
export function newest(a:Task,b:Task){return (b.createdAt??'').localeCompare(a.createdAt??'')||(a.captureId&&a.captureId===b.captureId?(a.capturePosition??0)-(b.capturePosition??0):a.id.localeCompare(b.id));}
export function matchesTask(t:Task,area:string,query:string){return (area==='Tudo'||t.area===area)&&[t.title,t.description,t.waitingFor].join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));}
export function dayGroups(tasks:Task[],date:Date){
 const day=dateKey(date);const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
 const open=tasks.filter(t=>!t.done);const reserved=open.filter(t=>t.at&&Date.parse(t.at)<end.getTime()&&Date.parse(t.at)+t.minutes*60000>start.getTime()).sort((a,b)=>a.at!.localeCompare(b.at!));
 const ids=new Set(reserved.map(t=>t.id));const due=open.filter(t=>!ids.has(t.id)&&t.situation!=='waiting'&&t.due===day).sort(newest);due.forEach(t=>ids.add(t.id));
 const late=open.filter(t=>!ids.has(t.id)&&t.situation!=='waiting'&&t.due&&t.due<day).sort((a,b)=>a.due.localeCompare(b.due)||newest(a,b));
 const follow=open.filter(t=>!ids.has(t.id)&&t.situation==='waiting'&&t.followUp&&t.followUp<=day).sort((a,b)=>a.followUp!.localeCompare(b.followUp!)||newest(a,b));
 return {reserved,due,late,follow};
}
