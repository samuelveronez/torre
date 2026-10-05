import {createContext,useContext,useState} from 'react';
import {priorities,type Priority} from './priority';
import type {Task} from './task';
export const PriorityContext=createContext<((id:string,priority:Priority)=>Promise<boolean>)|null>(null);
export function InlinePriority({task}:{task:Task}){
 const save=useContext(PriorityContext);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!save)return null;
 return <div className="inline-priority" draggable={false} onPointerDown={e=>e.stopPropagation()} onDragStart={e=>{e.preventDefault();e.stopPropagation();}}><select className={`priority-${task.priority??'none'}`} aria-label={`Prioridade de ${task.title}`} value={task.priority??'none'} disabled={busy} onChange={async e=>{const value=e.target.value as Priority;setBusy(true);setError('');try{if(!await save(task.id,value))setError('Não foi possível salvar a prioridade. Tente novamente.');}catch{setError('Não foi possível salvar a prioridade. Tente novamente.');}finally{setBusy(false);}}}>{priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>{busy&&<small role="status">Salvando…</small>}{error&&<small role="alert">{error}</small>}</div>;
}
