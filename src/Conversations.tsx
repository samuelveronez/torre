import {useEffect,useRef,useState} from 'react';
import {MessageSquare,Plus,Sparkles,ExternalLink,Pencil,Trash2} from 'lucide-react';
import {supabase} from './supabase';
import type {Task} from './task';
import {conversationToday,emptyAgreement,weekAfter,type Agreement,type ConversationContent} from '../supabase/functions/_shared/conversationModel';
type Person={id:string;name:string};
type Conversation=ConversationContent&{id:string;person_id:string;conversation_date:string;version:number;state:'draft'|'saved';created_at?:string;updated_at?:string};
const recentFirst=(a:Conversation,b:Conversation)=>b.conversation_date.localeCompare(a.conversation_date)||(b.created_at??b.updated_at??'').localeCompare(a.created_at??a.updated_at??'')||b.id.localeCompare(a.id);
const displayDate=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString('pt-BR');
const blank=(person:string):Conversation=>({id:crypto.randomUUID(),person_id:person,conversation_date:conversationToday(),version:0,state:'draft',raw_text:'',check_in:'',decisions:'',agreements:[],created_at:new Date().toISOString()});
export function Conversations({userId,tasks,aiEnabled,onOpenTask,onRefresh}:{userId:string;tasks:Task[];aiEnabled:boolean;onOpenTask:(id:string)=>void;onRefresh:()=>void}){
 const [people,setPeople]=useState<Person[]>([]),[records,setRecords]=useState<Conversation[]>([]),[current,setCurrent]=useState<Conversation|null>(null);
 const [name,setName]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [peopleView,setPeopleView]=useState(true);
 const peopleScroll=useRef(0),peoplePanel=useRef<HTMLElement|null>(null);
 const [suggestion,setSuggestion]=useState<ConversationContent|null>(null);
 const [personEdit,setPersonEdit]=useState<Person|null>(null),[personName,setPersonName]=useState(''),[personError,setPersonError]=useState(''),[personSaving,setPersonSaving]=useState(false);
 const personDraft=useRef<{person:Person;name:string}|null>(null),personSaveRequest=useRef<Promise<boolean>|null>(null);
 const [conflict,setConflict]=useState<Conversation|null>(null);
 const [selectedPerson,setSelectedPerson]=useState(''),[editingSaved,setEditingSaved]=useState(false),[deleteConfirm,setDeleteConfirm]=useState(false);
 const latest=useRef(current),versions=useRef(new Map<string,number>()),queue=useRef<Promise<boolean>>(Promise.resolve(true)),timer=useRef<ReturnType<typeof setTimeout>|null>(null),mounted=useRef(true);
 const cacheKey='torre:conversation-recovery:'+userId;
 const recover=useRef(false),failedRequests=useRef(new Map<string,{signature:string;request:string;version:number}>());
 useEffect(()=>{mounted.current=true;void Promise.all([supabase.from('torre_people').select('id,name').eq('user_id',userId).order('name'),supabase.from('torre_conversations').select('*').eq('user_id',userId).order('conversation_date',{ascending:false})]).then(([p,c])=>{if(p.error||c.error)throw p.error||c.error;if(!mounted.current)return;setPeople(p.data??[]);setRecords(c.data??[]);for(const row of c.data??[])versions.current.set(row.id,row.version);try{const pending=JSON.parse(localStorage.getItem(cacheKey)||'null') as Conversation|null;if(pending&&p.data?.some(x=>x.id===pending.person_id)){setCurrent(pending);latest.current=pending;recover.current=true;setStatus('Rascunho recuperado neste navegador. Revise e salve.');}}catch{} }).catch(e=>setError(e.message)).finally(()=>setLoading(false));return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[userId,cacheKey]);
 function edit(next:Conversation){latest.current=next;setCurrent(next);setSuggestion(null);try{localStorage.setItem(cacheKey,JSON.stringify({...next,version:versions.current.get(next.id)??next.version}));}catch{setError('Não foi possível guardar a recuperação local. Salve antes de sair.');}setStatus('Alterações pendentes…');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save(next,next.state,false),900);}
 function save(snapshot:Conversation,state:Conversation['state'],create:boolean){
  if(timer.current){clearTimeout(timer.current);timer.current=null;}
  queue.current=queue.current.then(async()=>{
   if(!mounted.current)return false;
   setStatus('Salvando…');setError('');
   try{
    const content={raw_text:snapshot.raw_text,check_in:snapshot.check_in,decisions:snapshot.decisions,agreements:snapshot.agreements};
    const signature=JSON.stringify([snapshot.person_id,snapshot.conversation_date,content,state,create]);
    const failed=failedRequests.current.get(snapshot.id);
    const version=failed?.signature===signature?failed.version:recover.current&&latest.current?.id===snapshot.id?snapshot.version:(versions.current.get(snapshot.id)??snapshot.version);
    const request=failed?.signature===signature?failed.request:crypto.randomUUID();
    failedRequests.current.set(snapshot.id,{signature,request,version});
    const {data,error:failure}=await supabase.rpc('torre_save_conversation',{p_id:snapshot.id,p_person:snapshot.person_id,p_date:snapshot.conversation_date,p_content:content,p_version:version,p_state:state,p_create:create,p_request:request});
    if(failure)throw failure;
    const row=data as Conversation;versions.current.set(row.id,row.version);recover.current=false;failedRequests.current.delete(row.id);
    if(!mounted.current)return true;
    setRecords(prev=>[row,...prev.filter(x=>x.id!==row.id)].sort(recentFirst));
    if(latest.current?.id===row.id){const now=latest.current;const next={...now,version:row.version,state:row.state,agreements:create?row.agreements:now.agreements.map(a=>row.agreements.find(x=>x.id===a.id&&x.taskId)??a)};latest.current=next;setCurrent(next);try{if(now===snapshot||create)localStorage.removeItem(cacheKey);else localStorage.setItem(cacheKey,JSON.stringify(next));}catch{}}
    setStatus(state==='saved'?'Conversa salva.':'Rascunho salvo.');if(create)onRefresh();return true;
   }catch(e){if(mounted.current){setError((e as Error).message);setStatus('Falha ao salvar. Texto preservado neste navegador.');if((e as Error).message.includes('outra janela')){const remote=await supabase.from('torre_conversations').select('*').eq('user_id',userId).eq('id',snapshot.id).single();if(remote.data&&mounted.current)setConflict(remote.data as Conversation);}}return false;}
  });return queue.current;
 }
 async function open(personId:string,record?:Conversation,fresh=false){if(busy)return;if(!(await renamePerson()))return;if(latest.current&&(latest.current.state==='draft'||editingSaved)&&!(await save(latest.current,fresh?'saved':latest.current.state,false)))return;const all=latest.current?[latest.current,...records.filter(x=>x.id!==latest.current?.id)]:records;const next=(record?.id===latest.current?.id?latest.current:record)??(fresh?blank(personId):all.filter(x=>x.person_id===personId).sort(recentFirst)[0]??null);latest.current=next;setCurrent(next);setSelectedPerson(personId);setPeopleView(false);if(window.matchMedia('(max-width: 767px)').matches)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));setEditingSaved(false);setDeleteConfirm(false);setSuggestion(null);setConflict(null);setError('');setStatus(next?.state==='saved'?'Conversa salva.':next?'Rascunho aberto.':'');}
 async function deleteDraft(){const c=latest.current;if(!c||c.state!=='draft'||busy)return;setBusy(true);setError('');if(timer.current){clearTimeout(timer.current);timer.current=null;}try{await queue.current;const version=recover.current?c.version:(versions.current.get(c.id)??c.version);if(version===0){const check=await supabase.from('torre_conversations').select('id').eq('user_id',userId).eq('id',c.id);if(check.error)throw check.error;if(check.data?.length)throw new Error('O rascunho foi salvo em outra operação. Reabra a conversa antes de excluir.');}if(version>0){const result=await supabase.from('torre_conversations').delete().eq('user_id',userId).eq('id',c.id).eq('state','draft').eq('version',version).select('id');if(result.error)throw result.error;if(!result.data?.length)throw new Error('O rascunho mudou ou já foi salvo. Reabra a conversa antes de excluir.');}const remaining=records.filter(x=>x.id!==c.id);setRecords(remaining);versions.current.delete(c.id);failedRequests.current.delete(c.id);recover.current=false;try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached?.id===c.id)localStorage.removeItem(cacheKey);}catch{}const next=remaining.filter(x=>x.person_id===c.person_id).sort(recentFirst)[0]??null;latest.current=next;setCurrent(next);setSelectedPerson(c.person_id);setEditingSaved(false);setDeleteConfirm(false);setSuggestion(null);setConflict(null);setStatus('Rascunho excluído.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function addPerson(e:React.FormEvent){e.preventDefault();const value=name.trim();if(!value)return;setBusy(true);setError('');try{const old=people.find(p=>p.name.toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR'));if(old){setBusy(false);await open(old.id);setName('');return;}const {data,error:failure}=await supabase.from('torre_people').insert({user_id:userId,name:value}).select('id,name').single();if(failure)throw failure;setPeople(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));setBusy(false);await open(data.id);setName('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function renamePerson():Promise<boolean>{
  if(personSaveRequest.current)return personSaveRequest.current;
  const draft=personDraft.current;if(!draft)return Promise.resolve(true);
  const value=draft.name.trim();setPersonError('');
  if(!value){setPersonError('Informe o nome da pessoa.');return Promise.resolve(false);}
  if(people.some(p=>p.id!==draft.person.id&&p.name.trim().toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR'))){setPersonError('Já existe uma pessoa com esse nome.');return Promise.resolve(false);}
  if(value===draft.person.name.trim()){personDraft.current=null;setPersonEdit(null);return Promise.resolve(true);}
  setPersonSaving(true);
  const request=(async()=>{
   try{
    const {data,error:failure}=await supabase.from('torre_people').update({name:value}).eq('user_id',userId).eq('id',draft.person.id).select('id,name').single();
    if(failure)throw failure;
    if(!mounted.current)return false;
    setPeople(prev=>prev.map(p=>p.id===data.id?data:p).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));personDraft.current=null;setPersonEdit(null);return true;
   }catch(e){if(mounted.current)setPersonError((e as {code?:string}).code==='23505'?'Já existe uma pessoa com esse nome.':'Não foi possível salvar o nome. Tente novamente.');return false;}
   finally{personSaveRequest.current=null;if(mounted.current)setPersonSaving(false);}
  })();personSaveRequest.current=request;return request;
 }
 async function organize(){const c=latest.current;if(!c)return;setBusy(true);setError('');try{if(!(await save(c,c.state,false)))return;const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entre novamente.');const response=await fetch('https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-conversations',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({text:c.raw_text,date:c.conversation_date,personId:c.person_id})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível organizar.');setSuggestion(result.content);setStatus('Interpretação pronta. Confira antes de usar.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function applySuggestion(){if(!current||!suggestion)return;const linked=current.agreements.filter(a=>a.taskId);const candidates=suggestion.agreements.filter(a=>!linked.some(x=>x.sourceText===a.sourceText||x.title.toLocaleLowerCase('pt-BR')===a.title.toLocaleLowerCase('pt-BR')));if(linked.length+candidates.length>20){setError('Até 20 combinados. Remova sugestões antes de aplicar.');return;}edit({...current,check_in:suggestion.check_in,decisions:suggestion.decisions,agreements:[...linked,...candidates]});}
 function updateAgreement(id:string,patch:Partial<Agreement>){if(current)edit({...current,agreements:current.agreements.map(a=>a.id===id?{...a,...patch}:a)});}
 function resolveConflict(keepMine:boolean){if(!conflict||!current)return;versions.current.set(conflict.id,conflict.version);recover.current=false;failedRequests.current.delete(conflict.id);const linked=conflict.agreements.filter(a=>a.taskId);const next=keepMine?{...current,version:conflict.version,agreements:[...linked,...current.agreements.filter(a=>!a.taskId&&!linked.some(x=>x.id===a.id))]}:conflict;setConflict(null);setError('');edit(next);}
 async function finish(create:boolean){if(!current)return;const chosen=current.agreements.filter(a=>a.createTask&&!a.taskId);if(create&&chosen.some(a=>!a.title.trim()||a.owner==='unknown'||a.owner==='other'&&(!a.person.trim()||!a.followUp))){setError('Revise título, responsável e acompanhamento dos combinados selecionados.');return;}setBusy(true);try{if(await save(current,'saved',create))setEditingSaved(false);}finally{setBusy(false);}}
 const person=people.find(p=>p.id===(current?.person_id||selectedPerson)),history=records.filter(c=>c.person_id===(current?.person_id||selectedPerson)).sort(recentFirst);
 const pending=history.filter(c=>current&&c.id!==current.id&&recentFirst(c,current)>0).flatMap(c=>c.agreements).filter(a=>a.taskId&&tasks.some(t=>t.id===a.taskId&&!t.done));
 const reading=!!current&&current.state==='saved'&&!editingSaved;
 const nameAction=person&&(personEdit?.id===person.id
  ? <div className="conversation-name-edit f" style={{minWidth:220}}><label className="f"><span className="lab">Nome da pessoa</span><input className="inp" autoFocus value={personName} maxLength={180} readOnly={personSaving} onChange={e=>{setPersonName(e.target.value);personDraft.current={person:personEdit,name:e.target.value};setPersonError('');}} onBlur={()=>void renamePerson()} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}} aria-invalid={!!personError} aria-describedby={personError?'person-name-error':undefined}/></label>{personSaving&&<small role="status">Salvando…</small>}{personError&&<p id="person-name-error" role="alert" className="desc" style={{color:'var(--tc-danger)'}}>{personError}</p>}</div>
  : <button type="button" className="btn btn-g btn-sm btn-i conversation-name-action" disabled={busy} aria-label={`Editar nome de ${person.name}`} title="Renomear pessoa" onClick={()=>{personDraft.current={person,name:person.name};setPersonEdit(person);setPersonName(person.name);setPersonError('');}}><Pencil size={14} aria-hidden="true"/></button>);

 const shortDate=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
 const initials=(value:string)=>{const parts=value.trim().split(/\s+/).filter(Boolean);return ((parts[0]?.[0]??'')+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase()||'?';};
 const pendingFor=(personId:string)=>records.filter(c=>c.person_id===personId&&c.id!==current?.id).flatMap(c=>c.agreements).filter(a=>a.taskId&&tasks.some(t=>t.id===a.taskId&&!t.done)).length;
 const lastFor=(personId:string)=>records.filter(c=>c.person_id===personId).sort(recentFirst)[0];

 return <div className={`conversations tc ${peopleView?'people-view':'detail-view'}`} style={{maxWidth:1240,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
  <div className="conversation-page-heading">
   <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Pessoas e conversas</h1>
   <p className="desc" style={{marginTop:4,fontSize:14}}>Atas privadas de 1:1 e combinados que viram tarefas.</p>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',gap:20,alignItems:'flex-start'}}>
  <aside ref={peoplePanel} className="tc-card-s conversation-people" aria-label="Pessoas" style={{flex:'0 0 260px',boxSizing:'border-box',padding:12,display:'flex',flexDirection:'column',gap:10}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 4px'}}><h2 style={{margin:0,fontSize:15,fontWeight:600}}>Pessoas</h2><span className="badge b-s">{people.length}</span></div>
   <form onSubmit={e=>void addPerson(e)} style={{display:'flex',gap:6}}>
    <label htmlFor="conversation-new-person" style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'}}>Adicionar pessoa</label>
    <input id="conversation-new-person" className="inp" style={{flex:1,minWidth:0}} value={name} maxLength={180} required onChange={e=>setName(e.target.value)} placeholder="Nome da pessoa"/>
    <button className="btn btn-i" style={{width:36}} disabled={busy||loading} aria-label="Adicionar pessoa"><Plus size={16} aria-hidden="true"/></button>
   </form>
   <div style={{display:'flex',flexDirection:'column',gap:2}}>
    {people.map(p=>{const chosen=person?.id===p.id;const last=lastFor(p.id);const waiting=pendingFor(p.id);return <button className={`tc-person conversation-person-open ${chosen?'selected':''}`} key={p.id} aria-label={p.name} aria-current={chosen?'true':undefined} disabled={busy} onClick={()=>{peopleScroll.current=window.scrollY;void open(p.id);}}>
     <span className="tc-avatar-sm" aria-hidden="true">{initials(p.name)}</span>
     <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:14,fontWeight:chosen?600:500,overflowWrap:'anywhere'}}>{p.name}</span><span style={{display:'block',fontSize:12,color:'var(--muted-foreground)'}}>{last?`Última: ${shortDate(last.conversation_date)}`:'Sem conversas'}</span></span>
     {waiting>0&&<span className="badge b-a" title="Combinados pendentes" aria-hidden="true">{waiting}</span>}
    </button>;})}
    {loading&&<p className="desc">Carregando conversas…</p>}
    {!loading&&!people.length&&<p className="desc" style={{padding:'4px 8px'}}>Nenhuma pessoa ainda.</p>}
   </div>
  </aside>
  <section className="conversation-main" aria-label="Conversa" style={{flex:'999 1 560px',minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
   <button type="button" className="btn btn-sm conversation-mobile-back" onClick={()=>{setPeopleView(true);requestAnimationFrame(()=>window.scrollTo({top:peopleScroll.current,behavior:'instant'}));}}>← Pessoas e histórico</button>
   {error&&<div className="notice" role="alert" style={{display:'flex',gap:8,padding:'10px 12px',border:'1px solid var(--tc-b-r-bd)',borderRadius:6,background:'var(--tc-b-r-bg)',fontSize:13,color:'var(--tc-b-r-fg)'}}>{error}</div>}
   {conflict&&<section className="tc-card-s conversation-section" style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}><h3 style={{margin:0,fontSize:15,fontWeight:600}}>A conversa foi alterada em outra janela</h3><p className="desc">Seu texto continua no formulário. Compare com a versão salva antes de escolher.</p><details><summary style={{cursor:'pointer'}}>Ver versão salva</summary><p className="conversation-text">{conflict.raw_text}</p><h4>Check-in</h4><p className="conversation-text">{conflict.check_in}</p><h4>Decisões</h4><p className="conversation-text">{conflict.decisions}</p>{conflict.agreements.map(a=><p key={a.id}>{a.title} · {a.owner==='me'?'Minha ação':a.person||'Responsável a confirmar'}</p>)}</details><div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',gap:8}}><button className="btn btn-sm" onClick={()=>resolveConflict(true)}>Manter meu registro e salvar sobre essa versão</button><button className="btn btn-sm" onClick={()=>resolveConflict(false)}>Substituir meu registro pela versão salva</button></div></section>}
   {!current
    ? <div className="tc-card-s conversation-empty" style={{padding:32,display:'flex',flexDirection:'column',alignItems:'center',gap:10,textAlign:'center'}}>
       <MessageSquare size={30} color="var(--muted-foreground)" aria-hidden="true"/>
       <div className="conversation-name-heading" style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',justifyContent:'center'}}><h2 style={{margin:0,fontSize:18,fontWeight:600}}>{person?`Nenhuma conversa com ${person.name}`:'Selecione uma pessoa'}</h2>{nameAction}</div>
       <p className="desc">Consulte o histórico ou inicie um novo registro.</p>
       {person&&<button className="btn btn-p" disabled={busy} onClick={()=>void open(person.id,undefined,true)}><Plus size={16} aria-hidden="true"/> Nova conversa</button>}
       {loading?'':people.length===0&&<p className="desc">Adicione a primeira pessoa para começar.</p>}
      </div>
    : <>
   <section className="tc-pending conversation-section conversation-pending" aria-label="Combinados anteriores pendentes" style={pending.length?{display:'flex',gap:10,padding:'12px 14px',border:'1px solid var(--tc-b-a-bd)',borderRadius:8,background:'var(--tc-b-a-bg)'}:undefined}>
    {pending.length>0
     ? <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:'var(--tc-b-a-fg)'}}>{pending.length} {pending.length===1?'combinado anterior pendente':'combinados anteriores pendentes'}</div><div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>{pending.map(a=><button type="button" className="btn btn-sm" key={a.id} aria-label={`${a.title} · Abrir tarefa`} onClick={()=>onOpenTask(a.taskId!)}>{a.title}</button>)}</div></div>
     : <p className="desc">Nenhum combinado anterior pendente.</p>}
   </section>
   <div className="conversation-title" style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
    <div>
     <div className="conversation-name-heading" style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}><h2 style={{margin:0,fontSize:18,fontWeight:600,overflowWrap:'anywhere'}}>{reading?'Ata da conversa':'Conversa'} com {person?.name}</h2>{nameAction}</div>
     <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4,flexWrap:'wrap'}}><span className="desc">{displayDate(current.conversation_date)} · Registro privado</span><span className={`badge ${current.state==='draft'?'b-a':'b-g'}`}>{current.state==='draft'?'Rascunho':'Salva'}</span></div>
    </div>
    <div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',gap:8}}>
     {reading&&<button className="btn btn-sm" disabled={busy} onClick={()=>setEditingSaved(true)}><Pencil size={14} aria-hidden="true"/> Editar conversa</button>}
     {current.state==='draft'&&<button className="btn btn-sm btn-d" disabled={busy} onClick={()=>setDeleteConfirm(true)}><Trash2 size={14} aria-hidden="true"/> Excluir rascunho</button>}
     <button className="btn btn-sm" disabled={busy} onClick={()=>void open(current.person_id,undefined,true)}><Plus size={14} aria-hidden="true"/> Nova conversa</button>
    </div>
   </div>
   {history.length>0&&<div role="group" aria-label="Histórico" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
    <span className="desc" style={{fontWeight:500}}>Histórico</span>
    <div className="seg">{history.map(c=><button key={c.id} aria-pressed={c.id===current.id} title={displayDate(c.conversation_date)} disabled={busy} style={{height:30,fontSize:13}} onClick={()=>void open(c.person_id,c)}>{shortDate(c.conversation_date)} · {c.state==='draft'?'Rascunho':'Salva'}</button>)}</div>
   </div>}
   {deleteConfirm&&current.state==='draft'&&<section className="tc-card-s conversation-section" role="alert" style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}><h3 style={{margin:0,fontSize:15,fontWeight:600}}>Excluir este rascunho?</h3><p className="desc">O texto e os combinados deste rascunho serão removidos. As conversas salvas permanecem no histórico.</p><div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',gap:8}}><button className="btn btn-sm btn-d" disabled={busy} onClick={()=>void deleteDraft()}>Confirmar exclusão do rascunho</button><button className="btn btn-sm" disabled={busy} onClick={()=>setDeleteConfirm(false)}>Cancelar exclusão</button></div></section>}
   {reading
    ? <><ConversationMinutes conversation={current} tasks={tasks} onOpenTask={onOpenTask}/><p role="status" className="desc">{status}</p></>
    : <fieldset disabled={busy} className="conversation-fields tc-fs" style={{gap:16}}>
      <label className="conversation-date f" style={{maxWidth:200}}><span className="lab">Data da conversa</span><input className="inp" type="date" required value={current.conversation_date} onChange={e=>{if(e.target.value)edit({...current,conversation_date:e.target.value,agreements:current.agreements.map(a=>a.followUpSuggested&&!a.taskId?{...a,followUp:weekAfter(e.target.value)}:a)});}}/></label>
      <details className="tc-card-s conversation-section conversation-capture" open={current.state==='draft'} style={{padding:'12px 16px'}}>
       <summary style={{cursor:'pointer',fontSize:14,fontWeight:600,height:24}}>Captura com IA e texto original</summary>
       <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:10}}>
        <label className="f"><span className="lab">Texto livre</span><textarea className="inp" aria-label="Texto livre" rows={6} maxLength={20000} value={current.raw_text} onChange={e=>edit({...current,raw_text:e.target.value})} placeholder="Anote durante a conversa ou cole suas notas depois. Ex.: Ana está sobrecarregada. Decidimos reduzir prioridades. Eu reviso amanhã. Ana envia a proposta sexta."/></label>
        <div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:10}}><button type="button" className="btn btn-sm" disabled={!aiEnabled||!current.raw_text.trim()} onClick={()=>void organize()}><Sparkles size={14} aria-hidden="true"/> Organizar com IA</button><span className="desc">{aiEnabled?'A IA prepara uma interpretação para você revisar.':'Ative a IA em Configurações ou preencha os campos abaixo.'}</span></div>
       </div>
      </details>
      {suggestion&&<section className="tc-card-s conversation-section conversation-review" style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}><h3 style={{margin:0,fontSize:15,fontWeight:600}}>Revisar interpretação</h3><p className="desc">Usar esta interpretação substitui Check-in, Decisões e combinados sem tarefa vinculada. As tarefas existentes são preservadas.</p><h4 style={{margin:0,fontSize:13}}>Check-in</h4><p className="conversation-text">{suggestion.check_in||'Nenhum check-in identificado.'}</p><h4 style={{margin:0,fontSize:13}}>Decisões</h4><p className="conversation-text">{suggestion.decisions||'Nenhuma decisão identificada.'}</p><h4 style={{margin:0,fontSize:13}}>Combinados ({suggestion.agreements.length})</h4>{suggestion.agreements.map(a=><div key={a.id}><strong>{a.title}</strong><p className="desc">{a.owner==='me'?'Minha ação':a.owner==='other'?`Aguardando ${a.person}`:'Responsável a confirmar'}{a.due&&` · Prazo: ${displayDate(a.due)}`}{a.followUp&&` · Acompanhar: ${displayDate(a.followUp)}${a.followUpSuggested?' (sugerido)':''}`}</p><small className="desc">Trecho: {a.sourceText}</small></div>)}<div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="button" className="btn btn-p btn-sm" onClick={applySuggestion}>Usar interpretação</button><button type="button" className="btn btn-sm" onClick={()=>setSuggestion(null)}>Descartar sugestões</button></div></section>}
      <div className="conversation-structured" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
       <section className="tc-card-s conversation-section" style={{padding:'12px 16px'}}><label className="f"><span className="lab">Check-in</span><textarea className="inp" aria-label="Check-in" rows={4} maxLength={20000} value={current.check_in} onChange={e=>edit({...current,check_in:e.target.value})} placeholder="Como a pessoa está, dificuldades e contexto"/></label></section>
       <section className="tc-card-s conversation-section" style={{padding:'12px 16px'}}><label className="f"><span className="lab">Decisões</span><textarea className="inp" aria-label="Decisões" rows={4} maxLength={20000} value={current.decisions} onChange={e=>edit({...current,decisions:e.target.value})} placeholder="O que ficou decidido"/></label></section>
      </div>
      <section className="tc-card-s conversation-section" style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
       <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><h3 style={{margin:0,fontSize:15,fontWeight:600}}>Combinados</h3><button type="button" className="btn btn-sm" disabled={current.agreements.length>=20} onClick={()=>edit({...current,agreements:[...current.agreements,emptyAgreement()]})}><Plus size={14} aria-hidden="true"/> Adicionar combinado</button></div>
       {current.agreements.length===0&&<p className="desc">Nenhum combinado. Você pode salvar uma conversa sem tarefas.</p>}
       {current.agreements.map(a=>{const task=tasks.find(t=>t.id===a.taskId);return <article className="conversation-agreement tc-agreement" key={a.id}>{a.taskId
        ? <><div style={{gridColumn:'1 / -1'}}><strong>{a.title}</strong><p className="desc">{a.owner==='me'?'Minha ação':`Aguardando ${a.person}`} · {task?.done?'Concluída':task?.situation==='waiting'?'Aguardando resposta':task?'A fazer':'Tarefa indisponível'}</p></div><div style={{gridColumn:'1 / -1',display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}><button type="button" className="btn btn-sm" disabled={!task} onClick={()=>onOpenTask(a.taskId!)}><ExternalLink size={14} aria-hidden="true"/> Abrir tarefa</button><small className="desc">Combinado original preservado. Edite a tarefa no editor da Torre.</small></div></>
        : <>
          <label className="f" style={{gridColumn:'1 / -1'}}><span className="lab">O que foi combinado?</span><input className="inp" maxLength={180} value={a.title} onChange={e=>updateAgreement(a.id,{title:e.target.value})}/></label>
          <label className="f"><span className="lab">Quem age?</span><select className="inp" value={a.owner} onChange={e=>{const owner=e.target.value as Agreement['owner'];updateAgreement(a.id,{owner,createTask:owner!=='unknown',followUp:owner==='other'?(a.followUp||weekAfter(current.conversation_date)):'',followUpSuggested:owner==='other'&&!a.followUp});}}><option value="unknown">Responsável a confirmar</option><option value="me">Minha ação</option><option value="other">Ação do outro / Aguardando</option></select></label>
          <label className="f"><span className="lab">Prazo (opcional)</span><input className="inp" type="date" value={a.due} onChange={e=>updateAgreement(a.id,{due:e.target.value})}/></label>
          {a.owner==='other'
           ? <><label className="f"><span className="lab">De quem depende?</span><input className="inp" maxLength={180} value={a.person} onChange={e=>updateAgreement(a.id,{person:e.target.value})}/></label>
              <label className="f"><span className="lab">Quando acompanhar?</span><input className="inp" type="date" aria-label="Quando acompanhar?" value={a.followUp} onChange={e=>updateAgreement(a.id,{followUp:e.target.value,followUpSuggested:false})}/>{a.followUpSuggested&&<small className="desc">Data sugerida: uma semana após a conversa.</small>}{a.followUp&&a.followUp<conversationToday()&&<small className="conversation-warning" style={{color:'var(--tc-warn)',fontSize:12}}>Acompanhamento vencido. Revise a data.</small>}</label></>
           : <label className="f"><span className="lab">Duração (minutos)</span><input className="inp" type="number" min={5} max={480} step={5} value={a.minutes} onChange={e=>updateAgreement(a.id,{minutes:Number(e.target.value)})}/></label>}
          <label className="conversation-checkbox" style={{gridColumn:'1 / -1',display:'flex',flexDirection:'row',alignItems:'center',gap:8,fontSize:13}}><input className="cb" type="checkbox" checked={a.createTask} onChange={e=>updateAgreement(a.id,{createTask:e.target.checked})}/> Criar na Torre</label>
          {a.owner==='unknown'&&<small className="conversation-warning" style={{gridColumn:'1 / -1',color:'var(--tc-warn)',fontSize:12}}>Confirme quem age antes de criar uma tarefa.</small>}
          <div style={{gridColumn:'1 / -1'}}><button type="button" className="btn btn-g btn-sm btn-d" onClick={()=>edit({...current,agreements:current.agreements.filter(x=>x.id!==a.id)})}>Remover combinado</button></div>
         </>}
        {a.sourceText&&<details style={{gridColumn:'1 / -1'}}><summary className="desc" style={{cursor:'pointer'}}>Texto de origem</summary><p className="conversation-text">{a.sourceText}</p></details>}</article>;})}
      </section>
      <footer className="tc-card-s conversation-footer" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'10px 16px',position:'sticky',bottom:12,zIndex:10}}>
       <span role="status" style={{flex:'1 1 0',fontSize:13,color:'#15803d'}}>{busy?'Processando…':status}</span>
       <button type="button" className="btn" onClick={()=>void finish(false)}>Salvar conversa</button>
       <button type="button" className="btn btn-p" onClick={()=>void finish(true)}>Salvar e criar tarefas ({current.agreements.filter(a=>a.createTask&&!a.taskId).length})</button>
      </footer>
     </fieldset>}
  </>}
  </section>
  </div>
 </div>;
}

