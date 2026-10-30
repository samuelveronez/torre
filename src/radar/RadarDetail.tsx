import {useState} from 'react';
import {X} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {formatDue} from '@/ui-kit/format';
import {priorities,type Priority} from '@/priority';
import {primaryPerson,type Task} from '@/task';
import type {useRadar} from './useRadar';
import {ThemeForm} from './ThemeForm';
import {draftChanged,draftError,draftFromTheme,linkableTasks,linkedActions,nextReviewDate,reviewPending,type RadarTheme,type ThemeDraft} from './radarModel';

export type NewAction={title:string;priority:Priority;due:string};
type Props={
 theme:RadarTheme;
 tasks:Task[];
 radar:ReturnType<typeof useRadar>;
 onClose:()=>void;
 onEditTask:(id:string)=>void;
 people:{id:string;name:string}[];
 onSaveTask:(taskId:string,fields:Pick<ThemeDraft,'title'|'description'|'area'|'personName'>)=>Promise<boolean>;
 onCreateAction:(theme:Task,action:NewAction)=>Promise<boolean>;
 onEnd:()=>Promise<boolean>;
 radarId?:string;
 onRefresh:()=>Promise<void>;
};

const actionState=(t:Task)=>t.done?'Concluída':t.situation==='waiting'?'Aguardando':'A fazer';

