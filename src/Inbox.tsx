import {useEffect,useState} from 'react';
import {AlertCircle} from 'lucide-react';
import {AttachmentList,LabelPicker} from './FeatureUI';
import {CaptureModelPicker} from './CaptureModelPicker';
import {captureDefault,type CaptureProfile} from './captureProfiles';
import {InlinePriority} from './InlinePriority';
import {formatDue,formatWhen} from './ui-kit/format';
import type {Features} from './features';
import type {Task} from './task';

type Capture=Features['captures'][number];
type Tab='review'|'processing'|'failed'|'processed';
type Props={features:Features;tasks:Task[];onOpen:(id:string)=>void};

const tabNames:Record<Tab,string>={review:'Para revisar',processing:'Processando',failed:'Falharam',processed:'Processadas'};
const emptyTitles:Record<Tab,string>={review:'Sua caixa de entrada está vazia',processing:'Nenhuma captura em processamento',failed:'Nenhuma captura com falha',processed:'Nenhuma captura processada'};
const modeNames={list:'Lista de itens',free:'Texto livre'};

function tabOf(capture:Capture,features:Features):Tab{
 if(capture.state==='processed')return 'processed';
 if(features.triaging===capture.id||(!!capture.triage_until&&Date.parse(capture.triage_until)>Date.now()))return 'processing';
 if(capture.error)return 'failed';
 return 'review';
}

export function Inbox({features,tasks,onOpen}:Props){
 const [tab,setTab]=useState<Tab>('review');
 const sorted=[...features.captures].sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const groups:Record<Tab,Capture[]>={review:[],processing:[],failed:[],processed:[]};
 for(const capture of sorted)groups[tabOf(capture,features)].push(capture);
 const shown=groups[tab];

 return <div className="inbox tc" style={{maxWidth:920,width:'100%',display:'flex',flexDirection:'column',gap:16}}>
  <div>
   <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Caixa de entrada</h1>
   <p className="desc" style={{marginTop:4,fontSize:14}}>A IA sugere tarefas a partir das capturas. Você decide o que entra no planejamento.</p>
  </div>
  <div className="tabs" role="tablist" aria-label="Estado das capturas">
   {(Object.keys(tabNames) as Tab[]).map(key=><button key={key} role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}>
    {tabNames[key]}<span style={{marginLeft:4,fontSize:12,color:key==='failed'&&groups[key].length?'var(--tc-danger)':'var(--muted-foreground)'}}>{groups[key].length}</span>
   </button>)}
  </div>
  {!shown.length&&<section className="tc-card-s" style={{padding:24}}>
   <h2 style={{margin:0,fontSize:16,fontWeight:600}}>{emptyTitles[tab]}</h2>
   <p className="desc" style={{marginTop:4}}>{tab==='review'?'Use Capturar ou Ctrl/Cmd+K para guardar uma ideia.':'As capturas aparecem aqui conforme mudam de estado.'}</p>
  </section>}
  {shown.map(capture=><CaptureCard key={capture.id} capture={capture} tab={tab} features={features} tasks={tasks} onOpen={onOpen}/>)}
 </div>;
}

function CaptureHeader({capture,status,tone}:{capture:Capture;status:string;tone:string}){
 return <>
  <span className="badge">{modeNames[capture.mode]}</span>
  <span className="desc">{formatWhen(capture.created_at)}</span>
  <span className={'badge '+tone}>{status}</span>
 </>;
}

