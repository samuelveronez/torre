import {priorities,type Priority} from './priority';
import {useId,useState} from 'react';
import {Hint} from './ui-kit/Hint';
import type {Task} from './task';
import type {Features} from './features';
export type BatchChange={kind:'area';value:Task['area']}|{kind:'priority';value:Priority}|{kind:'label';id:string;remove?:boolean}|{kind:'complete'}|{kind:'due';value:string}|{kind:'minutes';value:number}|{kind:'situation';value:'todo'|'waiting';waitingFor?:string;followUp?:string};
export function BulkActions({tasks,features,onClear,onApply,onClassify}:{tasks:Task[];features:Features;onClear:()=>void;onApply:(change:BatchChange)=>Promise<boolean>;onClassify:()=>Promise<boolean>}){
 const [area,setArea]=useState<Task['area']>('Pessoal');
 const [priority,setPriority]=useState<Priority>('none');
 const [action,setAction]=useState('label'),[label,setLabel]=useState(''),[date,setDate]=useState(''),[minutes,setMinutes]=useState(30),[situation,setSituation]=useState<'todo'|'waiting'>('todo'),[waitingFor,setWaitingFor]=useState(''),[followUp,setFollowUp]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const base=useId();
 if(!tasks.length)return null;
 const completed=tasks.some(t=>t.done);
 async function submit(){setError('');setBusy(true);try{if(action==='ai'){await onClassify();return;}if(action==='situation'&&completed)throw new Error('Ajuste a situação de tarefas em aberto.');const change:BatchChange=action==='area'?{kind:'area',value:area}:action==='priority'?{kind:'priority',value:priority}:action==='complete'?{kind:'complete'}:action==='due'?{kind:'due',value:date}:action==='minutes'?{kind:'minutes',value:minutes}:action==='situation'?{kind:'situation',value:situation,waitingFor,followUp}:{kind:'label',id:label,remove:action==='remove-label'};await onApply(change);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const field=(key:string,label:string,control:(id:string)=>React.ReactNode,hint?:string)=><div className="f" style={{minWidth:150}}><div style={{display:'flex',alignItems:'center',gap:4,height:18}}><label className="lab" htmlFor={`${base}-${key}`}>{label}</label>{hint&&<Hint text={hint}/>}</div>{control(`${base}-${key}`)}</div>;
 return <form className="tc-card-s bulk-actions tc-bulk" aria-label="Ações em lote" onSubmit={e=>{e.preventDefault();void submit();}}>
  <fieldset disabled={busy||features.working} className="tc-fs" style={{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:12}}>
   <div style={{display:'flex',alignItems:'center',gap:8,height:36}}><strong>{tasks.length} selecionada(s)</strong><button type="button" className="btn btn-g btn-sm" onClick={onClear}>Limpar seleção</button></div>
   {field('action','Ação',id=><select id={id} className="inp" value={action} onChange={e=>{setAction(e.target.value);setError('');}}><option value="label">Adicionar label</option><option value="remove-label">Retirar label</option><option value="ai">Classificar labels por IA</option><option value="complete">Concluir</option><option value="due">Ajustar prazo</option><option value="priority">Ajustar prioridade</option><option value="area">Alterar área</option><option value="minutes">Ajustar duração</option><option value="situation">Ajustar situação</option></select>,action==='ai'?'A IA acrescenta somente labels existentes, preservando as atuais. Até 20 tarefas por vez.':undefined)}
   {['label','remove-label'].includes(action)&&field('label','Label',id=><select id={id} className="inp" required value={label} onChange={e=>setLabel(e.target.value)}><option value="">Selecione</option>{features.labels.filter(l=>!l.archived).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>)}
   {action==='area'&&field('area','Área',id=><select id={id} className="inp" value={area} onChange={e=>setArea(e.target.value as Task['area'])}><option>Pessoal</option><option>Profissional</option></select>,'Ao mudar de área, a reserva existente será retirada.')}
   {action==='priority'&&field('priority','Prioridade',id=><select id={id} className="inp" value={priority} onChange={e=>setPriority(e.target.value as Priority)}>{priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>)}
   {action==='due'&&field('due','Prazo',id=><input id={id} className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/>,'Vazio retira o prazo.')}
   {action==='minutes'&&field('minutes','Duração (min)',id=><input id={id} className="inp" type="number" min={5} max={480} step={5} required value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/>,'Reservas existentes serão retiradas.')}
   {action==='situation'&&<>
    {field('situation','Situação',id=><select id={id} className="inp" value={situation} onChange={e=>setSituation(e.target.value as 'todo'|'waiting')}><option value="todo">A fazer</option><option value="waiting">Aguardando retorno</option></select>)}
    {situation==='waiting'&&<>
     {field('waitingFor','De quem depende?',id=><><input id={id} className="inp" required maxLength={180} list={`${id}-list`} autoComplete="off" value={waitingFor} onChange={e=>setWaitingFor(e.target.value)}/><datalist id={`${id}-list`}>{features.people.map(p=><option key={p.id} value={p.name}/>)}</datalist></>)}
     {field('followUp','Acompanhar em',id=><input id={id} className="inp" required type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}/>)}
    </>}
   </>}
   <button className="btn btn-p" disabled={action==='ai'&&(!features.ai?.enabled||tasks.length>20)||action==='situation'&&completed}>{busy?'Aplicando…':action==='ai'?'Classificar por IA':'Aplicar'}</button>
  </fieldset>
  {error&&<p role="alert" className="desc" style={{color:'var(--tc-danger)',marginTop:8}}>{error}</p>}
 </form>;
}
