import {supabase} from './supabase';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {TriangleAlert} from 'lucide-react';
import type {Task} from './task';
import {invoke,type Features} from './features';
export type Placement={taskId:string;start:string;end:string;reason:string};
type Proposal={id:string;placements:Placement[];unplaced:string[];expires_at:string};
export type PlannerSelection={selected:string[];toggle:(id:string,on:boolean)=>void;busy:boolean;minutes:number;limit:number;open:boolean};
const MAX_TASKS=20;
const localInput=(value:string)=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const hoursLeft=(value:string)=>{const hours=Math.floor((Date.parse(value)-Date.now())/3600000);return hours>=1?`expira em ${hours} h`:'expira em breve';};
const rangeLabel=(minutes:number)=>{const h=Math.floor(minutes/60),m=minutes%60;return h?(m?`${h} h ${m} min`:`${h} h`):`${m} min`;};
const whenLabel=(value:string)=>{const d=new Date(value);const day=d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');return `${day[0].toUpperCase()+day.slice(1)}, ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} · ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;};
export type PlannerSheet={phone:boolean;open:boolean;onOpen:()=>void;onClose:()=>void};
type Props={sheet?:PlannerSheet;autoOpenKey?:number;proposalId?:string;tasks:Task[];week:Date;features:Features;onPreview:(rows:Placement[])=>void;onApplied:()=>void;children:(selection:PlannerSelection)=>ReactNode};
/** Right column of the weekly agenda: the AI proposal panel above the list of tasks without a slot. */
export function WeekPlanner({tasks,week,features,onPreview,onApplied,autoOpenKey=0,proposalId,sheet,children}:Props){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string[]>([]),[accepted,setAccepted]=useState<string[]>([]),[instruction,setInstruction]=useState(''),[proposal,setProposal]=useState<Proposal|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState('');const revision=useRef(0);
 const sheetOpen=!!sheet?.phone&&sheet.open,closeSheet=sheet?.onClose;
 useEffect(()=>{if(!sheetOpen)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')closeSheet?.();};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[sheetOpen]);
 const eligible=tasks.filter(t=>!t.done&&!t.at&&t.situation!=='waiting');
 const eligibleKey=eligible.map(t=>t.id).sort().join(',');
 useEffect(()=>{if(!autoOpenKey)return;setOpen(true);sheet?.onOpen();setSelected(current=>current.length?current:eligible.slice(0,MAX_TASKS).map(t=>t.id));},[autoOpenKey]);
 const key=week.toISOString();
 useEffect(()=>{revision.current++;setProposal(null);setSelected([]);setAccepted([]);onPreview([]);setBusy(false);},[key]);
 useEffect(()=>()=>{revision.current++;},[]);
 useEffect(()=>{if(!proposalId)return;let cancelled=false;setError('');void supabase.from('torre_week_proposals').select('id,placements,task_ids,expires_at,applied_at').eq('id',proposalId).single().then(({data,error})=>{if(cancelled)return;if(error||!data){setError('Não foi possível carregar a proposta.');setOpen(true);sheet?.onOpen();return;}if(data.applied_at){setError('Esta proposta já foi aplicada.');setOpen(true);sheet?.onOpen();return;}const p:Proposal={...data,unplaced:data.task_ids.filter((id:string)=>!data.placements.some((row:Placement)=>row.taskId===id))};setProposal(p);setAccepted(p.placements.map(row=>row.taskId));setSelected(data.task_ids);onPreview(p.placements);setOpen(true);sheet?.onOpen();});return()=>{cancelled=true;};},[proposalId,key]);
 useEffect(()=>{const ids=new Set(eligibleKey.split(','));setSelected(current=>current.filter(id=>ids.has(id)));},[eligibleKey]);
 const selectedMinutes=eligible.filter(t=>selected.includes(t.id)).reduce((sum,t)=>sum+t.minutes,0);
 async function suggest(){setBusy(true);setError('');const rev=revision.current;try{const end=new Date(week);end.setDate(end.getDate()+7);const data:Proposal=await invoke('plan-propose',{taskIds:selected,start:week.toISOString(),end:end.toISOString(),instruction});if(rev!==revision.current)return;setProposal(data);setAccepted(data.placements.map(p=>p.taskId));onPreview(data.placements);}catch(e){if(rev===revision.current)setError((e as Error).message);}finally{if(rev===revision.current)setBusy(false);}}
 async function apply(){if(!proposal)return;setBusy(true);setError('');try{await invoke('plan-apply',{proposalId:proposal.id,taskIds:accepted,placements:proposal.placements});setProposal(null);onPreview([]);setOpen(false);await features.load();onApplied();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function change(rows:Placement[],ids=accepted){if(!proposal)return;setProposal({...proposal,placements:rows});onPreview(rows.filter(p=>ids.includes(p.taskId)));}
 function close(){if(busy)return;setEditing('');setOpen(false);revision.current++;setProposal(null);onPreview([]);}
 function toggle(id:string,on:boolean){setSelected(ids=>on?(ids.length>=MAX_TASKS||ids.includes(id)?ids:[...ids,id]):ids.filter(x=>x!==id));}
 const placedMinutes=proposal?proposal.placements.filter(p=>accepted.includes(p.taskId)).reduce((sum,p)=>sum+Math.round((Date.parse(p.end)-Date.parse(p.start))/60000),0):0;
 const unplacedTasks=proposal?proposal.unplaced.map(id=>tasks.find(t=>t.id===id)).filter((t):t is Task=>!!t):[];
 const panels=<div className="wk-side">
  {open&&<section className="card" aria-label="Proposta da IA">
   <div className="ch"><h2>Proposta da IA</h2>{proposal?<span className="desc" style={{fontSize:12}}>{hoursLeft(proposal.expires_at)}</span>:<button type="button" className="btn btn-g btn-sm" disabled={busy} onClick={close}>Fechar</button>}</div>
   <div className="wk-body">
    {!proposal?<>
     <p className="desc">A IA sugere uma ordem. Os horários respeitam duração, jornada e disponibilidade. Nada é reservado antes de aplicar.</p>
     <p className="desc"><strong>{selected.length} tarefa(s)</strong> · {rangeLabel(selectedMinutes)} selecionados. Marque as tarefas na lista abaixo.</p>
     <div className="f"><label className="lab" htmlFor="wk-instruction">Orientação opcional</label><input id="wk-instruction" className="inp" maxLength={1000} value={instruction} disabled={busy} onChange={e=>setInstruction(e.target.value)} placeholder="Ex.: priorize as tarefas com prazo próximo"/></div>
     {!features.ai?.enabled&&<p className="desc">Ative a IA nas configurações.</p>}
     <button type="button" className="btn btn-p" disabled={busy||!selected.length||!features.ai?.enabled} onClick={()=>void suggest()}>{busy?'Preparando proposta…':`Sugerir horários (${selected.length}/${MAX_TASKS})`}</button>
    </>:<>
     <p className="desc"><strong style={{color:'var(--foreground)'}}>{proposal.placements.length} de {proposal.placements.length+proposal.unplaced.length} tarefas</strong> posicionadas · {rangeLabel(placedMinutes)}. Nada é reservado antes de aplicar.</p>
     <div>{proposal.placements.map(p=>{const task=tasks.find(t=>t.id===p.taskId);return <div className="wk-proposal-row" key={p.taskId}>
      <input className="cb" type="checkbox" aria-label={`Aplicar ${task?.title??'tarefa'}`} disabled={busy} checked={accepted.includes(p.taskId)} onChange={e=>{const ids=e.target.checked?[...accepted,p.taskId]:accepted.filter(id=>id!==p.taskId);setAccepted(ids);onPreview(proposal.placements.filter(row=>ids.includes(row.taskId)));}}/>
      <div className="wk-proposal-title">{task?.title}</div>
      <div/>
      <div className="wk-proposal-when">{whenLabel(p.start)}<button type="button" className="btn btn-g btn-sm wk-proposal-edit" disabled={busy} aria-expanded={editing===p.taskId} onClick={()=>setEditing(editing===p.taskId?'':p.taskId)}>{editing===p.taskId?'Pronto':'Alterar horário'}</button></div>
      {editing===p.taskId?<><div/>
      <input className="inp wk-proposal-input" disabled={busy} type="datetime-local" step={900} aria-label={`Horário proposto para ${task?.title}`} value={localInput(p.start)} onChange={e=>{const at=new Date(e.target.value);if(!Number.isFinite(at.getTime()))return;change(proposal.placements.map(row=>row.taskId===p.taskId?{...row,start:at.toISOString(),end:new Date(at.getTime()+(task?.minutes??30)*60000).toISOString()}:row));}}/></>:null}
      <div/>
      <div className="desc" style={{fontSize:12}}>{p.reason}</div>
     </div>;})}</div>
     {unplacedTasks.length>0&&<div role="status" className="wk-warning"><TriangleAlert size={14} aria-hidden="true"/><span><strong>Não coube:</strong> {unplacedTasks.map(t=>`${t.title} (${t.minutes} min)`).join(', ')}.</span></div>}
     <div className="f"><label className="lab" htmlFor="wk-instruction">Ajustar com uma instrução</label><input id="wk-instruction" className="inp" maxLength={1000} value={instruction} disabled={busy} onChange={e=>setInstruction(e.target.value)} placeholder="Ex.: evitar reuniões às sextas"/></div>
     <div className="wk-actions"><button type="button" className="btn" style={{flex:'1 1 0'}} disabled={busy||!selected.length} onClick={()=>void suggest()}>Gerar de novo</button><button type="button" className="btn btn-p" style={{flex:'2 1 0'}} disabled={busy||!accepted.length} onClick={()=>void apply()}>{busy?'Aplicando…':`Aplicar ${accepted.length} reserva${accepted.length===1?'':'s'}`}</button></div>
     <button type="button" className="btn btn-g btn-sm" disabled={busy} onClick={()=>{setProposal(null);onPreview([]);}}>Descartar proposta</button>
    </>}
    {error&&<p role="alert" className="desc" style={{color:'var(--tc-danger)'}}>{error}</p>}
   </div>
  </section>}
  {children({selected,toggle,busy,minutes:selectedMinutes,limit:MAX_TASKS,open})}
 </div>;
 if(!sheet?.phone)return panels;
 return <>
  {sheet.open&&<button type="button" tabIndex={-1} className="wk-sheet-scrim" aria-label="Fechar painel da semana" onClick={sheet.onClose}/>}
  <div className={'wk-sheet'+(sheet.open?' open':'')} role="dialog" aria-modal={sheet.open} aria-label="Planejar a semana" inert={!sheet.open}>
   <div className="wk-sheet-head"><span className="wk-sheet-grip" aria-hidden="true"/><button type="button" className="btn btn-g btn-sm" onClick={sheet.onClose}>Fechar</button></div>
   {panels}
  </div>
 </>;
}
