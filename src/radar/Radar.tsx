import {useMemo,useState} from 'react';
import {Plus,Search} from 'lucide-react';
import {primaryPerson,type Task} from '@/task';
import type {Label} from '@/features';
import {Sw} from '@/ui-kit/Sw';
import {RadarDetail,type NewAction} from './RadarDetail';
import {NewThemeDialog} from './NewThemeDialog';
import {useRadar} from './useRadar';
import {filterThemes,isRadarTheme,noFilters,radarCounters,radarLabelId,reviewPending,sortThemes,temperatureNames,type RadarFilters,type ThemeDraft,type RadarRecord,type RadarTheme,type Temperature} from './radarModel';

type Props={
 userId:string;
 tasks:Task[];
 labels:Label[];
 people:{id:string;name:string}[];
 ensurePerson:(name:string)=>Promise<{id:string;name:string}>;
 defaultArea:Task['area'];
 onRefresh:()=>Promise<void>;
 onOpenTask:(id:string)=>void;
 onSaveTask:(taskId:string,fields:Pick<ThemeDraft,'title'|'description'|'area'|'personName'>)=>Promise<boolean>;
 onCreated:()=>void;
 onCreateAction:(theme:Task,action:NewAction)=>Promise<boolean>;
 onClose:(themeId:string)=>Promise<boolean>;
};

const tones:Record<Temperature,string>={observar:'',atencao:'b-a',critico:'b-r'};
const longDate=(day:string)=>new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});

function peopleText(task:Task){
 const {primary,others}=primaryPerson(task);
 return [primary,...others].filter(Boolean).map(p=>p!.name).join(', ');
}
function reviewText(record:RadarRecord,pending:boolean){
 if(pending)return 'Revisão pendente';
 return `Próxima revisão ${longDate(record.nextReview!)}`;
}

