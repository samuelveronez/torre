import {useState} from 'react';
import {ArrowRight,Check,ChevronDown,Copy,LoaderCircle} from 'lucide-react';
import Markdown,{defaultUrlTransform} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {agentFieldNames as fieldNames,remarkAgentPresentation} from '@/agentPresentation';
import type {Operation,Run} from './types';

type Handlers={onTask:(id:string)=>void;onLabel:(id:string)=>void;onSchedule?:(id:string)=>void};
const proposalState={ready:['Aguardando','b-a'],applied:['Aplicada','b-g'],undone:['Desfeita','b-s']} as const;

function AgentResponse({text,references,onTask,onLabel,onSchedule}:Handlers&{text:string;references:Record<string,string>}){
 return <div className="agent-response"><Markdown skipHtml remarkPlugins={[remarkGfm,[remarkAgentPresentation,{references}]]} urlTransform={url=>/^(task|label|schedule):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)?url:defaultUrlTransform(url)} components={{
  a:({href,children})=>{const ref=/^(task|label|schedule):([0-9a-f-]{36})$/i.exec(href??'');if(ref)return <button type="button" className="ref" onClick={()=>ref[1]==='task'?onTask(ref[2]):ref[1]==='schedule'?onSchedule?.(ref[2]):onLabel(ref[2])}>{children}</button>;return /^https?:\/\//i.test(href??'')?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>;},
  img:()=>null,table:({children})=><div className="agent-table-scroll"><table>{children}</table></div>
 }}>{text}</Markdown></div>;
}

function OperationRow({op,showValue}:{op:Operation;showValue:(key:string,value:unknown)=>string}){
 return <div className="ag-op">
  <div className="ag-op-title">{op.before?'Alterar':'Criar'} {op.entity==='task'?'tarefa':'label'}: {op.title}</div>
  {Object.entries(op.patch).map(([key,value])=>{
   const before=op.before?.[key];
   const changed=before!==undefined&&JSON.stringify(before)!==JSON.stringify(value);
   return <div className="ag-op-field" key={key}>
    <span className="desc">{fieldNames[key]??key}</span>
    {changed&&<><span className="ag-op-from">{showValue(key,before)}</span><ArrowRight size={14} aria-hidden="true"/></>}
    <strong>{showValue(key,value)}</strong>
   </div>;
  })}
 </div>;
}

type Props=Handlers&{
 run:Run;working:boolean;locked:boolean;references:Record<string,string>;
 showValue:(key:string,value:unknown)=>string;
 dismissed:boolean;onDismiss:(id:string)=>void;
 onApply:(run:Run)=>void;onUndo:(run:Run)=>void;onRetry:(run:Run)=>void;
};
/** One request and its answer: user bubble, unframed answer and, when there are changes, the proposal card. */
export function AgentTurn({run,working,locked,references,showValue,dismissed,onDismiss,onApply,onUndo,onRetry,onTask,onLabel,onSchedule}:Props){
 const [copied,setCopied]=useState(false);
 const state=proposalState[run.state as keyof typeof proposalState];
 async function copy(){try{await navigator.clipboard.writeText(run.response);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{setCopied(false);}}
 const pending=run.operations.length>0;
 return <article className="ag-turn">
  {run.mode==='analyze'&&<small className="desc ag-legacy">Somente consulta</small>}
  <div className="ag-user">{run.message}</div>
  <div className="ag-answer">
   {working?<p className="agent-working" role="status"><LoaderCircle size={16} aria-hidden="true"/> {run.state==='ready'?'Aplicando pedido…':run.state==='applied'?'Desfazendo…':'Consultando suas tarefas e labels…'}</p>:<>
    {run.response&&<AgentResponse text={run.response} references={references} onTask={onTask} onLabel={onLabel} onSchedule={onSchedule}/>}
    {run.response&&<div className="ag-tools"><button type="button" className="ico" aria-label={copied?'Resposta copiada':'Copiar resposta'} onClick={()=>void copy()}>{copied?<Check size={15} aria-hidden="true"/>:<Copy size={15} aria-hidden="true"/>}</button></div>}
    {pending&&run.state==='ready'&&dismissed&&<p className="desc" role="status">Proposta descartada. Nada foi alterado.</p>}
    {pending&&!(run.state==='ready'&&dismissed)&&<div className="ag-proposal">
     <details open={run.state==='ready'}>
      <summary><ChevronDown size={14} aria-hidden="true"/>Alterações propostas<span style={{flex:1}}/>{state&&<span className={'badge '+state[1]}>{state[0]}</span>}</summary>
      {run.operations.map(op=><OperationRow key={op.id} op={op} showValue={showValue}/>)}
     </details>
     {run.state==='ready'&&<div className="ag-proposal-foot"><button type="button" className="btn btn-sm" disabled={locked} onClick={()=>onDismiss(run.id)}>Descartar</button><button type="button" className="btn btn-p btn-sm" disabled={locked} onClick={()=>onApply(run)}>Aplicar pedido</button></div>}
    </div>}
    {pending&&run.state==='applied'&&<div className="ag-applied"><Check size={14} aria-hidden="true" color="var(--tc-b-g-fg)"/><span>Pedido aplicado: {run.operations.length} registro(s).</span><button type="button" className="btn btn-g btn-sm" aria-label="Desfazer pedido" disabled={locked} onClick={()=>onUndo(run)}>Desfazer</button>{run.operations.some(o=>o.entity==='task')&&<span className="desc" style={{fontSize:12}}>Desfazer não recria reservas.</span>}</div>}
    {pending&&run.state==='undone'&&<div className="ag-applied"><span>Pedido desfeito.</span></div>}
    {run.error&&<p role="alert" className="ag-error">{run.error}</p>}
    {(run.state==='error'||run.state==='processing')&&<button type="button" className="btn btn-sm" disabled={locked} onClick={()=>onRetry(run)}>Tentar novamente este pedido</button>}
   </>}
  </div>
 </article>;
}
