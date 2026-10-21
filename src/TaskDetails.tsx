import {useEffect,useRef,useState} from 'react';
import {X,ExternalLink,MoreHorizontal} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from './components/ui/sheet';
import {TaskPersonField} from './TaskPeopleEditor';
import {AttachmentList} from './FeatureUI';
import {LabelChips} from './ui-kit/LabelChips';
import {Seg} from './ui-kit/Seg';
import {Sw} from './ui-kit/Sw';
import {priorities,type Priority} from './priority';
import {durationOptions} from './TaskDialogs';
import {dateKey} from './taskView';
import {type Task,safeLink,primaryPerson,composePeople} from './task';
import type {Features} from './features';

type Props={features:Features;task:Task;onClose:()=>void;onSave:(task:Task)=>Promise<boolean>;onComplete:(id:string)=>void;onReopen:(id:string)=>void;onPlan:(id:string)=>void;onUnplan:(id:string)=>void};
type Area=Task['area'];

export function TaskDetails({features,task,onClose,onSave,onComplete,onReopen,onPlan,onUnplan}:Props){
 const initial=primaryPerson(task);
 const others=initial.others;
 const [personName,setPersonName]=useState(initial.primary?.name??'');
 const [labelIds,setLabelIds]=useState(task.labelIds??[]);
 const [area,setArea]=useState<Area>(task.area);
 const [situation,setSituation]=useState(task.situation||'todo');
 const [link,setLink]=useState(task.link||'');
 const [focusDate,setFocusDate]=useState(task.focusDate||'');
 const [saved,setSaved]=useState(false),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 const [confirmDiscard,setConfirmDiscard]=useState(false);
 const panel=useRef<HTMLDivElement>(null);
 const [actionsOpen,setActionsOpen]=useState(false);
 const createdText=task.createdAt?new Date(task.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'';
 const dirtyRef=useRef(false);
 dirtyRef.current=dirty;

 const requestClose=()=>{if(saving)return;if(dirty)setConfirmDiscard(true);else onClose();};
 const touch=()=>{setSaved(false);setDirty(true);};
 const waiting=situation==='waiting';
 const durations=durationOptions.includes(task.minutes)?durationOptions:[...durationOptions,task.minutes].sort((a,b)=>a-b);

 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  panel.current?.querySelector<HTMLElement>('#td-title')?.focus({preventScroll:true});
  const unload=(e:BeforeUnloadEvent)=>{if(dirtyRef.current){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('beforeunload',unload);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);

 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  const data=new FormData(e.currentTarget);
  const title=String(data.get('title')).trim();
  if(!title)return;
  setSaving(true);
  setError('');
  try{
   const name=personName.trim();
   const person=name?await features.ensurePerson(name):null;
   const ok=await onSave({
    ...task,
    people:composePeople(person&&{name:person.name,personId:person.id},waiting,others),
    labelIds,
    title,
    priority:String(data.get('priority')||'none') as Priority,
    area,
    minutes:Number(data.get('minutes')),
    due:String(data.get('due')||''),
    description:String(data.get('description')||''),
    link:link.trim(),
    situation,
    waitingFor:waiting&&person?person.name:'',
    followUp:waiting?String(data.get('followUp')):'',
    at:task.at,
    focusDate,
   });
   if(ok){setSaved(true);setDirty(false);}
   else setError('Não foi possível salvar. Verifique o aviso e tente novamente.');
  }catch{setError('Não foi possível salvar. Tente novamente.');}
  finally{setSaving(false);}
 };

 return <Sheet open onOpenChange={value=>{if(!value)requestClose();}}>
  <SheetContent showCloseButton={false} ref={panel} className="tc tc-panel task-details" onOpenAutoFocus={e=>{e.preventDefault();panel.current?.querySelector<HTMLElement>('#td-title')?.focus({preventScroll:true});}} onPointerDownOutside={e=>{e.preventDefault();requestClose();}} onEscapeKeyDown={e=>{e.preventDefault();requestClose();}}>
   <div className="tc-panel-head">
    <div className="f">
     <SheetTitle style={{margin:0,fontSize:16,fontWeight:600,lineHeight:1,color:'var(--foreground)'}}>Editar tarefa</SheetTitle>
     <SheetDescription className="desc">{createdText?`Criada em ${createdText} · `:''}origem {task.source}.</SheetDescription>
    </div>
    <button className="btn btn-g btn-i" aria-label="Fechar detalhes" onClick={requestClose}><X size={16} aria-hidden="true"/></button>
   </div>
   <hr className="sep"/>
   <form id="task-editor" className="tc-panel-body" onChange={touch} onSubmit={e=>void submit(e)}>
    <div className="f"><label className="lab" htmlFor="td-title">Tarefa</label><input id="td-title" className="inp" name="title" required maxLength={180} defaultValue={task.title}/></div>
    <div className="f"><label className="lab" htmlFor="td-desc">Descrição</label><textarea id="td-desc" className="inp" name="description" rows={3} defaultValue={task.description||''} placeholder="Contexto, instruções ou próximos passos"/></div>
    <div className="f">
     <label className="lab" htmlFor="td-link">Link de referência</label>
     <input id="td-link" className="inp" name="link" type="url" pattern="https?://.*" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://"/>
     {safeLink(link)&&<a className="reference-link" href={safeLink(link)} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'var(--primary)'}}><ExternalLink size={14} aria-hidden="true"/>Abrir referência</a>}
    </div>
    <div className="f"><span className="lab">Área</span><Seg label="Área" value={area} onChange={value=>{setArea(value);touch();}} options={[{value:'Profissional',label:'Profissional'},{value:'Pessoal',label:'Pessoal'}]}/></div>
    <div className="f"><span className="lab">Labels</span><LabelChips labels={features.labels} selected={labelIds} onChange={value=>{setLabelIds(value);touch();}}/></div>
    <hr className="sep"/>
    <div className="tc-grid2">
     <div className="f"><label className="lab" htmlFor="td-due">Prazo</label><input id="td-due" className="inp" name="due" type="date" defaultValue={task.due}/></div>
     <div className="f"><label className="lab" htmlFor="td-min">Duração</label><select id="td-min" className="inp" name="minutes" defaultValue={task.minutes}>{durations.map(m=><option key={m} value={m}>{m} min</option>)}</select></div>
     <div className="f"><label className="lab" htmlFor="td-prio">Prioridade</label><select id="td-prio" className="inp" name="priority" defaultValue={task.priority??'none'}>{priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
     <div className="f"><label className="lab" htmlFor="td-sit">Situação</label><select id="td-sit" className="inp" value={situation} disabled={task.done} onChange={e=>{setSituation(e.target.value as 'todo'|'waiting');touch();}}><option value="todo">A fazer</option><option value="waiting">Aguardando retorno</option></select></div>
    </div>
    <div className="tc-card" style={{display:'flex',alignItems:'center',gap:12,padding:12}}>
     <div style={{flex:1}}>
      <div className="lab">Foco do dia</div>
      <p className="desc" style={{marginTop:6}}>Destaca esta tarefa em Meu dia, mesmo sem horário.{focusDate&&` Em foco em ${new Date(focusDate+'T12:00:00').toLocaleDateString('pt-BR')}.`}</p>
     </div>
     <Sw checked={!!focusDate} label="Foco do dia" onChange={on=>{setFocusDate(on?(focusDate||dateKey(new Date())):'');touch();}}/>
    </div>
    <hr className="sep"/>
    <TaskPersonField value={personName} onChange={value=>{setPersonName(value);touch();}} people={features.people} required={waiting} label={waiting?'De quem depende':'Pessoa envolvida'} extras={others.length}/>
    <div className="f"><label className="lab" htmlFor="td-follow">Acompanhar em</label><input id="td-follow" className="inp" name="followUp" type="date" disabled={!waiting} required={waiting} defaultValue={task.followUp||''}/></div>
    {waiting&&<p className="desc">Você poderá manter o horário como lembrete sem ocupar disponibilidade, ou retirar a reserva.</p>}
    {task.captureId&&<AttachmentList features={features} items={features.attachments.filter(a=>a.capture_id===task.captureId)}/>}
    {task.googleTaskId&&<p className="desc">Importada do Google. Alterações e conclusão ficam somente na Torre.</p>}
   </form>
   <hr className="sep"/>
   <div className="tc-panel-foot">
    <div style={{position:'relative'}}>
     <button type="button" className="btn btn-g btn-sm" aria-haspopup="menu" aria-expanded={actionsOpen} onClick={()=>setActionsOpen(!actionsOpen)}><MoreHorizontal size={16} aria-hidden="true"/>Mais ações</button>
     {actionsOpen&&<div className="tc-menu" role="menu" style={{left:0,right:'auto',top:'auto',bottom:36}}>
      {task.done
       ? <button role="menuitem" onClick={()=>{setActionsOpen(false);onReopen(task.id);}}>Reabrir tarefa</button>
       : <>
          <button role="menuitem" onClick={()=>{setActionsOpen(false);onComplete(task.id);}}>Concluir tarefa</button>
          {task.situation!=='waiting'&&<button role="menuitem" onClick={()=>{setActionsOpen(false);onPlan(task.id);}}>{task.at?'Reagendar':'Reservar horário'}</button>}
          {task.at&&<button role="menuitem" onClick={()=>{setActionsOpen(false);onUnplan(task.id);}}>Retirar da agenda</button>}
         </>}
     </div>}
    </div>
    <span style={{flex:1,fontSize:12,color:'var(--tc-warn)'}} role="status">{dirty?'● Alterações não salvas':saved?<span style={{color:'var(--muted-foreground)'}}>Alterações salvas.</span>:''}</span>
    <button type="button" className="btn" disabled={saving} onClick={requestClose}>Cancelar</button>
    <button type="submit" form="task-editor" className="btn btn-p" disabled={saving}>{saving?'Salvando…':'Salvar alterações'}</button>
    {error&&<p className="desc" role="alert" style={{flexBasis:'100%',color:'var(--tc-danger)'}}>{error}</p>}
   </div>
   <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
    <DialogContent showCloseButton={false} className="tc tc-modal tc-modal-sm discard-confirmation" onPointerDownOutside={e=>e.preventDefault()}>
     <div className="f">
      <DialogTitle className="tc-modal-title">Descartar alterações?</DialogTitle>
      <DialogDescription className="desc">Há alterações não salvas nesta tarefa. Você pode continuar editando ou fechar sem salvar.</DialogDescription>
     </div>
     <div className="tc-modal-actions">
      <button className="btn" onClick={()=>setConfirmDiscard(false)}>Continuar editando</button>
      <button className="btn btn-p" onClick={()=>{setConfirmDiscard(false);onClose();}}>Descartar alterações</button>
     </div>
    </DialogContent>
   </Dialog>
  </SheetContent>
 </Sheet>;
}
