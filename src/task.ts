import type {Priority} from './priority';
export type TaskPerson={name:string;personId:string|null;role:'involved'|'waiting_for'};
export type Task={people?:TaskPerson[];priority?:Priority;id:string;createdAt?:string;capturePosition?:number;title:string;area:'Pessoal'|'Profissional';minutes:number;due:string;source:string;done:boolean;at?:string;focusDate?:string;reservationKind?:'execution'|'reminder';description?:string;link?:string;situation?:'todo'|'waiting';waitingFor?:string;followUp?:string;labelIds?:string[];captureId?:string;googleTaskId?:string;completionPending?:boolean;syncError?:string};
/** Pessoa principal da tarefa: a de quem se aguarda retorno, senão a primeira; tarefas antigas só com `waitingFor` viram pessoa. */
export function primaryPerson(task:Pick<Task,'people'|'waitingFor'>):{primary:TaskPerson|null;others:TaskPerson[]}{
 const people=task.people??[];
 const found=people.find(p=>p.role==='waiting_for')??people[0];
 const legacy=task.waitingFor?.trim();
 const primary=found??(legacy?{name:legacy,personId:null,role:'waiting_for' as const}:null);
 return {primary,others:people.filter(p=>p!==found)};
}
/** Monta a lista salva: pessoa principal primeiro, depois as demais sem repetir nome e participação. */
export function composePeople(primary:{name:string;personId:string}|null,waiting:boolean,others:TaskPerson[]):TaskPerson[]{
 const first:TaskPerson[]=primary?[{name:primary.name,personId:primary.personId,role:waiting?'waiting_for':'involved'}]:[];
 const seen=new Set(first.map(p=>`${p.name.toLocaleLowerCase('pt-BR')}|${p.role}`));
 const rest=others.filter(p=>{const key=`${p.name.toLocaleLowerCase('pt-BR')}|${p.role}`;if(seen.has(key))return false;seen.add(key);return true;});
 return [...first,...rest];
}
export function safeLink(value?:string){try{const url=new URL(value||'');return ['https:','http:'].includes(url.protocol)?url.href:undefined;}catch{return undefined;}}
