import type {Task} from './task';
import type {Hours} from './useCloudData';
export function slotAt(clientY:number,top:number){return Math.max(420,Math.min(1305,420+Math.floor((clientY-top)/12)*15));}
export function reservationError(task:Task,at:Date,hours:Hours[],tasks:Task[],blocks:{start:number;end:number;blocks:boolean}[],now=Date.now()){
 if(task.done||task.situation==='waiting')return 'Coloque a tarefa em A fazer antes de reservar.';
 const start=at.getHours()*60+at.getMinutes(),end=start+task.minutes,h=hours[at.getDay()];
 if(at.getTime()<now)return 'Escolha um horário futuro.';
 if(start<420||end>1320)return 'Escolha um horário entre 7h e 22h.';
 if(task.area==='Profissional'&&(!h.enabled||start<h.start*60||end>h.end*60)||task.area==='Pessoal'&&h.enabled&&start<h.end*60&&end>h.start*60)return 'Esse horário não corresponde à área da tarefa.';
 if(blocks.some(b=>b.blocks&&start/60<b.end&&end/60>b.start)||tasks.some(t=>t.id!==task.id&&!t.done&&t.at&&at.getTime()<Date.parse(t.at)+t.minutes*60000&&at.getTime()+task.minutes*60000>Date.parse(t.at)))return 'Esse intervalo já está ocupado.';
 return '';
}