function ConversationMinutes({conversation:c,tasks,onOpenTask}:{conversation:Conversation;tasks:Task[];onOpenTask:(id:string)=>void}){
 const structured=!!(c.check_in.trim()||c.decisions.trim()||c.agreements.length);
 const heading=(text:string)=><h3 style={{margin:0,fontSize:15,fontWeight:600}}>{text}</h3>;
 return <section className="tc-card-s conversation-section conversation-minutes" aria-label="Ata da conversa" style={{padding:'16px',display:'flex',flexDirection:'column',gap:16}}>
  <div className="conversation-structured" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}><section style={{display:'flex',flexDirection:'column',gap:6}}>{heading('Check-in')}<p className="conversation-text" style={{margin:0,lineHeight:1.6}}>{c.check_in||'Não registrado.'}</p></section><section style={{display:'flex',flexDirection:'column',gap:6}}>{heading('Decisões')}<p className="conversation-text" style={{margin:0,lineHeight:1.6}}>{c.decisions||'Nenhuma decisão registrada.'}</p></section></div>
  <section style={{display:'flex',flexDirection:'column',gap:8}}>{heading('Combinados')}{!c.agreements.length&&<p className="desc">Nenhum combinado registrado.</p>}{c.agreements.map(a=>{const task=tasks.find(t=>t.id===a.taskId);return <article className="conversation-agreement" key={a.id} style={{padding:12,border:'1px solid var(--border)',borderRadius:6,display:'flex',flexDirection:'column',gap:6}}><strong>{a.title||'Combinado sem título'}</strong><p className="desc">{a.owner==='me'?'Minha ação':a.owner==='other'?`Aguardando ${a.person}`:'Responsável a confirmar'}{a.taskId&&` · ${task?.done?'Concluída':task?.situation==='waiting'?'Aguardando resposta':task?'A fazer':'Tarefa indisponível'}`}</p><div className="conversation-actions" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>{a.due&&<small className="desc">Prazo combinado: {displayDate(a.due)}</small>}{a.followUp&&<small className="desc">Acompanhamento: {displayDate(a.followUp)}</small>}{a.taskId&&<button type="button" className="btn btn-sm" disabled={!task} onClick={()=>onOpenTask(a.taskId!)}><ExternalLink size={14} aria-hidden="true"/> Abrir tarefa</button>}</div></article>;})}</section>
  {c.raw_text&&(structured?<details><summary className="desc" style={{cursor:'pointer'}}>Consultar texto original</summary><p className="conversation-text" style={{margin:'8px 0 0'}}>{c.raw_text}</p></details>:<section style={{display:'flex',flexDirection:'column',gap:6}}>{heading('Registro da conversa')}<p className="conversation-text" style={{margin:0}}>{c.raw_text}</p></section>)}
 </section>;
}
