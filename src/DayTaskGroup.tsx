import {useState} from 'react';
import type {ReactNode} from 'react';
import type {Task} from './task';

export function DayTaskGroup({title,rows,renderRow,collapse=false}:{title:string;rows:Task[];renderRow:(task:Task)=>ReactNode;collapse?:boolean}){
 const [expanded,setExpanded]=useState(false);
 const visible=expanded?rows:rows.slice(0,6);
 const content=<>{rows.length?visible.map(renderRow):<p className="section-empty">Nenhuma tarefa.</p>}{rows.length>6&&<div className="day-list-footer"><small>Mostrando {visible.length} de {rows.length}</small><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Mostrar menos':`Ver todas (${rows.length})`}</button></div>}</>;
 return collapse?<details className="day-group"><summary>{title} <span className="count">{rows.length}</span></summary>{content}</details>:<section className="day-group"><h2>{title} <span className="count">{rows.length}</span></h2>{content}</section>;
}
