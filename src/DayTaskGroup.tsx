import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import type {Task} from './task';

export function DayTaskGroup({title,rows,renderRow,collapse=false}:{title:string;rows:Task[];renderRow:(task:Task)=>ReactNode;collapse?:boolean}){
 const [expanded,setExpanded]=useState(false);
 const [open,setOpen]=useState(rows.length>0);
 useEffect(()=>{if(rows.length)setOpen(true);},[rows.length>0]);
 const visible=expanded?rows:rows.slice(0,6);
 const content=<>{rows.length?visible.map(renderRow):<p className="section-empty">Nenhuma tarefa.</p>}{rows.length>6&&<div className="day-list-footer"><small>Mostrando {visible.length} de {rows.length}</small><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Mostrar menos':`Ver todas (${rows.length})`}</button></div>}</>;
 if(!rows.length)return <section className="day-group is-empty"><h2>{title} <span className="count">0</span></h2><p className="section-empty">Nenhuma tarefa.</p></section>;
 return collapse?<details className="day-group" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{title} <span className="count">{rows.length}</span></summary>{content}</details>:<section className="day-group"><h2>{title} <span className="count">{rows.length}</span></h2>{content}</section>;
}
