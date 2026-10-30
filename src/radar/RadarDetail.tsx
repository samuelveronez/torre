import {useState} from 'react';
import {X} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Seg} from '@/ui-kit/Seg';
import {formatDue} from '@/ui-kit/format';
import {priorities,type Priority} from '@/priority';
import type {Task} from '@/task';
import type {useRadar} from './useRadar';
import {intervalOptions,linkedActions,reviewPending,temperatureNames,type Interval,type RadarTheme,type Temperature} from './radarModel';

export type NewAction={title:string;priority:Priority;due:string};
type Props={
 theme:RadarTheme;
 tasks:Task[];
 radar:ReturnType<typeof useRadar>;
 onClose:()=>void;
 onEditTask:(id:string)=>void;
 onCreateAction:(theme:Task,action:NewAction)=>Promise<boolean>;
 onEnd:()=>Promise<boolean>;
};

const temperatureOptions=(Object.keys(temperatureNames) as Temperature[]).map(value=>({value,label:temperatureNames[value]}));
const intervalChoices=intervalOptions.map(value=>({value:String(value),label:`${value} dias`}));
const actionState=(t:Task)=>t.done?'Concluída':t.situation==='waiting'?'Aguardando':'A fazer';

export function RadarDetail({theme,tasks,radar,onClose,onEditTask,onCreateAction,onEnd}:Props){
 const {task,record}=theme;
 const [notes,setNotes]=useState(record.notes);
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const [title,setTitle]=useState('');
 const [priority,setPriority]=useState<Priority>('none');
 const [due,setDue]=useState('');
 const [confirmEnd,setConfirmEnd]=useState(false);
 const [busy,setBusy]=useState(false);
 const dirty=notes!==record.notes;
 const actions=linkedActions(tasks,task.id);
 const pending=reviewPending(record,radar.today);

 function requestClose(){
  if(dirty&&!window.confirm('Há anotações não salvas. Fechar mesmo assim?'))return;
  onClose();
 }
 async function saveNotes(){
  setStatus('saving');
  setStatus(await radar.saveNotes(task.id,notes)?'saved':'error');
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
     <SheetTitle style={{margin:0,fontSize:16,fontWeight:600,lineHeight:1.3,color:'var(--foreground)'}}>{task.title}</SheetTitle>
     <SheetDescription className="desc">{(task.description??'').trim()||'Sem descrição.'}</SheetDescription>
    </div>
    <button type="button" className="btn btn-g btn-i" aria-label="Fechar tema" onClick={requestClose}><X size={16} aria-hidden="true"/></button>
   </div>
   <hr className="sep"/>
   <div className="tc-panel-body">
    <div className="f"><span className="lab">Temperatura</span>
     <Seg label="Temperatura" value={record.temperature} options={temperatureOptions} onChange={value=>void radar.setTemperature(task.id,value)}/>
    </div>
    <div className="f"><span className="lab">Revisar a cada</span>
     <Seg label="Periodicidade da revisão" value={String(record.intervalDays)} options={intervalChoices} onChange={value=>void radar.setInterval(task.id,Number(value) as Interval)}/>
     <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
      <span className="desc" style={{color:pending?'var(--tc-danger)':undefined}}>{pending?'Revisão pendente':`Próxima revisão em ${formatDue(record.nextReview)}`}</span>
      <button type="button" className="btn btn-sm" onClick={()=>void radar.review(task.id,record.intervalDays)}>Revisado</button>
     </div>
     {record.lastReviewedAt&&<span className="desc" style={{fontSize:12}}>Última revisão em {new Date(record.lastReviewedAt).toLocaleDateString('pt-BR')}</span>}
    </div>
    <div className="f">
     <label className="lab" htmlFor="radar-notes">Anotações e contexto atual</label>
     <textarea id="radar-notes" className="inp" rows={8} value={notes} onChange={e=>{setNotes(e.target.value);setStatus('idle');}}/>
     <div style={{display:'flex',alignItems:'center',gap:8}}>
      <button type="button" className="btn btn-p btn-sm" disabled={!dirty||status==='saving'} onClick={()=>void saveNotes()}>Salvar anotações</button>
      <span className="desc" role="status">{status==='saving'?'Salvando…':status==='saved'&&!dirty?'Anotações salvas.':status==='error'?'Não foi possível salvar. Tente novamente.':dirty?'● Alterações não salvas':''}</span>
     </div>
     <span className="desc" style={{fontSize:12}}>Salvar substitui o texto anterior; não há histórico.</span>
    </div>
    <hr className="sep"/>
    <div className="f"><span className="lab">Ações vinculadas</span>
     {!actions.length&&<span className="desc">Nenhuma ação criada para este tema.</span>}
     {actions.map(a=><button key={a.id} type="button" className="btn btn-g btn-sm" style={{justifyContent:'space-between',width:'100%'}} onClick={()=>onEditTask(a.id)}>
      <span style={{overflow:'hidden',textOverflow:'ellipsis',textDecoration:a.done?'line-through':undefined}}>{a.title}</span>
      <span className="desc">{actionState(a)} · {formatDue(a.due)}</span>
     </button>)}
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
    <button type="button" className="btn btn-sm" onClick={()=>onEditTask(task.id)}>Editar tema</button>
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
