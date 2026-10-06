import {useEffect,useRef,useState} from 'react';
import {Bot,Send,RotateCcw,Check,MessageSquare,LoaderCircle} from 'lucide-react';
import Markdown,{defaultUrlTransform} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {agentFieldNames as fieldNames,agentValues as values,remarkAgentPresentation} from './agentPresentation';
import {supabase} from './supabase';
import {ensure,invoke,type Features} from './features';
import './agent.css';

type Operation={entity:'task'|'label';id:string;title:string;before:Record<string,unknown>|null;patch:Record<string,unknown>};
type ModelChoice='openrouter/free'|'google/gemini-2.5-flash';
type Run={id:string;message:string;mode:'analyze'|'execute';state:'processing'|'ready'|'answered'|'applied'|'undone'|'error';response:string;model:string|null;requested_model:ModelChoice;error:string|null;operations:Operation[];created_at:string};
function modelName(model:string|undefined){return model==='google/gemini-2.5-flash'?'Gemini 2.5 Flash · pago':'OpenRouter · gratuito';}
function AgentResponse({text,references,onTask,onLabel}:{text:string;references:Record<string,string>;onTask:(id:string)=>void;onLabel:(id:string)=>void}){
 return <div className="agent-response"><Markdown skipHtml remarkPlugins={[remarkGfm,[remarkAgentPresentation,{references}]]} urlTransform={url=>/^(task|label):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)?url:defaultUrlTransform(url)} components={{
  a:({href,children})=>{const ref=/^(task|label):([0-9a-f-]{36})$/i.exec(href??'');if(ref)return <button type="button" className="agent-reference" onClick={()=>ref[1]==='task'?onTask(ref[2]):onLabel(ref[2])}>{children}</button>;return /^https?:\/\//i.test(href??'')?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>;},
  img:()=>null,table:({children})=><div className="agent-table-scroll"><table>{children}</table></div>
 }}>{text}</Markdown></div>;
}
export function AgentChat({userId,features,onRefresh,onTask,onLabel,onSettings}:{userId:string;features:Features;onRefresh:()=>void;onTask:(id:string)=>void;onLabel:(id:string)=>void;onSettings:()=>void}){
 const [runs,setRuns]=useState<Run[]>([]),[text,setText]=useState(''),[mode,setMode]=useState<'analyze'|'execute'>('analyze'),[busy,setBusy]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [model,setModel]=useState<ModelChoice>(()=>{try{return localStorage.getItem(`torre:${userId}:agent-model`)==='google/gemini-2.5-flash'?'google/gemini-2.5-flash':'openrouter/free';}catch{return 'openrouter/free';}});
 function chooseModel(value:string){const selected=value==='google/gemini-2.5-flash'?'google/gemini-2.5-flash':'openrouter/free';setModel(selected);try{localStorage.setItem(`torre:${userId}:agent-model`,selected);}catch{/* Selection still works when browser storage is unavailable. */}}
 const locked=useRef(false),bottom=useRef<HTMLDivElement>(null);const active=useRef(true);
 async function load(){const {data}=await ensure(supabase.from('torre_agent_runs').select('id,message,mode,state,response,model,requested_model,error,operations,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(30));if(active.current)setRuns((data??[]).reverse() as Run[]);}
 useEffect(()=>{active.current=true;void load().catch(()=>{if(active.current)setError('Não foi possível carregar o histórico. Tente novamente.');}).finally(()=>{if(active.current)setLoading(false);});return()=>{active.current=false;};},[userId]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[runs,busy]);
 async function action(kind:'agent-chat'|'agent-apply'|'agent-undo',run:Run){
  if(locked.current)return;locked.current=true;setBusy(run.id);setError('');
  try{
   const data=await invoke(kind,{runId:run.id,...(kind==='agent-chat'?{message:run.message,mode:run.mode,model:run.requested_model??'openrouter/free'}:{})});
   if(active.current)setRuns(current=>current.some(r=>r.id===run.id)?current.map(r=>r.id===run.id?data.run:r):[...current,data.run]);
   if(data.run.state==='applied'||data.run.state==='undone'){onRefresh();await features.load();}
  }catch(e){if(active.current)setError((e as Error).message);await load().catch(()=>{});}
  finally{locked.current=false;if(active.current)setBusy('');}
 }
 function send(){if(!text.trim()||locked.current)return;const run:Run={id:crypto.randomUUID(),message:text.trim(),mode,state:'processing',response:'',model:null,requested_model:model,error:null,operations:[],created_at:new Date().toISOString()};setRuns(current=>[...current,run]);setText('');void action('agent-chat',run);}
 function showValue(key:string,value:unknown){if(value===null)return 'Remover';if(key==='archived_at')return 'Arquivar';if(key==='archived')return value?'Arquivar':'Restaurar';if(key==='label_ids')return (value as string[]).map(id=>features.labels.find(l=>l.id===id)?.name??runs.flatMap(r=>r.operations).find(o=>o.id===id)?.title??'Label').join(', ')||'Sem labels';return values[String(value)]??String(value);}
 const references:Record<string,string>={},prefixes=new Map<string,Set<string>>();
 const reference=(id:string,title:string)=>{const key=id.toLowerCase();references[key]=title;const prefix=key.slice(0,8);if(!prefixes.has(prefix))prefixes.set(prefix,new Set());prefixes.get(prefix)!.add(key);};
 for(const run of runs){for(const match of run.response.matchAll(/\[([^\]]+)\]\((?:task|label):([0-9a-f-]{36})\)/gi))reference(match[2],match[1]);for(const op of run.operations)reference(op.id,op.title);}
 for(const label of features.labels)reference(label.id,label.name);
 for(const [prefix,ids] of prefixes)if(ids.size===1)references[prefix]=references[[...ids][0]];
 return <section className="agent-chat" aria-label="Conversa com o agente"><div className="agent-intro"><div className="agent-intro-icon"><Bot size={26}/></div><div><h2>Suas tarefas, em conversa</h2><p>Peça uma avaliação ou dê um comando para tarefas e labels. As análises consultam sua conta inteira, independentemente dos filtros da tela.</p></div><span className="agent-free">{modelName(model)}</span></div>
 <div className="agent-model-picker"><label>Modelo<select aria-label="Modelo da IA" aria-describedby="agent-model-description" value={model} disabled={!!busy} onChange={e=>chooseModel(e.target.value)}><option value="openrouter/free">OpenRouter gratuito</option><option value="google/gemini-2.5-flash">Gemini 2.5 Flash — pago</option></select></label><p id="agent-model-description">{model==='openrouter/free'?'Usa um modelo gratuito disponível no OpenRouter. A disponibilidade e a cota podem variar.':<>Gemini usa a mesma chave OpenRouter e cobra por tokens, consumindo o saldo da sua conta. <a href="https://openrouter.ai/google/gemini-2.5-flash" target="_blank" rel="noopener noreferrer">Consultar preços</a></>}</p></div>
 {!features.ai?.has_key&&<div className="notice"><p>Cadastre sua chave OpenRouter para conversar com o agente.</p><button onClick={onSettings}>Configurar IA</button></div>}
 <div className="agent-suggestions" aria-label="Sugestões de pedidos">{['Avalie minhas tarefas e explique o que merece atenção.','Quais tarefas estão atrasadas?','Revise minhas labels e sugira melhorias.'].map(s=><button key={s} disabled={!!busy} onClick={()=>{setMode('analyze');setText(s);}}><MessageSquare size={15}/>{s}</button>)}</div>
 <div className="agent-history" aria-label="Histórico da conversa" aria-busy={loading||!!busy}>{loading?<p role="status">Carregando conversa…</p>:!runs.length?<div className="agent-empty"><Bot size={32}/><p>Comece com uma pergunta sobre suas tarefas.</p><small>Use Executar pedido quando quiser criar ou alterar registros.</small></div>:runs.map(run=><article className="agent-turn" key={run.id}><div className="agent-user"><small>Você · {run.mode==='analyze'?'Analisar':'Executar pedido'} · {modelName(run.requested_model)}</small><p>{run.message}</p></div><div className="agent-answer"><small><Bot size={15}/> Agente</small>{busy===run.id?<p className="agent-working" role="status"><LoaderCircle size={16}/> {run.state==='ready'?'Aplicando pedido…':run.state==='applied'?'Desfazendo…':'Consultando suas tarefas e labels…'}</p>:<>
 {run.response&&<AgentResponse text={run.response} references={references} onTask={onTask} onLabel={onLabel}/>}
 {run.operations.length>0&&<><p className="agent-result" role="status">{run.state==='applied'?`Pedido aplicado: ${run.operations.length} registro(s).`:run.state==='undone'?'Pedido desfeito.':run.state==='ready'?'Proposta preparada. Confira as alterações antes de aplicar.':''}</p><details open={run.state==='ready'}><summary>{run.state==='ready'?'Revisar alterações':'Ver alterações'}</summary><ul className="agent-operations">{run.operations.map(op=><li key={op.id}><strong>{op.before?'Alterar':'Criar'} {op.entity==='task'?'tarefa':'label'}: {op.title}</strong><dl>{Object.entries(op.patch).map(([k,v])=><div key={k}><dt>{fieldNames[k]??k}</dt><dd>{showValue(k,v)}</dd></div>)}</dl></li>)}</ul></details>{run.state==='ready'&&<button className="primary" disabled={!!busy} onClick={()=>void action('agent-apply',run)}><Check size={16}/> Aplicar pedido</button>}{run.state==='applied'&&<><button disabled={!!busy} onClick={()=>void action('agent-undo',run)}><RotateCcw size={15}/> Desfazer pedido</button>{run.operations.some(o=>o.entity==='task')&&<small className="agent-footnote">Conclusões do Google ficam pendentes de sincronização. Desfazer não recria reservas e não reabre tarefas concluídas do Google.</small>}</> }</>}
 {run.error&&<p role="alert">{run.error}</p>}{(run.state==='error'||run.state==='processing')&&<button disabled={!!busy} onClick={()=>void action('agent-chat',run)}>Tentar novamente este pedido</button>}
 </>}</div></article>)}<div ref={bottom}/></div>
 {error&&<p className="notice" role="alert">{error}</p>}
 <form className="agent-composer" onSubmit={e=>{e.preventDefault();send();}}><label className="agent-mode">Modo<select aria-label="Modo da IA" value={mode} disabled={!!busy} onChange={e=>setMode(e.target.value as typeof mode)}><option value="analyze">Analisar</option><option value="execute">Executar pedido</option></select></label><label className="agent-input">Seu pedido<textarea rows={3} maxLength={4000} disabled={!!busy} value={text} onChange={e=>setText(e.target.value)} placeholder={mode==='analyze'?'O que merece minha atenção hoje?':'Crie uma label Financeiro e aplique à tarefa Pagar aluguel'} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();send();}}}/></label><button type="submit" className="primary" disabled={!!busy||!text.trim()||!features.ai?.has_key}><Send size={17}/>{busy?'Aguarde…':'Enviar'}</button><small>{mode==='analyze'?'Analisar consulta seus dados e responde sem fazer alterações.':'Executar pedido aplica comandos claros. Arquivamentos em lote passam por uma prévia.'} Ctrl/⌘ + Enter para enviar.</small></form></section>;
}
