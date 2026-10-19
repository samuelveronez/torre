import {useEffect,useState} from 'react';
import {Plus} from 'lucide-react';
import {priorities,priorityRank} from './priority';
import type {Features} from './features';
import type {Task} from './task';
import {TaskActionMenu} from './TaskActionMenu';
import {dateKey,matchesTask,newest} from './taskView';
import {BulkActions,type BatchChange} from './BulkActions';
import {writeTaskDrag} from './taskDrag';
import {usePreference} from './uiState';
import {formatDue} from './ui-kit/format';
import {ActiveFilters} from './ui-kit/ActiveFilters';

type Props={
 onBatch:(ids:string[],change:BatchChange)=>Promise<boolean>;
 onClassify:(ids:string[])=>Promise<boolean>;
 userId:string;
 features:Features;
 tasks:Task[];
 area:string;
 query:string;
 labelFilter:string[];
 newIds:string[];
 recentKey:number;
 onOpen:(id:string)=>void;
 onClearFilters:()=>void;
 onRemoveArea:()=>void;
 onRemoveQuery:()=>void;
 onRemoveLabel:(id:string)=>void;
 onComplete:(id:string)=>void;
 onReopen:(id:string)=>void;
 onNew:()=>void;
 onPlan:(id:string)=>void;
};
type Tab='open'|'waiting'|'done';
type Situation='all'|'todo'|'waiting';

const sorts=['Mais recentes','Mais antigas','Prazo','Acompanhamento','Duração','Nome','Prioridade'];
const tabNames:Record<Tab,string>={open:'Abertas',waiting:'Aguardando',done:'Concluídas'};
const dayMs=86400000;

function dayDiff(due:string,today:string){return Math.round((Date.parse(due+'T12:00')-Date.parse(today+'T12:00'))/dayMs);}

function groupOf(task:Task,today:string){
 if(!task.due)return 'none';
 const diff=dayDiff(task.due,today);
 return diff<0?'late':diff===0?'today':diff===1?'tomorrow':'later';
}
const groupNames:Record<string,string>={late:'Atrasadas',today:'Hoje',tomorrow:'Amanhã',later:'Depois',none:'Sem data'};
const groupColors:Record<string,string>={late:'var(--tc-danger)',today:'#15803d'};
const groupOrder=['late','today','tomorrow','later','none'];

