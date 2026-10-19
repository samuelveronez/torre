import type {DragEvent,MutableRefObject} from 'react';
import {TaskActionMenu} from '@/TaskActionMenu';
import {writeTaskDrag} from '@/taskDrag';
import type {PlannerSelection} from '@/WeekPlanner';
import type {Task} from '@/task';

type Props={
 tasks:Task[];today:string;selection:PlannerSelection;
 limit:number;onLimit:(minutes:number)=>void;
 dragId:MutableRefObject<string>;onDragEnd:()=>void;
 onOpen:(id:string)=>void;onPlan:(id:string)=>void;onComplete:(id:string)=>void;onClearFilters:()=>void;
};
const rangeLabel=(minutes:number)=>{const h=Math.floor(minutes/60),m=minutes%60;return h?(m?`${h} h ${m} min`:`${h} h`):`${m} min`;};
const dueLabel=(due:string,today:string)=>{
 const date=new Date(due+'T12:00').toLocaleDateString('pt-BR');
 if(due<today)return `Atrasada · ${date}`;
 return due===today?`Hoje · ${date}`:`Prazo · ${date}`;
};
function startDrag(e:DragEvent,task:Task,dragId:MutableRefObject<string>){
 dragId.current=task.id;
 writeTaskDrag(e.dataTransfer,[task.id]);
 const ghost=document.createElement('div');
 ghost.className='task-drag-ghost';
 ghost.textContent=`${task.title} · ${task.minutes} min`;
 document.body.appendChild(ghost);
 e.dataTransfer.setDragImage(ghost,12,12);
 setTimeout(()=>ghost.remove(),0);
}
export function WeekUnscheduled(p:Props){
 const {selection}=p;
 return <section className="card" aria-label="Tarefas sem horário">
  <div className="ch"><h2>Tarefas sem horário</h2><span className="badge b-s">{p.tasks.length}</span></div>
  <div className="wk-pending">
   <div className="f"><label className="lab" htmlFor="wk-limit">Cabe em até</label><select id="wk-limit" className="inp" value={p.limit} onChange={e=>p.onLimit(Number(e.target.value))}><option value="0">Qualquer duração</option>{[15,30,45,60,90,120].map(n=><option value={n} key={n}>{n} minutos</option>)}</select></div>
   {p.tasks.length===0?<div className="wk-empty"><strong>Nenhuma pendência aqui</strong><span className="desc">Capture uma tarefa ou ajuste os filtros.</span><button type="button" className="btn btn-sm" onClick={p.onClearFilters}>Limpar filtros</button></div>:<>
    <p className="desc wk-count">{selection.selected.length} selecionada(s) · {rangeLabel(selection.minutes)} (máximo {selection.limit})</p>
    {p.tasks.map(t=><article key={t.id} className="wk-task" draggable onDragStart={e=>startDrag(e,t,p.dragId)} onDragEnd={p.onDragEnd}>
     <input className="cb" type="checkbox" aria-label={`Selecionar ${t.title} para a IA`} checked={selection.selected.includes(t.id)} disabled={selection.busy||(selection.selected.length>=selection.limit&&!selection.selected.includes(t.id))} onChange={e=>selection.toggle(t.id,e.target.checked)}/>
     <div className="wk-task-main">
      <button type="button" className="wk-task-title" onClick={()=>p.onOpen(t.id)}>{t.title}</button>
      <span className="desc wk-task-meta">{t.area}{t.due&&<span className={t.due<=p.today?'urgent':''}> · {dueLabel(t.due,p.today)}</span>}</span>
     </div>
     <span className="desc wk-task-min">{t.minutes} min</span>
     <TaskActionMenu task={t} onOpen={p.onOpen} onPlan={p.onPlan} onComplete={p.onComplete}/>
    </article>)}
   </>}
  </div>
 </section>;
}
