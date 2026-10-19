import {useEffect,useRef,useState} from 'react';
import {PanelLeft} from 'lucide-react';
import {agentValues as values} from './agentPresentation';
import {supabase} from './supabase';
import {ensure,invoke,type Features} from './features';
import {AgentHistory} from './agent/AgentHistory';
import {AgentTurn} from './agent/AgentTurn';
import {AgentComposer} from './agent/AgentComposer';
import {AgentConversationMenu} from './agent/AgentConversationMenu';
import {conversationKey,type Conversation,type ModelChoice,type Run} from './agent/types';

export function AgentChat({userId,features,onRefresh,onTask,onLabel,onSettings,onSchedule}:{userId:string;features:Features;onRefresh:()=>void;onTask:(id:string)=>void;onLabel:(id:string)=>void;onSettings:()=>void;onSchedule?:(id:string)=>void}){
 const [runs,setRuns]=useState<Run[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [conversations,setConversations]=useState<Conversation[]>([]),[selected,setSelected]=useState(''),[historyOpen,setHistoryOpen]=useState(false),[search,setSearch]=useState(''),[moreConversations,setMoreConversations]=useState(false),[moreRuns,setMoreRuns]=useState(false),[olderBusy,setOlderBusy]=useState(false),[listBusy,setListBusy]=useState(false),[dismissed,setDismissed]=useState<string[]>([]),[showArchived,setShowArchived]=useState(false),[renaming,setRenaming]=useState(false),[renameText,setRenameText]=useState('');
 const [phone,setPhone]=useState(()=>window.matchMedia('(max-width: 767px)').matches);
 useEffect(()=>{const media=window.matchMedia('(max-width: 767px)');const update=()=>setPhone(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const model:ModelChoice=features.ai?.default_model==='google/gemini-2.5-flash'?'google/gemini-2.5-flash':'openrouter/free';
 async function chooseModel(value:string){setError('');const ok=await features.run(()=>invoke('ai-default',{model:value}));if(!ok)setError('Não foi possível salvar o modelo padrão. Tente novamente.');}
 const locked=useRef(false),bottom=useRef<HTMLDivElement>(null),historyButton=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);const active=useRef(true),selection=useRef(''),loadVersion=useRef(0),listVersion=useRef(0);
 function selectConversation(id:string){selection.current=id;setSelected(id);setText('');setError('');setHistoryOpen(false);try{localStorage.setItem(`torre:${userId}:agent-conversation`,id);}catch{}historyButton.current?.focus();}
 function newConversation(){if(locked.current)return;selectConversation(crypto.randomUUID());}
 async function list(offset=0,query=search,archived=showArchived){const version=++listVersion.current;setListBusy(true);try{const {data}=await ensure(supabase.rpc('torre_agent_conversations',{p_offset:offset,p_query:query,p_archived:archived}));if(active.current&&version===listVersion.current){setConversations(current=>offset?[...current,...data]:data??[]);setMoreConversations((data?.length??0)===50);}return (data??[]) as Conversation[];}finally{if(active.current&&version===listVersion.current)setListBusy(false);}}
 async function load(older=false){const id=selection.current,version=++loadVersion.current;if(!id)return;let q=supabase.from('torre_agent_runs').select('id,conversation_id,message,mode,state,response,model,requested_model,error,operations,created_at').eq('user_id',userId);q=id==='legacy'?q.is('conversation_id',null):q.eq('conversation_id',id);const offset=older?runs.length:0;const {data}=await ensure(q.order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+29));if(active.current&&selection.current===id&&version===loadVersion.current){setRuns(current=>older?[...(data??[]).reverse() as Run[],...current]:(data??[]).reverse() as Run[]);setMoreRuns((data?.length??0)===30);}}
 async function initialize(){setLoading(true);setError('');try{const items=await list(0,'');if(!active.current)return;let saved='';try{saved=localStorage.getItem(`torre:${userId}:agent-conversation`)??'';}catch{}selectConversation(saved==='legacy'||/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved)?saved:items.length?conversationKey(items[0].conversation_id):crypto.randomUUID());}catch{if(active.current){setError('Não foi possível carregar as conversas.');setLoading(false);}}}
 useEffect(()=>{active.current=true;void initialize();return()=>{active.current=false;loadVersion.current++;listVersion.current++;};},[userId]);
 useEffect(()=>{if(!selected)return;let cancelled=false;setRuns([]);setMoreRuns(false);setLoading(true);void load().catch(()=>{if(active.current&&!cancelled)setError('Não foi possível carregar a conversa. Tente novamente.');}).finally(()=>{if(active.current&&!cancelled)setLoading(false);});return()=>{cancelled=true;};},[selected]);
useEffect(()=>{if(!selected)return;void list(0,search,showArchived).catch(()=>setError('Não foi possível carregar as conversas.'));},[showArchived]);
 useEffect(()=>{if(!selected)return;const timer=setTimeout(()=>{void list(0,search).catch(()=>setError('Não foi possível buscar as conversas.'));},250);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{if(!olderBusy)bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[runs.length,busy,loading]);
 useEffect(()=>{if(historyOpen)panel.current?.querySelector<HTMLInputElement>('input')?.focus();},[historyOpen]);
 function closeHistory(){setHistoryOpen(false);historyButton.current?.focus();}
 async function action(kind:'agent-chat'|'agent-apply'|'agent-undo',run:Run){
  if(locked.current)return;locked.current=true;setBusy(run.id);setError('');
  try{
   const data=await invoke(kind,{runId:run.id,...(kind==='agent-chat'?{message:run.message,mode:run.mode,model:run.requested_model??'openrouter/free',conversationId:run.conversation_id??null}:{})});
   if(active.current)setRuns(current=>current.some(r=>r.id===run.id)?current.map(r=>r.id===run.id?data.run:r):[...current,data.run]);
   if(data.run.state==='applied'||data.run.state==='undone'){onRefresh();await features.load();}
   await list().catch(()=>{});
  }catch(e){if(active.current)setError((e as Error).message);await load().catch(()=>{});if(active.current&&selection.current===conversationKey(run.conversation_id))setRuns(current=>current.some(r=>r.id===run.id)?current.map(r=>r.id===run.id&&r.state==='processing'?{...r,state:'error',error:(e as Error).message}:r):[...current,{...run,state:'error',error:(e as Error).message}]);}
  finally{locked.current=false;if(active.current)setBusy('');}
 }
 function send(){if(!text.trim()||locked.current||loading||!selected||!features.ai?.has_key)return;const run:Run={id:crypto.randomUUID(),conversation_id:selected==='legacy'?null:selected,message:text.trim(),mode:'execute',state:'processing',response:'',model:null,requested_model:model,error:null,operations:[],created_at:new Date().toISOString()};setRuns(current=>[...current,run]);setText('');void action('agent-chat',run);}
 function showValue(key:string,value:unknown){if(value===null)return 'Remover';if(key==='archived_at')return 'Arquivar';if(key==='archived')return value?'Arquivar':'Restaurar';if(key==='label_ids')return (value as string[]).map(id=>features.labels.find(l=>l.id===id)?.name??runs.flatMap(r=>r.operations).find(o=>o.id===id)?.title??'Label').join(', ')||'Sem labels';return values[String(value)]??String(value);}
 const references:Record<string,string>={},prefixes=new Map<string,Set<string>>();
 const reference=(id:string,title:string)=>{const key=id.toLowerCase();references[key]=title;const prefix=key.slice(0,8);if(!prefixes.has(prefix))prefixes.set(prefix,new Set());prefixes.get(prefix)!.add(key);};
 for(const run of runs){for(const match of run.response.matchAll(/\[([^\]]+)\]\((?:task|label):([0-9a-f-]{36})\)/gi))reference(match[2],match[1]);for(const op of run.operations)reference(op.id,op.title);}
 for(const label of features.labels)reference(label.id,label.name);
 for(const [prefix,ids] of prefixes)if(ids.size===1)references[prefix]=references[[...ids][0]];
 const current=conversations.find(c=>conversationKey(c.conversation_id)===selected);
 const title=current?.title??runs[0]?.message??'Nova conversa';
 const canManage=!!current?.conversation_id;
 function startRename(){setRenameText(current?.title??'');setRenaming(true);}
 async function saveRename(){
  const id=selected,value=renameText.trim();
  setRenaming(false);
  if(!canManage||value===current?.title)return;
  try{await ensure(supabase.rpc('torre_agent_conversation_rename',{p_conversation:id,p_title:value}));setSearch('');await list(0,'');}
  catch{setError('Não foi possível renomear a conversa. Tente novamente.');}
 }
 async function archive(archived:boolean){
  const id=selected;
  if(!canManage||locked.current)return;
  try{
   await ensure(supabase.rpc('torre_agent_conversation_archive',{p_conversation:id,p_archived:archived}));
   if(archived){const items=await list(0,search,false);selectConversation(items.length?conversationKey(items[0].conversation_id):crypto.randomUUID());}
   else setShowArchived(false);
  }catch{setError(archived?'Não foi possível arquivar a conversa. Tente novamente.':'Não foi possível restaurar a conversa. Tente novamente.');}
 }
 const suggestions=['Avalie minhas tarefas e explique o que merece atenção.','Quais tarefas estão atrasadas?','Revise minhas labels e sugira melhorias.'];
 const historyPanel=<AgentHistory ref={panel} dialog={phone} conversations={conversations} selected={selected} search={search} onSearch={setSearch} busy={!!busy||olderBusy} listBusy={listBusy} more={moreConversations} showArchived={showArchived} onToggleArchived={()=>{setSearch('');setShowArchived(v=>!v);}} onSelect={selectConversation} onNew={newConversation} onMore={()=>void list(conversations.length).catch(()=>setError('Não foi possível carregar mais conversas.'))}/>;
 return <section className={'agent-chat ag-chat'+(historyOpen?' history-open':'')} aria-label="Conversa com o agente" onKeyDown={e=>{if(e.key==='Escape'&&historyOpen){e.stopPropagation();closeHistory();}if(e.key==='Tab'&&historyOpen&&phone&&panel.current){const controls=Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input'));const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
  {phone?historyOpen&&<><button type="button" tabIndex={-1} className="ag-scrim" aria-label="Fechar histórico do agente" onClick={closeHistory}/>{historyPanel}</>:historyPanel}
  <div className="ag-workspace" inert={historyOpen&&phone}>
   <header className="ag-head">
    {phone&&<button ref={historyButton} type="button" className="btn btn-sm" aria-expanded={historyOpen} aria-controls="agent-conversations" onClick={()=>historyOpen?closeHistory():setHistoryOpen(true)}><PanelLeft size={16} aria-hidden="true"/>Histórico do agente</button>}
    {renaming?<input className="inp ag-rename" autoFocus aria-label="Nome da conversa" maxLength={90} value={renameText} onChange={e=>setRenameText(e.target.value)} onBlur={()=>void saveRename()} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.preventDefault();setRenaming(false);}}}/>:<h1 title={title}>{title}</h1>}
    {canManage&&!renaming&&<AgentConversationMenu archived={!!current?.archived_at} disabled={!!busy} onRename={startRename} onArchive={v=>void archive(v)}/>}
   </header>
   <div className="agent-history ag-scroll" aria-label="Histórico da conversa" aria-busy={loading||!!busy}><div className="ag-col">{loading?<p role="status" className="desc">Carregando conversa…</p>:<>
    {moreRuns&&<button type="button" className="btn btn-sm ag-older" disabled={olderBusy||!!busy} onClick={()=>{setOlderBusy(true);void load(true).catch(()=>setError('Não foi possível carregar pedidos anteriores.')).finally(()=>setOlderBusy(false));}}>{olderBusy?'Carregando…':'Carregar pedidos anteriores'}</button>}
    {!runs.length?<div className="ag-empty"><h2>Suas tarefas, em conversa</h2><p className="desc">Pergunte sobre suas tarefas ou peça uma mudança. Toda alteração passa por uma prévia antes de ser aplicada.</p><div className="ag-suggestions" aria-label="Sugestões de pedidos">{suggestions.map(s=><button type="button" key={s} className="btn" disabled={!!busy} onClick={()=>setText(s)}>{s}</button>)}</div></div>
    :runs.map(run=><AgentTurn key={run.id} run={run} working={busy===run.id} locked={!!busy} references={references} showValue={showValue} dismissed={dismissed.includes(run.id)} onDismiss={id=>setDismissed(ids=>[...ids,id])} onApply={r=>void action('agent-apply',r)} onUndo={r=>void action('agent-undo',r)} onRetry={r=>void action('agent-chat',r)} onTask={onTask} onLabel={onLabel} onSchedule={onSchedule}/>)}
   </>}<div ref={bottom}/></div></div>
   {!features.ai?.has_key&&<div className="ag-notice"><p>Cadastre sua chave OpenRouter para conversar com o agente.</p><button type="button" className="btn btn-sm" onClick={onSettings}>Configurar IA</button></div>}
   {error&&<div className="ag-notice" role="alert">{error}{!busy&&<button type="button" className="btn btn-sm" onClick={()=>{if(!selected){void initialize();return;}setLoading(true);setError('');void load().catch(()=>setError('Não foi possível carregar a conversa. Tente novamente.')).finally(()=>setLoading(false));}}>Atualizar conversa</button>}</div>}
   <AgentComposer text={text} onText={setText} onSend={send} model={model} onModel={v=>void chooseModel(v)} busy={!!busy} loading={loading} modelBusy={features.working} canSend={!!features.ai?.has_key&&!!selected}/>
  </div>
 </section>;
}
