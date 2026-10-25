import type {Hours} from './useCloudData';
import {useAgendaRange} from './AgendaRange';
import {hiddenReservationCount} from './reservationVisibility';
import {HiddenReservations} from './components/Experience';
import {priorityRank} from './priority';
import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,CalendarDays,Plus,Clock,RefreshCw} from 'lucide-react';
import type {Features} from './features';
import type {Task} from './task';
import {DayGroup,DayTaskRow} from './home/DayTasks';
import {SummaryCards} from './home/SummaryCards';
import {dateKey,dayGroups,newest} from './taskView';
import {slotAt,reservationWarning,workHoursWarning} from './scheduling';
import {AllDayAgenda,TimedAgenda,eventsForDay} from './AgendaEvents';

type Props={filters?:React.ReactNode;hours?:Hours[];onFocus?:(id:string,date:string)=>Promise<boolean>;allTasks:Task[];onClearFilters:()=>void;showDeclined:boolean;onShowDeclined:(value:boolean)=>void;date:Date;onDate:(d:Date)=>void;tasks:Task[];features:Features;newIds:string[];onOpen:(id:string)=>void;onComplete:(id:string)=>void;onPlan:(id:string)=>void;onPlace:(id:string,day:string,time:string)=>Promise<boolean|undefined>;onCapture:()=>void;onWeek:(suggest:boolean)=>void};
const clock=(value:number)=>new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const capitalize=(text:string)=>text.charAt(0).toUpperCase()+text.slice(1);

