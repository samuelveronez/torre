import type {AgendaRange} from './AgendaRange';
import type {Task} from './task';
import type {Hours} from './useCloudData';
export function slotAt(clientY:number,top:number,range:AgendaRange={start:7,end:22}){return Math.max(range.start*60,Math.min(range.end*60-15,range.start*60+Math.floor((clientY-top)/12)*15));}
export function reservationError(task:Task,at:Date,hours:Hours[],tasks:Task[],blocks:{start:number;end:number;blocks:boolean}[],now=Date.now(),range:AgendaRange={start:7,end:22}){
 if(!Number.isFinite(at.getTime()))return 'Escolha uma data e um horário válidos.';
 if(task.done||task.situation==='waiting')return 'Coloque a tarefa em A fazer antes de reservar.';
 const start=at.getHours()*60+at.getMinutes(),end=start+task.minutes,h=hours[at.getDay()];
 if(at.getTime()<now)return 'Escolha um horário futuro.';
 if(start<range.start*60||end>range.end*60)return `Escolha um horário entre ${range.start}h e ${range.end}h.`;

 return '';
}
export function reservationWarning(task:Task,at:Date,tasks:Task[],blocks:{start:number;end:number;blocks:boolean;title?:string}[]){
 const start=at.getHours()+at.getMinutes()/60,end=start+task.minutes/60;
 const titles=[...blocks.filter(b=>b.blocks&&start<b.end&&end>b.start).map(b=>b.title||'Ocupado'),...tasks.filter(t=>t.id!==task.id&&!t.done&&t.reservationKind!=='reminder'&&t.situation!=='waiting'&&t.at&&at.getTime()<Date.parse(t.at)+t.minutes*60000&&at.getTime()+task.minutes*60000>Date.parse(t.at)).map(t=>t.title)];
 return titles.length?`Sobrepõe ${Array.from(new Set(titles)).join(' · ')}. Você pode reservar mesmo assim.`:'';
}

export function workHoursWarning(task:Task,at:Date,hours:Hours[]){const start=at.getHours()*60+at.getMinutes(),end=start+task.minutes,h=hours[at.getDay()];return task.area==='Profissional'&&(!h?.enabled||start<h.start*60||end>h.end*60)||task.area==='Pessoal'&&h?.enabled&&start<h.end*60&&end>h.start*60?'Este horário foge da jornada da área. Você pode reservar mesmo assim.':'';}
