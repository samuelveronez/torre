import {useState,type ReactNode} from 'react';
import {Target} from 'lucide-react';
import {TaskActionMenu} from '../TaskActionMenu';
import {writeTaskDrag} from '../taskDrag';
import {priorities} from '../priority';
import type {Features} from '../features';
import type {Task} from '../task';

const time=(iso:string)=>new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const dayDiff=(a:string,b:string)=>Math.round((Date.parse(a+'T12:00')-Date.parse(b+'T12:00'))/86400000);

function statusText(t:Task,day:string){
 if(t.situation==='waiting')return {text:`Depende de ${t.waitingFor||'—'}${t.followUp?` · acompanhar ${new Date(t.followUp+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`:''}`,color:undefined};
 if(t.at&&time(t.at)&&new Date(t.at).toDateString()===new Date(day+'T12:00').toDateString())return {text:`${t.reservationKind==='reminder'?'Lembrete':'Reservada'} ${time(t.at)}`,color:undefined};
 if(t.due&&t.due<day){const d=-dayDiff(t.due,day);return {text:d===1?'Venceu ontem':`Venceu há ${d} dias`,color:'var(--tc-danger)'};}
 if(t.due===day)return {text:'Hoje',color:undefined};
 return {text:'',color:undefined};
}

type RowProps={task:Task;features:Features;day:string;isNew?:boolean;onOpen:(id:string)=>void;onComplete:(id:string)=>void;onPlan?:(id:string)=>void;onFocus?:(id:string)=>void};

export function DayTaskRow({task:t,features,day,isNew,onOpen,onComplete,onPlan,onFocus}:RowProps){
 const labels=(t.labelIds??[]).map(id=>features.labels.find(l=>l.id===id)).filter(Boolean) as Features['labels'];
 const priority=t.priority&&t.priority!=='none'?priorities.find(p=>p.value===t.priority)?.label:'';
 const tone=t.priority==='high'?'b-r':t.priority==='medium'?'b-a':'';
 const status=statusText(t,day);
 const focused=t.focusDate===day;
 const start=(e:React.DragEvent)=>{
  writeTaskDrag(e.dataTransfer,[t.id]);
  const ghost=document.createElement('div');
  ghost.className='task-drag-ghost';
  ghost.textContent=`${t.title} · ${t.minutes} min`;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,12,12);
  setTimeout(()=>ghost.remove(),0);
 };
 return <article data-task-id={t.id} className="tc-task" data-new={isNew||undefined} style={t.situation==='waiting'?{opacity:.6}:undefined} draggable onDragStart={start} title="Arraste para um horário da agenda ou para uma label">
  <input className="cb" style={{marginTop:3}} type="checkbox" checked={t.done} disabled={t.done} aria-label={`Concluir ${t.title}`} onChange={()=>onComplete(t.id)}/>
  <div style={{flex:1,minWidth:0}}>
   <button className="trk-title" aria-label={`Editar ${t.title}`} onClick={()=>onOpen(t.id)}>{t.title}</button>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'4px 8px',marginTop:4,fontSize:12,color:'var(--muted-foreground)'}}>
    <span className="badge b-s"><span className="dot" style={{background:t.area==='Profissional'?'var(--primary)':'#8755ad'}}/>{t.area}</span>
    <span>{t.minutes} min</span>
    {priority&&<span className={'badge '+tone}>{priority}</span>}
    {labels.map(l=><span key={l.id} style={{display:'inline-flex',alignItems:'center',gap:4}}><span className="dot" style={{background:l.color}}/>{l.name}</span>)}
    {status.text&&<span style={{color:status.color}}>{status.text}</span>}
    {isNew&&<span className="badge b-b">Nova</span>}
    {t.completionPending&&<span>Conclusão pendente</span>}
    {t.syncError&&<span role="alert" style={{color:'var(--tc-danger)'}}>{t.syncError}</span>}
   </div>
  </div>
  <div style={{display:'flex',alignItems:'center',gap:2,flex:'0 0 auto'}}>
   {onFocus&&<button className="btn btn-g btn-sm" aria-pressed={focused} aria-label={`${focused?'Retirar do foco':'Escolher como foco'}: ${t.title}`} style={{color:focused?'var(--tc-chip-on)':'var(--muted-foreground)'}} onClick={()=>onFocus(t.id)}><Target size={14} aria-hidden="true"/><span className="tc-focus-label">{focused?'Em foco':'Foco'}</span></button>}
   <TaskActionMenu task={t} onOpen={onOpen} onPlan={onPlan}/>
  </div>
 </article>;
}

type GroupProps={title:string;rows:Task[];color?:string;renderRow:(task:Task)=>ReactNode};

export function DayGroup({title,rows,color,renderRow}:GroupProps){
 const [expanded,setExpanded]=useState(false);
 if(!rows.length)return null;
 const visible=expanded?rows:rows.slice(0,6);
 return <section aria-label={title}>
  <div className="gl" style={{color}}><span>{title}</span><span style={{color:'var(--muted-foreground)'}}>{rows.length}</span></div>
  {visible.map(renderRow)}
  {rows.length>6&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px 16px'}}>
   <span className="desc" style={{fontSize:12}}>Mostrando {visible.length} de {rows.length}</span>
   <button className="btn btn-sm" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Mostrar menos':`Ver todas (${rows.length})`}</button>
  </div>}
 </section>;
}