export default function Home({filters,hours,onFocus,allTasks,onClearFilters,showDeclined,onShowDeclined,date,onDate,tasks,features,newIds,onOpen,onComplete,onPlan,onPlace,onWeek}:Props){
 const range=useAgendaRange();
 const [focusOrder,setFocusOrder]=useState('current');
 const [choosing,setChoosing]=useState(false),[planning,setPlanning]=useState(''),[tab,setTab]=useState('tasks'),[now,setNow]=useState(new Date()),[drag,setDrag]=useState<number|null>(null),[dragId,setDragId]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{setPlanning('');setDrag(null);},[dateKey(date)]);
 const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const day=dateKey(date);
 const groups=dayGroups(tasks,date);
 const plannedTasks=Array.from(new Map([...groups.today,...groups.late,...groups.follow].map(t=>[t.id,t])).values());
 const taskCount=plannedTasks.length;
 const eligible=tasks.filter(t=>!t.done&&!t.at&&t.situation!=='waiting').sort(newest);
 const events=eventsForDay(date,features.events,features.calendars,showDeclined).sort((a,b)=>Number(b.all_day)-Number(a.all_day)||Date.parse(a.start_at)-Date.parse(b.start_at));
 const stale=features.google?.connected&&!features.fresh;
 const agendaProps={date,events:features.events,calendars:features.calendars,tasks,showDeclined,onOpen};
 const dragTask=tasks.find(t=>t.id===(dragId||planning));const dragAt=new Date(day+'T'+`${String(Math.floor((drag??range.start*60)/60)).padStart(2,'0')}:${String((drag??range.start*60)%60).padStart(2,'0')}`);
 const warning=dragTask?reservationWarning(dragTask,dragAt,allTasks,events.map(e=>({start:Date.parse(e.start_at)>=start.getTime()?new Date(e.start_at).getHours()+new Date(e.start_at).getMinutes()/60:0,end:Date.parse(e.end_at)>=end.getTime()?24:new Date(e.end_at).getHours()+new Date(e.end_at).getMinutes()/60,blocks:e.blocks_time,title:e.title}))):'';
 const move=(n:number)=>{const d=new Date(date);d.setDate(d.getDate()+n);onDate(d);};
 const place=async(id:string,minute:number)=>{if(id&&tasks.some(t=>t.id===id&&!t.done&&t.situation!=='waiting')){const saved=await onPlace(id,day,`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`);if(saved)setPlanning('');setDrag(null);setDragId('');}};

 const focusRows=groups.today.filter(t=>t.focusDate===day);
 const todayRows=groups.today.filter(t=>t.focusDate!==day);
 const nextEvent=events.find(e=>!e.all_day&&Date.parse(e.start_at)>now.getTime());
 const row=(t:Task)=><DayTaskRow key={t.id} task={t} features={features} day={day} isNew={newIds.includes(t.id)} onOpen={onOpen} onComplete={onComplete} onPlan={onPlan} onFocus={onFocus?()=>{void onFocus(t.id,t.focusDate===day?'':day);}:undefined}/>;
 const ordered=(rows:Task[])=>focusOrder==='priority'?[...rows].sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)):rows;
 const freshText=features.google?.connected?(features.fresh?'● Agenda atualizada':'● Agenda desatualizada'):'Reservas locais';

 return <div className="tc tc-day" style={{width:'100%',display:'flex',flexDirection:'column',gap:20}}>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:12}}>
   <div>
    <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Meu dia</h1>
    <p className="desc" style={{marginTop:4,fontSize:14}}>{capitalize(date.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))}</p>
   </div>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
    <button className="btn btn-i" aria-label="Dia anterior" style={{width:36}} onClick={()=>move(-1)}><ChevronLeft size={16} aria-hidden="true"/></button>
    <button className="btn" onClick={()=>onDate(new Date())}>Hoje</button>
    <button className="btn btn-i" aria-label="Próximo dia" style={{width:36}} onClick={()=>move(1)}><ChevronRight size={16} aria-hidden="true"/></button>
    <label className="btn btn-i tc-date" title="Escolher data" style={{width:36}}>
     <CalendarDays size={16} aria-hidden="true"/>
     <input aria-label="Data de Meu dia" type="date" value={day} onInput={e=>{if(e.currentTarget.value)onDate(new Date(e.currentTarget.value+'T12:00'));}} onChange={()=>undefined}/>
    </label>
    <button className="btn" style={{marginLeft:4}} onClick={()=>onWeek(false)}><CalendarDays size={16} aria-hidden="true"/>Planejar semana</button>
    <button className="btn" onClick={()=>onWeek(true)}><Clock size={16} aria-hidden="true"/>Sugerir horários</button>
   </div>
  </div>
  {filters}
  <HiddenReservations count={hiddenReservationCount(allTasks,tasks,[date])} onClear={onClearFilters}/>
  <SummaryCards planned={taskCount} plannedMinutes={plannedTasks.reduce((sum,t)=>sum+t.minutes,0)} late={groups.late.length} focusCount={focusRows.length} focusTitle={focusRows[0]?.title??''} events={events.length} nextEvent={nextEvent?`Próximo às ${clock(Date.parse(nextEvent.start_at))}`:events.length?'Sem próximos hoje':'Nenhum compromisso'}/>
  <div className="tabs tc-daytabs" role="tablist" aria-label="Visão de Meu dia">
   <button role="tab" aria-selected={tab==='tasks'} onClick={()=>setTab('tasks')}>Tarefas</button>
   <button role="tab" aria-selected={tab==='agenda'} onClick={()=>setTab('agenda')}>Agenda</button>
  </div>
  <div className={`home-layout tc-day-layout show-${tab}`} style={{display:'flex',flexWrap:'wrap',gap:20,alignItems:'flex-start'}}>
   <section className="tc-card-s tc-day-tasks" aria-label="Tarefas do dia" style={{flex:'999 1 520px',minWidth:0}} onDragStartCapture={e=>setDragId((e.target as HTMLElement).closest<HTMLElement>('[data-task-id]')?.dataset.taskId??'')} onDragEnd={()=>{setDragId('');setDrag(null);}}>
    <div className="ch">
     <h2>Tarefas do dia <span className="badge b-s" style={{marginLeft:6}}>{taskCount}</span></h2>
     <div style={{display:'flex',alignItems:'center',gap:8}}>
      <label htmlFor="day-order" className="desc">Ordem</label>
      <select id="day-order" className="inp" style={{width:120,height:32,fontSize:13}} value={focusOrder} onChange={e=>setFocusOrder(e.target.value)}><option value="current">Atual</option><option value="priority">Prioridade</option></select>
      <button className="btn btn-sm" aria-expanded={choosing} onClick={()=>setChoosing(!choosing)}><Plus size={14} aria-hidden="true"/>Escolher tarefas</button>
     </div>
    </div>
    {choosing&&<section className="day-choice" aria-label="Escolher foco ou reservar" style={{borderBottom:'1px solid var(--border)',background:'var(--tc-th)',paddingBottom:8}}>
     <div className="gl"><span>Escolher foco ou reservar</span><span style={{color:'var(--muted-foreground)'}}>{eligible.length}</span></div>
     <p className="desc" style={{padding:'0 16px 4px',fontSize:12}}>Escolha como foco sem horário, ou reserve um horário. Os filtros atuais se aplicam.</p>
     {eligible.map(t=><div key={t.id} className={planning===t.id?'chosen-task':''} style={planning===t.id?{outline:'2px solid var(--primary)',outlineOffset:-2}:undefined}>
      <DayTaskRow task={t} features={features} day={day} onOpen={onOpen} onComplete={onComplete} onFocus={onFocus?()=>{void onFocus(t.id,t.focusDate===day?'':day);}:undefined} onPlan={id=>{setPlanning(id);setTab('agenda');}}/>
     </div>)}
     {!eligible.length&&<p className="desc" style={{padding:'8px 16px'}}>Nenhuma pendência com estes filtros.</p>}
    </section>}
    <DayGroup key={day+'foco'} title="Foco do dia" color="var(--tc-chip-on)" rows={ordered(focusRows)} renderRow={row}/>
    <DayGroup key={day+'late'} title="Atrasadas" color="var(--tc-danger)" rows={ordered(groups.late)} renderRow={row}/>
    <DayGroup key={day+'today'} title="Hoje" rows={ordered(todayRows)} renderRow={row}/>
    <DayGroup key={day+'follow'} title="Aguardando retorno" color="var(--muted-foreground)" rows={ordered(groups.follow)} renderRow={row}/>
    {!taskCount&&<p className="desc" style={{padding:'24px 16px',textAlign:'center'}}>Nada planejado por aqui.</p>}
    <div style={{height:8}}/>
   </section>
   <aside className="tc-card-s tc-day-agenda" aria-label="Agenda do dia" style={{flex:'1 1 380px',maxWidth:460,minWidth:0}}>
    <div className="ch">
     <div>
      <h2>Agenda</h2>
      <span style={{fontSize:12,color:features.google?.connected&&features.fresh?'#15803d':'var(--muted-foreground)'}}>{freshText}</span>
     </div>
     <button className="btn btn-sm" disabled={features.working} onClick={()=>void features.sync()}><RefreshCw size={14} aria-hidden="true" className={features.working?'animate-spin':undefined}/>Sincronizar</button>
    </div>
    <div style={{padding:'12px 16px 16px'}}>
     {stale&&<p role="status" className="desc" style={{color:'var(--tc-warn)',marginBottom:8}}>A agenda pode ter compromissos ainda não sincronizados. Você pode reservar manualmente.</p>}
     {planning&&<p className="desc" style={{marginBottom:8}}>Escolha um horário para {tasks.find(t=>t.id===planning)?.title}. <button className="btn btn-g btn-sm" onClick={()=>onPlan(planning)}>Usar formulário</button> <button className="btn btn-g btn-sm" onClick={()=>setPlanning('')}>Cancelar</button></p>}
     <label style={{display:'flex',flexDirection:'row',alignItems:'center',gap:8,fontSize:13,color:'var(--muted-foreground)',marginBottom:12}}><input className="cb" type="checkbox" checked={showDeclined} onChange={e=>onShowDeclined(e.target.checked)}/>Mostrar recusados</label>
     <AllDayAgenda {...agendaProps}/>
     <div className="daily-time-scroll"><div className="daily-time-axis">{Array.from({length:range.end-range.start+1},(_,i)=><span key={i} style={{top:i*48}}>{String(i+range.start).padStart(2,'0')}:00</span>)}</div><div className="daily-time-body" style={{height:(range.end-range.start)*48}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDrag(slotAt(e.clientY,e.currentTarget.getBoundingClientRect().top,range));const box=e.currentTarget.parentElement?.getBoundingClientRect();if(box&&e.clientY>box.bottom-40)e.currentTarget.parentElement!.scrollTop+=12;if(box&&e.clientY<box.top+40)e.currentTarget.parentElement!.scrollTop-=12;}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDrag(null);}} onDrop={e=>{e.preventDefault();place(e.dataTransfer.getData('text/plain'),slotAt(e.clientY,e.currentTarget.getBoundingClientRect().top,range));}}>
      {Array.from({length:(range.end-range.start)*4},(_,i)=><button className="day-quarter" key={i} aria-label={`Reservar em ${day} às ${String(Math.floor((range.start*60+i*15)/60)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`} disabled={!planning} onClick={()=>place(planning,range.start*60+i*15)}/>)}
      <TimedAgenda {...agendaProps} onReserveAt={planning?minute=>void place(planning,minute):undefined}/>
      {drag!==null&&<div className="daily-drop-preview" style={{top:(drag-range.start*60)/60*48}}>Soltar às {Math.floor(drag/60)}:{String(drag%60).padStart(2,'0')}{(warning||hours&&dragTask&&workHoursWarning(dragTask,dragAt,hours))&&<small>{[warning,hours&&dragTask?workHoursWarning(dragTask,dragAt,hours):''].filter(Boolean).join(' ')}</small>}</div>}
      {dateKey(now)===day&&now.getHours()>=range.start&&now.getHours()<range.end&&<div className="current-time" style={{top:(now.getHours()+now.getMinutes()/60-range.start)*48}}><span>{clock(now.getTime())}</span></div>}
     </div></div>
     <p className="desc day-help" style={{marginTop:12,fontSize:12}}>Arraste uma tarefa para um horário. Clique em uma reserva para editar. Reservas avisam sobre jornada e sobreposição; lembretes não ocupam disponibilidade.</p>
    </div>
   </aside>
  </div>
 </div>;
}