function CaptureCard({capture:c,tab,features:f,tasks,onOpen}:{capture:Capture;tab:Tab;features:Features;tasks:Task[];onOpen:(id:string)=>void}){
 const [profile,setProfile]=useState<CaptureProfile>(c.ai_profile??captureDefault(f.ai));
 const [title,setTitle]=useState(c.title),[labelIds,setLabelIds]=useState<string[]>([]);
 const generated=tasks.filter(t=>t.captureId===c.id),attachments=f.attachments.filter(a=>a.capture_id===c.id);
 useEffect(()=>{setProfile(c.ai_profile??captureDefault(f.ai));},[c.id,c.ai_profile]);
 const disabled=f.working||(!!c.triage_until&&Date.parse(c.triage_until)>Date.now())||attachments.some(a=>a.state!=='uploaded');
 const text=c.body||'Captura de arquivos';
 const canTriage=!!f.ai?.enabled&&!!c.body.trim();

 if(tab==='processing')return <article className="tc-card-s" style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}><CaptureHeader capture={c} status="Processando" tone="b-b"/></div>
  <p role="status" style={{margin:0,fontSize:14,color:'var(--muted-foreground)'}}>Extraindo e classificando tarefas…</p>
  <div className="tc-bar" aria-hidden="true"><div/></div>
  <blockquote style={{margin:0,paddingLeft:12,borderLeft:'2px solid var(--border)',fontSize:14,lineHeight:1.55,color:'var(--muted-foreground)'}}>{text}</blockquote>
 </article>;

 const failed=tab==='failed';
 const header=<div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
  <CaptureHeader capture={c} status={tab==='processed'?'Processada':failed?'Falhou':'Pronta para revisar'} tone={tab==='processed'?'b-g':failed?'b-r':'b-g'}/>
 </div>;

 return <article className="tc-card-s" style={failed?{borderColor:'var(--tc-b-r-bd)'}:undefined}>
  {header}
  <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
   {tab==='processed'
    ? <details><summary className="desc" style={{cursor:'pointer',fontWeight:500}}>Texto original</summary><p style={{margin:'8px 0 0',fontSize:14,lineHeight:1.55}}>{text}</p></details>
    : <blockquote style={{margin:0,paddingLeft:12,borderLeft:'2px solid var(--border)',fontSize:14,lineHeight:1.55,color:'var(--muted-foreground)'}}>{text}</blockquote>}
   {attachments.length>0&&<AttachmentList items={attachments} features={f}/>}
   {c.error&&<div role="alert" className="inbox-error" style={{display:'flex',gap:8,padding:'10px 12px',border:'1px solid var(--tc-b-r-bd)',borderRadius:6,background:'var(--tc-b-r-bg)',fontSize:13,color:'var(--tc-b-r-fg)'}}><AlertCircle size={16} style={{flex:'0 0 auto',marginTop:1}} aria-hidden="true"/>{c.error}</div>}
   {tab==='processed'&&<>
    {c.triage_summary?.dateReview?.map((review,i)=><p className="desc" role="status" key={i} style={{color:'var(--tc-warn)'}}>{review.title}: {review.messages.join(' ')}</p>)}
    <div className="desc" style={{fontWeight:500}}>{generated.length} tarefa(s) criada(s)</div>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>{generated.map(t=><CreatedTask key={t.id} task={t} features={f} onOpen={onOpen}/>)}</div>
   </>}
   {tab!=='processed'&&<details className="tc-details">
    <summary>Opções de triagem</summary>
    <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:16}}>
     <CaptureModelPicker value={profile} onChange={setProfile} disabled={disabled}/>
     <div className="f"><label className="lab" htmlFor={`title-${c.id}`}>Título da tarefa (opcional)</label><input id={`title-${c.id}`} className="inp" value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} placeholder="Se vazio, usa texto ou nome do arquivo"/></div>
     <div className="f"><span className="lab">Labels</span><LabelPicker labels={f.labels} selected={labelIds} onChange={setLabelIds}/></div>
    </div>
   </details>}
  </div>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'12px 16px',borderTop:'1px solid var(--border)'}}>
   {tab==='processed'
    ? <><span className="desc tc-foot-note" style={{flex:1}}>Desfazer remove todas as tarefas criadas por esta captura.</span><button className="btn btn-sm" disabled={f.working} onClick={()=>void f.undo(c.id)}>Desfazer triagem do conjunto</button></>
    : <><span className="desc tc-foot-note" style={{flex:1}}>{canTriage?'A IA extrai as tarefas; você pode desfazer depois.':'Cria uma tarefa a partir desta captura.'}</span>
       <button className={'btn btn-sm'+(canTriage?'':' btn-p')} disabled={disabled} onClick={()=>void f.convert(c.id,title,labelIds)}>{failed?'Criar tarefa manualmente':'Criar tarefa'}</button>
       {canTriage&&<button className="btn btn-p btn-sm" disabled={disabled} onClick={()=>void f.triage(c.id,profile)}>{failed?'Tentar de novo':'Extrair e classificar tarefas'}</button>}</>}
  </div>
 </article>;
}

function CreatedTask({task:t,features:f,onOpen}:{task:Task;features:Features;onOpen:(id:string)=>void}){
 const labels=(t.labelIds??[]).map(id=>f.labels.find(l=>l.id===id)).filter(Boolean) as Features['labels'];
 const people=f.taskPeople.filter(p=>p.task_id===t.id);
 const waiting=t.situation==='waiting';
 return <div className="sug">
  <div style={{flex:1,minWidth:0}}>
   <div><button className="tc-link inbox-task-title" style={{display:"block"}} onClick={()=>onOpen(t.id)}>{t.title}</button></div>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'4px 8px',marginTop:4,fontSize:12,color:'var(--muted-foreground)'}}>
    <span className="badge b-s"><span className="dot" style={{background:t.area==='Profissional'?'var(--primary)':'#8755ad'}}/>{t.area}</span>
    <span>{formatDue(t.due)}</span>
    <span>{t.minutes} min</span>
    {t.priority==='high'&&<span className="badge b-r">Alta</span>}
    {t.priority==='medium'&&<span className="badge b-a">Média</span>}
    {t.priority==='low'&&<span className="badge">Baixa</span>}
    {labels.map(l=><span key={l.id} style={{display:'inline-flex',alignItems:'center',gap:4}}><span className="dot" style={{background:l.color}}/>{l.name}</span>)}
    {waiting&&<span>Aguardando · {t.waitingFor} · acompanhar {t.followUp?new Date(t.followUp+'T12:00').toLocaleDateString('pt-BR'):'nos detalhes'}</span>}
    {people.map((p,i)=><span key={i}>Pessoa · {p.person_id?f.people.find(x=>x.id===p.person_id)?.name??p.name:p.name} · {p.person_id?'cadastrada':'nome livre'}</span>)}
   </div>
  </div>
  <InlinePriority task={t}/>
 </div>;
}
