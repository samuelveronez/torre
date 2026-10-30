import {useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
import {LabelChips} from './ui-kit/LabelChips';
import {Seg} from './ui-kit/Seg';
import {priorities,type Priority} from './priority';
import {dateKey} from './taskView';
import type {Label} from './features';
import {composePeople,type Task} from './task';
import {TaskPersonField} from './TaskPeopleEditor';

type Area=Task['area'];
export const durationOptions=[5,10,15,20,30,45,60,90,120,180,240];

export function ModalShell({title,description,onClose,children,footer,formId,onSubmit,hint}:{title:string;description:ReactNode;onClose:()=>void;children:ReactNode;footer:ReactNode;formId:string;onSubmit:(e:React.FormEvent<HTMLFormElement>)=>void;hint?:ReactNode}){
 return <Dialog open onOpenChange={value=>{if(!value)onClose();}}>
  <DialogContent showCloseButton={false} className="tc tc-modal" onOpenAutoFocus={e=>{e.preventDefault();(e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-autofocus]')?.focus();}}>
   <button type="button" className="btn btn-g tc-modal-x" onClick={onClose} aria-label="Fechar"><X size={16} aria-hidden="true"/></button>
   <div className="f">
    <DialogTitle className="tc-modal-title">{title}</DialogTitle>
    <DialogDescription className="desc">{description}</DialogDescription>
   </div>
   <form id={formId} className="tc-modal-body" onSubmit={onSubmit}>{children}</form>
   <div className="tc-modal-actions">
    <span className="desc" style={{flex:1,fontSize:12}}>{hint}</span>
    {footer}
   </div>
  </DialogContent>
 </Dialog>;
}

type NewTaskProps={labels:Label[];people:{id:string;name:string}[];ensurePerson:(name:string)=>Promise<{id:string;name:string}>;defaultArea:Area;defaultLabelIds:string[];message:string;onClose:()=>void;onCreate:(task:Task)=>Promise<boolean>};

export function NewTaskDialog({labels,people,ensurePerson,defaultArea,defaultLabelIds,message,onClose,onCreate}:NewTaskProps){
 const [personName,setPersonName]=useState('');
 const [area,setArea]=useState<Area>(defaultArea);
 const [labelIds,setLabelIds]=useState<string[]>(defaultLabelIds);
 const [situation,setSituation]=useState<'todo'|'waiting'>('todo');
 const [saving,setSaving]=useState(false);
 const chosen=labels.filter(l=>labelIds.includes(l.id)&&!l.archived);
 const hint=`Será criada em ${area}${chosen.length?`, com ${chosen.length===1?'a label':'as labels'} ${chosen.map(l=>l.name).join(', ')}`:''}.`;

 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  const data=new FormData(e.currentTarget);
  const waiting=situation==='waiting';
  setSaving(true);
  try{
   const name=personName.trim();
   const person=name?await ensurePerson(name):null;
   await onCreate({
    people:composePeople(person&&{name:person.name,personId:person.id},waiting,[]),
    id:crypto.randomUUID(),
    title:String(data.get('title')).trim(),
    area,
    minutes:Number(data.get('minutes')),
    due:String(data.get('due')||''),
    priority:String(data.get('priority')||'none') as Priority,
    labelIds:chosen.map(l=>l.id),
    description:String(data.get('description')||''),
    link:String(data.get('link')||'').trim(),
    situation,
    waitingFor:waiting&&person?person.name:'',
    followUp:waiting?String(data.get('followUp')):'',
    focusDate:data.get('focus')?dateKey(new Date()):'',
    source:'Torre',
    done:false,
   });
  }finally{setSaving(false);}
 };

 return <ModalShell title="Nova tarefa" description="Para guardar uma ideia sem organizar agora, use a captura rápida." onClose={onClose} formId="new-task-form" onSubmit={e=>void submit(e)} hint={hint}
  footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="new-task-form" className="btn btn-p" disabled={saving}>Criar tarefa</button></>}>
  <div className="f">
   <label className="lab" htmlFor="nt-title">Tarefa</label>
   <input id="nt-title" data-autofocus className="inp" name="title" required maxLength={180} autoFocus placeholder="O que precisa ser feito?"/>
  </div>
  <div className="f">
   <span className="lab">Área</span>
   <Seg label="Área" value={area} onChange={setArea} options={[{value:'Profissional',label:'Profissional'},{value:'Pessoal',label:'Pessoal'}]}/>
  </div>
  <div className="tc-grid3">
   <div className="f"><label className="lab" htmlFor="nt-due">Prazo</label><input id="nt-due" className="inp" name="due" type="date"/></div>
   <div className="f"><label className="lab" htmlFor="nt-min">Duração</label>
    <select id="nt-min" className="inp" name="minutes" defaultValue={30}>{durationOptions.map(m=><option key={m} value={m}>{m} min</option>)}</select>
   </div>
   <div className="f"><label className="lab" htmlFor="nt-prio">Prioridade</label>
    <select id="nt-prio" className="inp" name="priority" defaultValue="none">{priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>
   </div>
  </div>
  <div className="f"><span className="lab">Labels</span><LabelChips labels={labels} selected={labelIds} onChange={setLabelIds}/></div>
  <details className="tc-details">
   <summary>Mais detalhes</summary>
   <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:16}}>
    <div className="f"><label className="lab" htmlFor="nt-desc">Descrição</label><textarea id="nt-desc" className="inp" name="description" rows={3} placeholder="Contexto, critérios, links úteis…"/></div>
    <div className="f"><label className="lab" htmlFor="nt-link">Link de referência</label><input id="nt-link" className="inp" name="link" type="url" pattern="https?://.*" placeholder="https://"/></div>
    <div className="tc-grid2">
     <div className="f"><label className="lab" htmlFor="nt-sit">Situação</label>
      <select id="nt-sit" className="inp" value={situation} onChange={e=>setSituation(e.target.value as 'todo'|'waiting')}><option value="todo">A fazer</option><option value="waiting">Aguardando retorno</option></select>
     </div>
    </div>
    <TaskPersonField value={personName} onChange={setPersonName} people={people} required={situation==='waiting'} label={situation==='waiting'?'De quem depende':'Pessoa envolvida'}/>
    {situation==='waiting'&&<div className="f"><label className="lab" htmlFor="nt-follow">Acompanhar em</label><input id="nt-follow" className="inp" name="followUp" type="date" required/></div>}
    <label style={{display:'flex',alignItems:'center',gap:8}}><input className="cb" type="checkbox" name="focus"/>Marcar como foco do dia</label>
   </div>
  </details>
  {message&&<p className="desc" role="status">{message}</p>}
 </ModalShell>;
}