export function RadarDetail({theme,tasks,radar,people,radarId,onRefresh,onClose,onEditTask,onSaveTask,onCreateAction,onEnd}:Props){
 const {task,record}=theme;
 const saved=draftFromTheme(theme);
 const [draft,setDraft]=useState<ThemeDraft>(saved);
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const [problem,setProblem]=useState('');
 const [title,setTitle]=useState('');
 const [priority,setPriority]=useState<Priority>('none');
 const [due,setDue]=useState('');
 const [confirmEnd,setConfirmEnd]=useState(false);
 const [busy,setBusy]=useState(false);
 const [linking,setLinking]=useState(false);
 const [search,setSearch]=useState('');
 const [linkMessage,setLinkMessage]=useState('');
 const dirty=draftChanged(draft,saved);
 const actions=linkedActions(tasks,task.id);
 const linkable=linking?linkableTasks(tasks,task.id,radarId,search):[];
 const pending=reviewPending(record,radar.today);
 const extraPeople=primaryPerson(task).others.length;

 function requestClose(){
  if(dirty&&!window.confirm('Há alterações não salvas. Fechar mesmo assim?'))return;
  onClose();
 }
 async function save(){
  const invalid=draftError(draft);
  if(invalid){setProblem(invalid);return;}
  setProblem('');
  setDraft(current=>({...current,title:current.title.trim(),description:current.description.trim()}));
  setStatus('saving');
  const taskChanged=(['title','description','area','personName'] as const).some(key=>draft[key]!==saved[key]);
  const radarChanged=(['temperature','intervalDays','nextReview','notes'] as const).some(key=>draft[key]!==saved[key]);
  const taskOk=!taskChanged||await onSaveTask(task.id,{title:draft.title.trim(),description:draft.description.trim(),area:draft.area,personName:draft.personName});
  const radarOk=taskOk&&(!radarChanged||await radar.saveSettings(task.id,draft));
  setStatus(taskOk&&radarOk?'saved':'error');
 }
 async function confirmReview(){
  if(await radar.review(task.id,record.intervalDays))setDraft(current=>({...current,nextReview:nextReviewDate(new Date(),record.intervalDays)}));
 }
 async function link(taskId:string,themeId:string|null){
  setBusy(true);
  try{
   const ok=await radar.linkTask(taskId,themeId,onRefresh);
   setLinkMessage(ok?(themeId?'Tarefa vinculada ao tema.':'Tarefa desvinculada.'):'Não foi possível alterar o vínculo. Tente novamente.');
   if(ok){setSearch('');setLinking(false);}
  }finally{setBusy(false);}
 }
 async function addAction(e:React.FormEvent){
  e.preventDefault();
  if(!title.trim()||busy)return;
  setBusy(true);
  try{
   if(await onCreateAction(task,{title:title.trim(),priority,due})){setTitle('');setPriority('none');setDue('');}
  }finally{setBusy(false);}
 }
 async function end(){
  setBusy(true);
  try{await onEnd();}finally{setBusy(false);}
 }

 return <Sheet open onOpenChange={value=>{if(!value)requestClose();}}>
  <SheetContent showCloseButton={false} className="tc tc-panel" onEscapeKeyDown={e=>{e.preventDefault();requestClose();}} onPointerDownOutside={e=>{e.preventDefault();requestClose();}}>
   <div className="tc-panel-head">
    <div className="f">
     <SheetTitle style={{margin:0,fontSize:16,fontWeight:600,lineHeight:1.3,color:'var(--foreground)'}}>Editar tema</SheetTitle>
     <SheetDescription className="desc">{task.title}</SheetDescription>
    </div>
    <button type="button" className="btn btn-g btn-i" aria-label="Fechar tema" onClick={requestClose}><X size={16} aria-hidden="true"/></button>
   </div>
   <hr className="sep"/>
   <div className="tc-panel-body">
    <ThemeForm draft={draft} onChange={value=>{setDraft(value);setStatus('idle');setProblem('');}} people={people} extraPeople={extraPeople}/>
    <div className="f">
     <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
      <span className="desc" style={{color:pending?'var(--tc-danger)':undefined}}>{pending?'Revisão pendente':`Próxima revisão em ${formatDue(record.nextReview)}`}</span>
      <button type="button" className="btn btn-sm" disabled={dirty} title={dirty?'Salve as alterações antes de marcar como revisado':undefined} onClick={()=>void confirmReview()}>Revisado</button>
     </div>
     {record.lastReviewedAt&&<span className="desc" style={{fontSize:12}}>Última revisão em {new Date(record.lastReviewedAt).toLocaleDateString('pt-BR')}</span>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
     <button type="button" className="btn btn-p btn-sm" disabled={!dirty||status==='saving'} onClick={()=>void save()}>Salvar</button>
     <span className="desc" role="status" style={{color:problem||status==='error'?'var(--tc-danger)':undefined}}>{problem||(status==='saving'?'Salvando…':status==='saved'&&!dirty?'Tema salvo.':status==='error'?'Não foi possível salvar. Tente novamente.':dirty?'● Alterações não salvas':'')}</span>
    </div>
    <hr className="sep"/>
    <div className="f"><span className="lab">Ações vinculadas</span>
     {!actions.length&&<span className="desc">Nenhuma ação criada para este tema.</span>}
     {actions.map(a=><div key={a.id} style={{display:'flex',alignItems:'center',gap:4}}>
      <button type="button" className="btn btn-g btn-sm" style={{justifyContent:'space-between',flex:1,minWidth:0}} onClick={()=>onEditTask(a.id)}>
       <span style={{overflow:'hidden',textOverflow:'ellipsis',textDecoration:a.done?'line-through':undefined}}>{a.title}</span>
       <span className="desc">{actionState(a)} · {formatDue(a.due)}</span>
      </button>
      <button type="button" className="btn btn-g btn-i" aria-label={`Desvincular ${a.title}`} title="Desvincular" disabled={busy} onClick={()=>void link(a.id,null)}><X size={14} aria-hidden="true"/></button>
     </div>)}
     {!linking&&<button type="button" className="btn btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>{setLinking(true);setLinkMessage('');}}>Vincular tarefa existente</button>}
     {linking&&<div className="f" role="group" aria-label="Vincular tarefa existente">
      <input className="inp" type="search" aria-label="Buscar tarefa para vincular" placeholder="Buscar tarefa pelo título" autoFocus value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:'flex',flexDirection:'column',gap:2,maxHeight:220,overflowY:'auto'}}>
       {linkable.slice(0,30).map(t=>{const other=t.radarTaskId?tasks.find(x=>x.id===t.radarTaskId):undefined;return <button key={t.id} type="button" className="btn btn-g btn-sm" style={{justifyContent:'space-between',width:'100%'}} disabled={busy} onClick={()=>void link(t.id,task.id)}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</span>
        <span className="desc">{other?`Move de “${other.title}”`:formatDue(t.due)}</span>
       </button>;})}
       {!linkable.length&&<span className="desc">Nenhuma tarefa aberta encontrada.</span>}
       {linkable.length>30&&<span className="desc" style={{fontSize:12}}>Mostrando 30 de {linkable.length}; refine a busca.</span>}
      </div>
      <button type="button" className="btn btn-g btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>{setLinking(false);setSearch('');}}>Cancelar</button>
     </div>}
     {linkMessage&&<span className="desc" role="status" style={{fontSize:12}}>{linkMessage}</span>}
    </div>
    <form className="f" onSubmit={e=>void addAction(e)} aria-label="Criar tarefa vinculada">
     <label className="lab" htmlFor="radar-action-title">Criar tarefa vinculada</label>
     <input id="radar-action-title" className="inp" placeholder="O que precisa ser feito?" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/>
     <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
      <select className="inp" style={{width:'auto'}} aria-label="Prioridade da tarefa" value={priority} onChange={e=>setPriority(e.target.value as Priority)}>
       {priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <input className="inp" style={{width:'auto'}} type="date" aria-label="Vencimento da tarefa" value={due} onChange={e=>setDue(e.target.value)}/>
      <button type="submit" className="btn btn-sm" disabled={!title.trim()||busy}>Criar tarefa</button>
     </div>
     <span className="desc" style={{fontSize:12}}>A tarefa aparece em Tarefas e no planejamento; o tema continua no Radar.</span>
    </form>
   </div>
   <hr className="sep"/>
   <div className="tc-panel-foot">
    <button type="button" className="btn btn-sm" onClick={()=>onEditTask(task.id)}>Abrir como tarefa</button>
    <span style={{flex:1}}/>
    {!confirmEnd&&<button type="button" className="btn btn-d btn-sm" onClick={()=>setConfirmEnd(true)}>Encerrar tema</button>}
    {confirmEnd&&<>
     <span className="desc">Arquivar este tema? Notas e ações são preservadas.</span>
     <button type="button" className="btn btn-sm" onClick={()=>setConfirmEnd(false)}>Cancelar</button>
     <button type="button" className="btn btn-d btn-sm" disabled={busy} onClick={()=>void end()}>Encerrar</button>
    </>}
   </div>
  </SheetContent>
 </Sheet>;
}
