import type {DragEvent,MutableRefObject} from 'react';
import {CalendarScroll} from '@/CalendarScroll';
import {AllDayAgenda,TimedAgenda,agendaColumns} from '@/AgendaEvents';
import {slotAt,reservationError,reservationWarning,workHoursWarning} from '@/scheduling';
import {dayLoad,loadLabel,type WorkHours} from '@/dayLoad';
import type {AgendaRange} from '@/AgendaRange';
import type {Features} from '@/features';
import type {Placement} from '@/WeekPlanner';
import type {Task} from '@/task';

export type DragState={id:string;day:string;minute:number}|null;
type Block={start:number;end:number;blocks:boolean;title?:string};
type Props={
 dates:Date[];focus:string;onFocus:(day:string)=>void;today:string;
 features:Features;tasks:Task[];active:Task[];preview:Placement[];
 showDeclined:boolean;onShowDeclined:(value:boolean)=>void;
 agendaRange:AgendaRange;hours:WorkHours[];
 drag:DragState;onDrag:(drag:DragState)=>void;dragId:MutableRefObject<string>;
 busyBlocks:(date:Date)=>Block[];
 onPlan:(id:string,day:string,time:string)=>void;selected:string;onMessage:(text:string)=>void;
 onOpen:(id:string)=>void;
};
const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const clock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const HOUR=48;

export function WeekGrid(p:Props){
 const {agendaRange:range}=p;
 const height=(range.end-range.start)*HOUR;
 const columns=p.dates.map(d=>{
  const overlap=agendaColumns(d,p.features.events,p.features.calendars,p.active,p.showDeclined,p.preview,range);
  return `minmax(${overlap>1?overlap*64:0}px,1fr)`;
 }).join(' ');
 function onDragOver(e:DragEvent<HTMLDivElement>,d:Date){
  if(!p.dragId.current)return;
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  const top=e.currentTarget.getBoundingClientRect().top;
  p.onDrag({id:p.dragId.current,day:dateKey(d),minute:slotAt(e.clientY,top,range)});
  const scroll=e.currentTarget.closest('.calendar-scroll');
  if(!scroll)return;
  const box=scroll.getBoundingClientRect();
  if(e.clientX<box.left+35)scroll.scrollLeft-=15;
  if(e.clientX>box.right-35)scroll.scrollLeft+=15;
  if(e.clientY>box.bottom-35)scroll.scrollTop+=16;
  if(e.clientY<box.top+60)scroll.scrollTop-=16;
 }
 function onDrop(e:DragEvent<HTMLDivElement>,d:Date){
  e.preventDefault();
  const minute=slotAt(e.clientY,e.currentTarget.getBoundingClientRect().top,range);
  const id=e.dataTransfer.getData('text/plain');
  if(id&&p.dragId.current===id)p.onPlan(id,dateKey(d),clock(minute));
  p.onDrag(null);
  p.dragId.current='';
 }
 function dragPreview(d:Date){
  const drag=p.drag;
  if(!drag||drag.day!==dateKey(d))return null;
  const task=p.tasks.find(t=>t.id===drag.id);
  if(!task)return null;
  const at=new Date(`${drag.day}T${clock(drag.minute)}`);
  const blocks=p.busyBlocks(d);
  const error=reservationError(task,at,p.hours,p.tasks,blocks,Date.now(),range);
  const warning=[reservationWarning(task,at,p.tasks,blocks),workHoursWarning(task,at,p.hours)].filter(Boolean).join(' ');
  return <div className={'drag-preview '+(error?'invalid':'')} style={{top:(drag.minute-range.start*60)/60*HOUR,height:Math.max(24,task.minutes/60*HOUR)}}><b>{Math.floor(drag.minute/60)}:{String(drag.minute%60).padStart(2,'0')} · {task.minutes} min</b><small>{error||warning||task.title}</small></div>;
 }
 return <section className="card wk-card" aria-label="Semana">
  <div className="wk-bar">
   <label className="wk-declined"><input className="cb" type="checkbox" checked={p.showDeclined} onChange={e=>p.onShowDeclined(e.target.checked)}/>Mostrar recusados</label>
   <small className="desc">{p.features.google?.connected?(p.features.fresh?'Agenda atualizada':'Agenda desatualizada'):'Reservas de tarefas'}</small>
   <button type="button" className="btn btn-sm" disabled={p.features.working} onClick={()=>void p.features.sync()}>Atualizar agenda</button>
  </div>
  <CalendarScroll>
   <div className={'grid wk-grid '+(p.focus?'focused':'')} style={{gridTemplateColumns:`52px ${columns}`}}>
    <div className="time-head">Hora</div>
    {p.dates.map(d=>{
     const load=dayLoad(d,p.hours,p.active);
     return <button type="button" className={'day-head '+(dateKey(d)===p.today?'current ':'')+(load.capacity?'':'off')} key={dateKey(d)} aria-label={`${days[d.getDay()]} ${d.getDate()}, ${loadLabel(load)}`} aria-pressed={!!p.focus&&p.focus===dateKey(d)} onClick={()=>p.onFocus(p.focus?'':dateKey(d))}>
      <span className="wk-day"><span className="wk-dow">{days[d.getDay()]}</span><b>{d.getDate()}</b></span>
      <span className="wk-load" aria-hidden="true"><span style={{width:`${Math.round(load.ratio*100)}%`}}/></span>
      <span className="wk-load-label" aria-hidden="true">{loadLabel(load)}</span>
     </button>;
    })}
    <div className="all-day-axis">Dia inteiro</div>
    {p.dates.map(d=><AllDayAgenda key={dateKey(d)} date={d} events={p.features.events} calendars={p.features.calendars} tasks={p.active} showDeclined={p.showDeclined} onOpen={p.onOpen}/>)}
    <div className="time-axis" style={{height}}>{Array.from({length:range.end-range.start},(_,i)=><span key={i} style={{top:i*HOUR}}>{String(i+range.start).padStart(2,'0')}:00</span>)}</div>
    {p.dates.map(d=>{
     const off=!dayLoad(d,p.hours,[]).capacity;
     return <div className={'day-column '+(off?'off':'')} style={{height}} key={dateKey(d)} onDragOver={e=>onDragOver(e,d)} onDrop={e=>onDrop(e,d)}>
      {Array.from({length:range.end-range.start},(_,i)=><button type="button" key={i} className="slot" aria-label={`Planejar em ${dateKey(d)} às ${i+range.start} horas`} onClick={()=>{if(p.selected)p.onPlan(p.selected,dateKey(d),`${String(i+range.start).padStart(2,'0')}:00`);else p.onMessage('Use Planejar na tarefa ou arraste para um horário.');}}/>)}
      {dragPreview(d)}
      <TimedAgenda date={d} events={p.features.events} calendars={p.features.calendars} tasks={p.active} preview={p.preview} showDeclined={p.showDeclined} onOpen={p.onOpen}/>
     </div>;
    })}
   </div>
  </CalendarScroll>
  <div className="wk-legend">
   <span><i className="wk-key"/>Compromisso</span>
   <span><i className="wk-key dashed"/>Sugestão da IA (não reservada)</span>
   <small className="desc">Arraste uma tarefa ou use Planejar. Clique no dia para focar.</small>
  </div>
 </section>;
}