function dueText(task:Task,today:string){
 if(!task.due)return task.at?`Reserva · ${new Date(task.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'—';
 const diff=dayDiff(task.due,today);
 const base=!task.done&&diff<0?(diff===-1?'Ontem':`Há ${-diff} dias`):formatDue(task.due);
 const time=task.at&&dateKey(new Date(task.at))===task.due?` · ${new Date(task.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'';
 return base+time;
}

export function TaskList(props:Props){
 const {onBatch,onClassify,userId,features,tasks,area,query,labelFilter,newIds,recentKey,onOpen,onClearFilters,onRemoveArea,onRemoveQuery,onRemoveLabel,onComplete,onReopen,onNew,onPlan}=props;
 const [priorityFilter,setPriorityFilter]=useState('all');
 const [tab,setTab]=useState<Tab>('open');
 const [situation,setSituation]=useState<Situation>('all');
 const [sort,setSort]=usePreference(userId,'task-sort-v2','Prazo');
 useEffect(()=>{if(recentKey){setSort('Mais recentes');setTab('open');setSituation('all');}},[recentKey]);
 const [selecting,setSelecting]=useState(false),[selection,setSelection]=useState<string[]>([]);
 const toggle=(id:string)=>setSelection(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);
 const today=dateKey(new Date());

 const matching=tasks.filter(t=>matchesTask(t,area,query));
 const open=matching.filter(t=>!t.done),waiting=open.filter(t=>t.situation==='waiting'),done=matching.filter(t=>t.done);
 const late=open.filter(t=>t.due&&dayDiff(t.due,today)<0);
 const counts:Record<Tab,number>={open:open.length,waiting:waiting.length,done:done.length};

 const inTab=(t:Task)=>tab==='done'?t.done:tab==='waiting'?!t.done&&t.situation==='waiting':!t.done&&(situation==='all'||(situation==='todo'?t.situation!=='waiting':t.situation==='waiting'));
 const bySort=(a:Task,b:Task)=>sort==='Prioridade'?priorityRank(a.priority)-priorityRank(b.priority)||newest(a,b):sort==='Mais recentes'?newest(a,b):sort==='Mais antigas'?-newest(a,b):sort==='Duração'?a.minutes-b.minutes:sort==='Nome'?a.title.localeCompare(b.title,'pt-BR'):sort==='Acompanhamento'?(a.followUp||'9999').localeCompare(b.followUp||'9999'):(a.due||'9999').localeCompare(b.due||'9999')||newest(a,b);
 const filtered=matching.filter(t=>priorityFilter==='all'||(t.priority??'none')===priorityFilter).filter(inTab).sort(bySort);
 const visibleIds=filtered.map(t=>t.id);
 const ids=selection.filter(id=>visibleIds.includes(id));
 const selectedTasks=filtered.filter(t=>ids.includes(t.id));
 const grouped=tab==='open'&&sort==='Prazo';
 const groups=grouped?groupOrder.map(key=>({key,items:filtered.filter(t=>groupOf(t,today)===key)})).filter(g=>g.items.length):[{key:'',items:filtered}];
 const clear=()=>{onClearFilters();setTab('open');setSituation('all');setPriorityFilter('all');};

 const subtitle=`${open.length} abertas · ${late.length} atrasadas · ${waiting.length} aguardando retorno`;

 return <section className="task-list tc" style={{maxWidth:1240,width:'100%',display:'flex',flexDirection:'column',gap:16}}>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:12}}>
   <div>
    <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Tarefas</h1>
    <p className="desc" style={{marginTop:4,fontSize:14}}>{subtitle}</p>
   </div>
   <div style={{display:'flex',gap:8}}>
    <button className="btn" aria-pressed={selecting} onClick={()=>{setSelecting(!selecting);setSelection([]);}}>{selecting?'Sair da seleção':'Selecionar'}</button>
    <button className="btn btn-p" onClick={onNew}><Plus size={16} aria-hidden="true"/>Nova tarefa</button>
   </div>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <div className="tabs" role="tablist" aria-label="Situação das tarefas">
    {(Object.keys(tabNames) as Tab[]).map(key=><button key={key} role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}>{tabNames[key]}<span style={{marginLeft:4,fontSize:12,color:'var(--muted-foreground)'}}>{counts[key]}</span></button>)}
   </div>
   <span className="tc-spacer" style={{flex:1}}/>
   <select className="inp tc-fsel" style={{width:160}} aria-label="Prioridade" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}>
    <option value="all">Prioridade: todas</option>
    {priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
   </select>
   <select className="inp tc-fsel" style={{width:160}} aria-label="Situação" disabled={tab!=='open'} value={situation} onChange={e=>setSituation(e.target.value as Situation)}>
    <option value="all">Situação: todas</option>
    <option value="todo">A fazer</option>
    <option value="waiting">Aguardando</option>
   </select>
   <select className="inp tc-fsel" style={{width:170}} aria-label="Ordenar por" value={sort} onChange={e=>setSort(e.target.value)}>
    {sorts.map(s=><option key={s} value={s}>Ordenar: {s.toLowerCase()}</option>)}
   </select>
  </div>
  <ActiveFilters area={area} query={query} labelFilter={labelFilter} labels={features.labels} extra={priorityFilter!=='all'?[{label:`Prioridade: ${priorities.find(p=>p.value===priorityFilter)?.label}`,onRemove:()=>setPriorityFilter('all')}]:[]} onRemoveArea={onRemoveArea} onRemoveQuery={onRemoveQuery} onRemoveLabel={onRemoveLabel} onClear={clear}/>
  <BulkActions tasks={selectedTasks} features={features} onClear={()=>setSelection([])} onApply={change=>onBatch(ids,change)} onClassify={()=>onClassify(ids)}/>
  <section className="tbl" aria-label="Lista de tarefas">
   <div className="thk">
    {selecting
     ? <input className="cb" type="checkbox" aria-label="Selecionar todas as tarefas visíveis" checked={!!filtered.length&&ids.length===filtered.length} onChange={()=>setSelection(ids.length===filtered.length?[]:visibleIds)}/>
     : <span style={{width:16}}/>}
    <span style={{flex:1}}>Tarefa</span>
    <span className="thk-col" style={{width:110}}>Prazo</span>
    <span className="thk-col" style={{width:100}}>Prioridade</span>
    <span className="thk-col" style={{width:64,textAlign:'right'}}>Duração</span>
    <span style={{width:32}}/>
   </div>
   <div onDragStart={e=>{const id=e.dataTransfer.getData('text/plain');if(ids.includes(id))writeTaskDrag(e.dataTransfer,ids);}}>
    {groups.map(group=><div key={group.key}>
     {grouped&&<div className="grk" style={{color:groupColors[group.key]}}>{groupNames[group.key]}<span style={{fontWeight:500,color:'var(--muted-foreground)',marginLeft:4}}>{group.items.length}</span></div>}
     {group.items.map(t=><TaskTableRow key={t.id} task={t} features={features} today={today} isNew={newIds.includes(t.id)} selecting={selecting} selected={ids.includes(t.id)} onToggle={toggle} onOpen={onOpen} onComplete={onComplete} onReopen={onReopen} onPlan={onPlan}/>)}
    </div>)}
   </div>
   {!filtered.length&&<div className="list-empty" style={{padding:'40px 16px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
    <h3 style={{margin:0,fontSize:16,fontWeight:600}}>Nenhuma tarefa nesta visão</h3>
    <p className="desc">Verifique os filtros ou capture uma tarefa.</p>
    <button className="btn btn-sm" onClick={clear}>Limpar filtros</button>
   </div>}
  </section>
 </section>;
}

type RowProps={task:Task;features:Features;today:string;isNew:boolean;selecting:boolean;selected:boolean;onToggle:(id:string)=>void;onOpen:(id:string)=>void;onComplete:(id:string)=>void;onReopen:(id:string)=>void;onPlan:(id:string)=>void};

function TaskTableRow({task:t,features,today,isNew,selecting,selected,onToggle,onOpen,onComplete,onReopen,onPlan}:RowProps){
 const labels=(t.labelIds??[]).map(id=>features.labels.find(l=>l.id===id)).filter(Boolean) as Features['labels'];
 const overdue=!t.done&&!!t.due&&dayDiff(t.due,today)<0;
 const priority=t.priority&&t.priority!=='none'?priorities.find(p=>p.value===t.priority)?.label:'';
 const priorityTone=t.priority==='high'?'b-r':t.priority==='medium'?'b-a':'';
 const due=dueText(t,today);
 const startDrag=(e:React.DragEvent)=>{
  writeTaskDrag(e.dataTransfer,[t.id]);
  const ghost=document.createElement('div');
  ghost.className='task-drag-ghost';
  ghost.textContent=`${t.title} · ${t.minutes} min`;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,12,12);
  setTimeout(()=>ghost.remove(),0);
 };
 return <article data-task-id={t.id} data-selected={selected} data-new={isNew} className={'trk'+(t.done?' is-done':'')} draggable onDragStart={startDrag} title="Arraste para uma label ou horário">
  {selecting
   ? <input className="cb" style={{marginTop:3}} type="checkbox" checked={selected} aria-label={`Selecionar ${t.title}`} onChange={()=>onToggle(t.id)}/>
   : <input className="cb" style={{marginTop:3}} type="checkbox" checked={t.done} aria-label={`${t.done?'Reabrir':'Concluir'} ${t.title}`} onChange={()=>t.done?onReopen(t.id):onComplete(t.id)}/>}
  <div style={{flex:1,minWidth:0}}>
   <button className="trk-title" aria-label={`Editar ${t.title}`} onClick={()=>onOpen(t.id)}>{t.title}</button>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'4px 8px',marginTop:4,fontSize:12,color:'var(--muted-foreground)'}}>
    <span className="badge b-s"><span className="dot" style={{background:t.area==='Profissional'?'var(--primary)':'#8755ad'}}/>{t.area}</span>
    {labels.map(l=><span key={l.id} style={{display:'inline-flex',alignItems:'center',gap:4}}><span className="dot" style={{background:l.color}}/>{l.name}</span>)}
    {t.situation==='waiting'&&<span>Aguardando · {t.waitingFor}{t.followUp?` · acompanhar ${new Date(t.followUp+'T12:00').toLocaleDateString('pt-BR')}`:''}</span>}
    {t.focusDate&&<span>{t.focusDate===today?'Em foco':`Foco · ${new Date(t.focusDate+'T12:00').toLocaleDateString('pt-BR')}`}</span>}
    {t.at&&<span>{t.reservationKind==='reminder'?'Lembrete':'Reserva'} · {new Date(t.at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
    {isNew&&<span className="badge b-b">Nova</span>}
    {t.completionPending&&<span>Conclusão pendente</span>}
    {t.syncError&&<span role="alert" style={{color:'var(--tc-danger)'}}>{t.syncError}</span>}
    <span className="trk-inline" style={{color:overdue?'var(--tc-danger)':undefined}}>{due}</span>
    {priority&&<span className={'badge trk-inline '+priorityTone}>{priority}</span>}
    <span className="trk-inline">{t.minutes} min</span>
   </div>
  </div>
  <span className="trk-col-due" style={{color:overdue?'var(--tc-danger)':'var(--foreground)'}}>{due}</span>
  <span className="trk-col-prio">{priority&&<span className={'badge '+priorityTone}>{priority}</span>}</span>
  <span className="trk-col-min">{t.minutes} min</span>
  <TaskActionMenu task={t} onOpen={onOpen} onPlan={onPlan}/>
 </article>;
}