type ReserveProps={taskTitle:string;day:string;time:string;minDay:string;warning:string;staleCalendar:boolean;message:string;onDay:(value:string)=>void;onTime:(value:string)=>void;onClose:()=>void;onReserve:(day:string,time:string)=>void};

export function ReserveDialog({taskTitle,day,time,minDay,warning,staleCalendar,message,onDay,onTime,onClose,onReserve}:ReserveProps){
 return <ModalShell title="Reservar um horário" description={taskTitle} onClose={onClose} formId="reserve-form" onSubmit={e=>{e.preventDefault();onReserve(day,time);}}
  hint="Fora da jornada ou em horários ocupados, você recebe um aviso e pode reservar."
  footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="reserve-form" className="btn btn-p">Reservar horário</button></>}>
  <div className="tc-grid2">
   <div className="f"><label className="lab" htmlFor="rv-day">Dia</label><input id="rv-day" className="inp" name="day" type="date" required min={minDay} value={day} onChange={e=>onDay(e.target.value)}/></div>
   <div className="f"><label className="lab" htmlFor="rv-time">Horário</label><input id="rv-time" data-autofocus className="inp" name="time" type="time" required value={time} onChange={e=>onTime(e.target.value)}/></div>
  </div>
  {warning&&<p className="reservation-warning desc" role="status" style={{color:'var(--tc-warn)'}}>{warning}</p>}
  {staleCalendar&&<p className="reservation-warning desc" style={{color:'var(--tc-warn)'}}>A agenda pode ter compromissos ainda não sincronizados. A reserva manual continua disponível.</p>}
  {message&&<p className="desc" role="status">{message}</p>}
 </ModalShell>;
}