export function Radar({userId,tasks,labels,people,ensurePerson,defaultArea,onRefresh,onOpenTask,onSaveTask,onCreated,onCreateAction,onClose}:Props){
 const radarId=radarLabelId(labels);
 const themeTasks=useMemo(()=>tasks.filter(t=>isRadarTheme(t,radarId)),[tasks,radarId]);
 const radar=useRadar(userId,useMemo(()=>themeTasks.map(t=>t.id),[themeTasks]));
 const [filters,setFilters]=useState<RadarFilters>(noFilters);
 const [openId,setOpenId]=useState('');
 const [creating,setCreating]=useState(false);
 const themes:RadarTheme[]=themeTasks.flatMap(task=>radar.records[task.id]?[{task,record:radar.records[task.id]}]:[]);
 const counters=radarCounters(themes,radar.today);
 const shown=sortThemes(filterThemes(themes,filters,radar.today),radar.today);
 const open=themes.find(t=>t.task.id===openId);
 const filtered=!!filters.query||filters.temperature!=='todas'||filters.pendingOnly;

 return <div className="radar tc" style={{maxWidth:920,width:'100%',display:'flex',flexDirection:'column',gap:16}}>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',gap:12}}>
   <div style={{flex:'1 1 280px'}}>
    <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Radar</h1>
    <p className="desc" style={{marginTop:4,fontSize:14}}>Temas para acompanhar de perto. O Radar monitora; a tarefa executa. Temas não entram no planejamento da semana.</p>
   </div>
   <button type="button" className="btn btn-p" onClick={()=>setCreating(true)}><Plus size={16} aria-hidden="true"/>Novo tema</button>
  </div>
  <div className="tc-summary">
   <div className="tc-card-s" style={{padding:'12px 16px'}}><div className="desc">Monitorados</div><div style={{fontSize:24,fontWeight:600}}>{counters.monitored}</div></div>
   <div className="tc-card-s" style={{padding:'12px 16px'}}><div className="desc">Em atenção ou críticos</div><div style={{fontSize:24,fontWeight:600}}>{counters.attention}</div></div>
   <div className="tc-card-s" style={{padding:'12px 16px'}}><div className="desc">Revisão pendente</div><div style={{fontSize:24,fontWeight:600,color:counters.pending?'var(--tc-danger)':undefined}}>{counters.pending}</div></div>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
   <div style={{position:'relative',flex:'1 1 220px'}}>
    <Search size={14} aria-hidden="true" style={{position:'absolute',left:10,top:11,color:'var(--muted-foreground)'}}/>
    <input className="inp" style={{paddingLeft:30}} type="search" aria-label="Buscar temas" placeholder="Buscar por título ou anotação" value={filters.query} onChange={e=>setFilters({...filters,query:e.target.value})}/>
   </div>
   <select className="inp" style={{width:'auto'}} aria-label="Temperatura" value={filters.temperature} onChange={e=>setFilters({...filters,temperature:e.target.value as RadarFilters['temperature']})}>
    <option value="todas">Todas as temperaturas</option>
    {(Object.keys(temperatureNames) as Temperature[]).map(key=><option key={key} value={key}>{temperatureNames[key]}</option>)}
   </select>
   <span style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14}}>
    <Sw checked={filters.pendingOnly} onChange={pendingOnly=>setFilters({...filters,pendingOnly})} label="Só revisão pendente"/>
    Só revisão pendente
   </span>
  </div>
  {radar.error&&<div role="alert" className="notice">Não foi possível sincronizar o Radar: {radar.error}</div>}
  {!radar.ready&&<p className="desc" role="status">Carregando o Radar…</p>}
  {radar.ready&&!shown.length&&<section className="tc-card-s" style={{padding:24}}>
   <h2 style={{margin:0,fontSize:16,fontWeight:600}}>{filtered?'Nenhum tema com esses filtros':'Nenhum tema no Radar'}</h2>
   <p className="desc" style={{marginTop:4}}>{filtered?'Ajuste a busca ou os filtros.':'Use “Novo tema” para criar o primeiro, ou aplique a label Radar a uma tarefa.'}</p>
  </section>}
  {shown.map(({task,record})=>{
   const pending=reviewPending(record,radar.today);
   const people=peopleText(task);
   const summary=(record.notes||task.description||'').trim();
   return <button key={task.id} type="button" className="tc-card-s radar-card" style={{padding:16,textAlign:'left',display:'flex',flexDirection:'column',gap:8,cursor:'pointer',font:'inherit',color:'inherit'}} onClick={()=>setOpenId(task.id)}>
    <span style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
     <span style={{fontSize:16,fontWeight:600,flex:'1 1 200px'}}>{task.title}</span>
     <span className={'badge '+tones[record.temperature]}>{temperatureNames[record.temperature]}</span>
     {task.situation==='waiting'&&<span className="badge b-s">Aguardando retorno</span>}
    </span>
    {summary&&<span className="desc" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',whiteSpace:'pre-line'}}>{summary}</span>}
    <span className="desc" style={{display:'flex',flexWrap:'wrap',gap:'4px 12px',fontSize:12}}>
     {people&&<span>{people}</span>}
     <span style={{color:pending?'var(--tc-danger)':undefined,fontWeight:pending?600:undefined}}>{reviewText(record,pending)}</span>
    </span>
   </button>;
  })}
  {open&&<RadarDetail key={open.task.id} theme={open} tasks={tasks} radar={radar} people={people} radarId={radarId} onRefresh={onRefresh} onSaveTask={onSaveTask} onClose={()=>setOpenId('')} onEditTask={onOpenTask} onCreateAction={onCreateAction} onEnd={async()=>{const ok=await onClose(open.task.id);if(ok)setOpenId('');return ok;}}/>}
 {creating&&<NewThemeDialog people={people} defaultArea={defaultArea} onClose={()=>setCreating(false)} onCreate={async draft=>{const result=await radar.createTheme(draft,ensurePerson,onRefresh);if('error' in result)return result.error;setCreating(false);setOpenId(result.id);onCreated();return '';}}/>}
 </div>;
}
