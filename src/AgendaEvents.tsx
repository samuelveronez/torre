import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Calendar,CalendarEvent} from './features';
import type {Task} from './task';
import type {Placement} from './WeekPlanner';
import {intersects,layoutIntervals} from './agendaLayout';
import {slotAt} from './scheduling';
import {TriangleAlert} from 'lucide-react';

export const responseLabel=(status:CalendarEvent['response_status'])=>status?({accepted:'Aceito',tentative:'Talvez',needsAction:'Sem resposta',declined:'Recusado'}[status]):'';
const clock=(value:number)=>new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
export function dayBounds(date:Date){const from=new Date(date);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);const first=new Date(from);first.setHours(7);const last=new Date(from);last.setHours(22);return {from:from.getTime(),to:to.getTime(),first:first.getTime(),last:last.getTime()};}
export function eventsForDay(date:Date,events:CalendarEvent[],calendars:Calendar[],showDeclined=false){
 const {from,to}=dayBounds(date);
 return events.filter(e=>calendars.some(c=>c.id===e.calendar_id&&c.selected)&&(showDeclined||e.response_status!=='declined')&&Date.parse(e.start_at)<to&&Date.parse(e.end_at)>from);
}
type Props={date:Date;events:CalendarEvent[];calendars:Calendar[];tasks:Task[];showDeclined:boolean;onOpen:(id:string)=>void;preview?:Placement[];onReserveAt?:(minute:number)=>void};
export function agendaColumns(date:Date,events:CalendarEvent[],calendars:Calendar[],tasks:Task[],showDeclined:boolean,preview:Placement[]=[]){
 const {first,last}=dayBounds(date);
 const intervals=[...eventsForDay(date,events,calendars,showDeclined).filter(e=>!e.all_day).map(e=>({id:JSON.stringify(['google',e.calendar_id,e.id]),start:Date.parse(e.start_at),end:Date.parse(e.end_at)})),...tasks.filter(t=>!t.done&&t.at).map(t=>({id:'task:'+t.id,start:Date.parse(t.at!),end:Date.parse(t.at!)+t.minutes*60000})),...preview.map(p=>({id:'proposal:'+p.taskId,start:Date.parse(p.start),end:Date.parse(p.end)}))].filter(x=>x.start<last&&x.end>first).map(x=>({...x,start:Math.max(first,x.start),end:Math.min(last,x.end)}));
 return Math.max(1,...layoutIntervals(intervals).map(x=>x.columns));
}
type Item={id:string;start:number;end:number;title:string;event?:CalendarEvent;task?:Task;proposal?:Placement};
function EventDetails({event,calendar,onClose,overlap}:{event:CalendarEvent;calendar?:Calendar;onClose:()=>void;overlap?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="agenda-event-dialog" onCancel={onClose} onClose={onClose} aria-label="Compromisso Google"><div className="form-body"><h2>{event.title||'Ocupado'}</h2><p>{event.all_day?'Dia inteiro':`${clock(Date.parse(event.start_at))} – ${clock(Date.parse(event.end_at))}`}</p><p>{new Date(event.start_at).toLocaleDateString('pt-BR')} · {calendar?.name??'Google Agenda'}</p>{responseLabel(event.response_status)&&<p>Resposta: {responseLabel(event.response_status)}</p>}{event.location&&<p>{event.location}</p>}{overlap&&<p className="reservation-warning">{overlap}</p>}<p>{event.blocks_time?'Reserva tempo para as sugestões automáticas.':'Não bloqueia as sugestões automáticas.'}</p><p>Você pode reservar tarefas neste horário.</p><button autoFocus onClick={onClose}>Fechar</button></div></dialog>;
}
export function AllDayAgenda(props:Props){
 const [selected,setSelected]=useState<CalendarEvent|null>(null);
 const {first,last}=dayBounds(props.date);
 const rows=eventsForDay(props.date,props.events,props.calendars,props.showDeclined).filter(e=>e.all_day||Date.parse(e.end_at)<=first||Date.parse(e.start_at)>=last);
 return <div className="all-day-events">{rows.map(e=><button className={`response-${e.response_status??'unknown'}`} key={e.calendar_id+e.id} onClick={()=>setSelected(e)} style={{borderLeftColor:props.calendars.find(c=>c.id===e.calendar_id)?.color}}>{e.all_day?'Dia inteiro':`${clock(Date.parse(e.start_at))} – ${clock(Date.parse(e.end_at))}`} · {e.title}{responseLabel(e.response_status)&&<span> · {responseLabel(e.response_status)}</span>}</button>)}{selected&&<EventDetails key={selected.calendar_id+selected.id} event={selected} calendar={props.calendars.find(c=>c.id===selected.calendar_id)} onClose={()=>setSelected(null)}/>}</div>;
}
export function TimedAgenda(props:Props){
 const [selected,setSelected]=useState<CalendarEvent|null>(null),[selectedOverlap,setSelectedOverlap]=useState('');
 const {from,to,first,last}=dayBounds(props.date);
 const events=eventsForDay(props.date,props.events,props.calendars,props.showDeclined);
 const items:Item[]=[
  ...events.filter(e=>!e.all_day).map(e=>({id:JSON.stringify(['google',e.calendar_id,e.id]),start:Date.parse(e.start_at),end:Date.parse(e.end_at),title:e.title,event:e})),
  ...props.tasks.filter(t=>!t.done&&t.at&&Date.parse(t.at)<to&&Date.parse(t.at)+t.minutes*60000>from).map(t=>({id:'task:'+t.id,start:Date.parse(t.at!),end:Date.parse(t.at!)+t.minutes*60000,title:t.title,task:t})),
  ...(props.preview??[]).filter(p=>Date.parse(p.start)<to&&Date.parse(p.end)>from).map(p=>({id:'proposal:'+p.taskId,start:Date.parse(p.start),end:Date.parse(p.end),title:`Proposta · ${props.tasks.find(t=>t.id===p.taskId)?.title??'Tarefa'}`,proposal:p}))
 ];
 const visible=items.filter(x=>x.start<last&&x.end>first).map(x=>({...x,start:Math.max(first,x.start),end:Math.min(last,x.end)}));
 return <>{layoutIntervals(visible).map(item=>{
  const allDayOverlaps=events.filter(e=>e.all_day&&e.response_status!=='declined'&&e.blocks_time&&intersects(item,{start:Date.parse(e.start_at),end:Date.parse(e.end_at)}));
  const overlapping=items.filter(other=>item.overlaps.includes(other.id)&&other.event?.response_status!=='declined').map(x=>x.title).concat(allDayOverlaps.map(e=>e.title));
  const overlap=item.event?.response_status==='declined'?'':overlapping.length?`Sobreposição: ${Array.from(new Set(overlapping)).join(' · ')}`:'';
  const event=item.event,status=event?responseLabel(event.response_status):'';
  const originalStart=event?Date.parse(event.start_at):item.task?Date.parse(item.task.at!):Date.parse(item.proposal!.start);
  const originalEnd=event?Date.parse(event.end_at):item.task?originalStart+item.task.minutes*60000:Date.parse(item.proposal!.end);
  const label=`${item.title} · ${clock(originalStart)} – ${clock(originalEnd)}${status?' · '+status:''}${overlap?' · '+overlap:''}`;
  const style:CSSProperties={top:(item.start-first)/3600000*48,height:(item.end-item.start)/3600000*48,left:`calc(${item.column/item.columns*100}% + 2px)`,width:`calc(${100/item.columns}% - 4px)`,right:'auto',borderLeftColor:event?props.calendars.find(c=>c.id===event.calendar_id)?.color:undefined};
  const short=(item.end-item.start)/3600000*48<48;
  const content=<div className={`agenda-block-content${overlap?' has-overlap':''}`}><div className="agenda-clock-row"><span className="agenda-clock"><span>{clock(originalStart)}</span><span className="agenda-clock-separator"> – </span><span>{clock(originalEnd)}</span></span>{overlap&&<TriangleAlert className="agenda-overlap-icon" size={12} aria-hidden="true"/>}</div>{!short&&<><strong>{item.title}</strong>{status&&<small>{status}</small>}</>}</div>;
  return item.proposal?<div key={item.id} className={`timeline-event agenda-card proposed-event${short?' is-short':''}`} style={style} title={label} aria-label={label}>{content}</div>:<button key={item.id} className={`timeline-event agenda-card ${short?'is-short ':''}${event?'google-event response-'+(event.response_status??'unknown'):item.task?.area==='Pessoal'?'personal':'professional'}`} style={style} title={label} aria-label={props.onReserveAt?`Reservar sobre ${label}`:label} onClick={e=>{if(props.onReserveAt){const top=e.currentTarget.parentElement!.getBoundingClientRect().top;props.onReserveAt(e.detail?slotAt(e.clientY,top):420+Math.floor((item.start-first)/900000)*15);}else if(event){setSelectedOverlap(overlap);setSelected(event);}else props.onOpen(item.task!.id);}}>{content}</button>;
 })}{selected&&<EventDetails overlap={selectedOverlap} key={selected.calendar_id+selected.id} event={selected} calendar={props.calendars.find(c=>c.id===selected.calendar_id)} onClose={()=>setSelected(null)}/>}</>;
}
