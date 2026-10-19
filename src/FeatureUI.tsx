import {FileText,Download,RotateCcw,X} from 'lucide-react';
import './inbox-card.css';
import {Field,EmptyState} from './components/Experience';
import {Button} from './components/ui/button';
import {Textarea} from './components/ui/textarea';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import {CaptureEvaluation} from './CaptureEvaluation';
import {CaptureModelPicker} from './CaptureModelPicker';
import {captureDefault,captureProfileNames,type CaptureProfile} from './captureProfiles';
import {AiModelSettings} from './AiModelSettings';
import {TelegramSettings} from './TelegramSettings';
import {usePreference} from './uiState';
import {LabelChips} from './ui-kit/LabelChips';
import {InlinePriority} from './InlinePriority';
import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {VoiceCapture} from './VoiceCapture';
import type {Task} from './task';
import {ensure,invoke,type Features,type Attachment,type Label} from './features';
export function LabelPicker(props:{labels:Label[];selected:string[];onChange:(value:string[])=>void}){return <LabelChips {...props}/>;}
export function AttachmentList({items,features}:{items:Attachment[];features:Features}){
 return <div className="attachment-list">{items.map(a=><AttachmentItem key={a.id} attachment={a} features={features}/>)}</div>;
}
function AttachmentItem({attachment:a,features}:{attachment:Attachment;features:Features}){
 const input=useRef<HTMLInputElement>(null);
 const uploaded=a.state==='uploaded';
 return <div className="attachment-item">
  <FileText className="attachment-icon" size={16} aria-hidden="true"/>
  <div className="attachment-info"><span className="attachment-name">{a.name}</span><small className={a.state==='error'?'attachment-state attachment-failed':'attachment-state'}>{uploaded?'Anexado':a.state==='error'?'Falha no upload':'Upload pendente'}</small></div>
  <Button type="button" variant="ghost" size="sm" disabled={features.working} aria-label={`${uploaded?'Baixar':'Reenviar'} ${a.name}`} onClick={()=>uploaded?void features.run(()=>features.download(a)):input.current?.click()}>{uploaded?<Download aria-hidden="true"/>:<RotateCcw aria-hidden="true"/>}{uploaded?'Baixar':'Reenviar'}</Button>
  {!uploaded&&<input ref={input} hidden type="file" aria-label={`Reenviar ${a.name}`} tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];if(file)void features.run(()=>features.upload(a,file));e.target.value='';}}/>}
  {a.error&&<details className="attachment-error"><summary>Detalhes do erro</summary><small>{a.error}</small></details>}
 </div>;
}
export function Inbox({features,tasks,onOpen}:{features:Features;tasks:Task[];onOpen:(id:string)=>void}){
 const [history,setHistory]=useState(false);
 const captures=features.captures.filter(c=>history?c.state==='processed':c.state!=='processed').sort((a,b)=>b.created_at.localeCompare(a.created_at));
 return <div className="inbox"><div className="inbox-toolbar"><button onClick={()=>setHistory(!history)}>{history?'Voltar à caixa de entrada':'Ver processadas'}</button><span>{captures.length} captura(s)</span></div>{!captures.length&&<section className="card inbox-empty"><h2>{history?'Nenhuma captura processada':'Sua caixa de entrada está vazia'}</h2><EmptyState>Use Captura rápida ou Ctrl/Cmd+K.</EmptyState></section>}<div className="inbox-captures">{captures.map(c=><CaptureCard key={c.id} capture={c} features={features} tasks={tasks} onOpen={onOpen}/>)}</div></div>;
}
function CaptureCard({capture:c,features:f,tasks,onOpen}:{capture:Features['captures'][number];features:Features;tasks:Task[];onOpen:(id:string)=>void}){
 const [profile,setProfile]=useState<CaptureProfile>(c.ai_profile??captureDefault(f.ai));
 const [title,setTitle]=useState(c.title),[labelIds,setLabelIds]=useState<string[]>([]);
 const generated=tasks.filter(t=>t.captureId===c.id),attachments=f.attachments.filter(a=>a.capture_id===c.id);
 useEffect(()=>{setProfile(c.ai_profile??captureDefault(f.ai));},[c.id,c.ai_profile]);
 const triaging=f.triaging===c.id;
 const disabled=f.working||(!!c.triage_until&&Date.parse(c.triage_until)>Date.now())||attachments.some(a=>a.state!=='uploaded');
 return <section className="card capture-card">
  <header className="inbox-capture-header"><time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString('pt-BR')}</time>{c.ai_profile&&<small>{captureProfileNames[c.ai_profile]}</small>}{triaging&&<small role="status">Extraindo e classificando tarefas…</small>}</header>
  {c.state==='processed'?<details className="inbox-original"><summary>Texto original</summary><p className="capture-text">{c.body||'Captura de arquivos'}</p></details>:<p className="capture-text">{c.body||'Captura de arquivos'}</p>}
  {attachments.length>0&&<AttachmentList items={attachments} features={f}/>}
  {c.state==='processed'?<>
   {c.triage_summary?.dateReview?.map((review,i)=><p className="capture-review" role="status" key={i}>{review.title}: {review.messages.join(" ")}</p>)}<p className="inbox-result-count">{generated.length} tarefa(s) criada(s)</p>
   <div className="inbox-results">{generated.map(t=><div className="capture-result" key={t.id}>
    <div className="inbox-task-content"><button className="inbox-task-title" onClick={()=>onOpen(t.id)}>{t.title}</button><div className="inbox-task-meta"><small>{t.situation==='waiting'?`Aguardando · ${t.waitingFor} · acompanhar ${t.followUp?new Date(t.followUp+'T12:00').toLocaleDateString('pt-BR'):'nos detalhes'}`:'A fazer'}</small>{t.due&&<small>Vencimento · {new Date(t.due+'T12:00').toLocaleDateString('pt-BR')}</small>}{f.taskPeople.filter(p=>p.task_id===t.id).map((p,i)=><small key={i}>Pessoa · {p.person_id?f.people.find(x=>x.id===p.person_id)?.name??p.name:p.name} · {p.person_id?'cadastrada':'nome livre'}</small>)}{t.labelIds?.map(id=>{const label=f.labels.find(l=>l.id===id);return label?<span className="label-chip" key={id} style={{borderColor:label.color}}>{label.name}</span>:null;})}</div></div>
    <InlinePriority task={t}/>
   </div>)}</div>
   <footer className="inbox-card-actions"><button disabled={f.working} onClick={()=>void f.undo(c.id)}>Desfazer triagem do conjunto</button></footer>
  </>:<>
   <details className="inbox-processing-options"><summary>Opções de triagem</summary><CaptureModelPicker value={profile} onChange={setProfile} disabled={disabled}/><label>Título da tarefa (opcional)<input value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} placeholder="Se vazio, usa texto ou nome do arquivo"/></label>
   <LabelPicker labels={f.labels} selected={labelIds} onChange={setLabelIds}/></details>
   <footer className="inbox-card-actions"><button className="primary" disabled={disabled} onClick={()=>void f.convert(c.id,title,labelIds)}>Criar tarefa</button>{f.ai?.enabled&&c.body.trim()&&<button disabled={disabled} onClick={()=>void f.triage(c.id,profile)}>Extrair e classificar tarefas</button>}</footer>
  </>}
  {c.error&&<p className="inbox-error" role="alert">{c.error}</p>}
 </section>;
}
