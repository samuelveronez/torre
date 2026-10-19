import {priorities,type Priority} from './priority';
import {useState} from 'react';
import type {Task} from './task';
import type {Features} from './features';
export type BatchChange={kind:'area';value:Task['area']}|{kind:'priority';value:Priority}|{kind:'label';id:string;remove?:boolean}|{kind:'complete'}|{kind:'due';value:string}|{kind:'minutes';value:number}|{kind:'situation';value:'todo'|'waiting';waitingFor?:string;followUp?:string};
export function BulkActions({tasks,features,onClear,onApply,onClassify}:{tasks:Task[];features:Features;onClear:()=>void;onApply:(change:BatchChange)=>Promise<boolean>;onClassify:()=>Promise<boolean>}){
 const [area,setArea]=useState<Task['area']>('Pessoal');
 const [priority,setPriority]=useState<Priority>('none');
 const [action,setAction]=useState('label'),[label,setLabel]=useState(''),[date,setDate]=useState(''),[minutes,setMinutes]=useState(30),[situation,setSituation]=useState<'todo'|'waiting'>('todo'),[waitingFor,setWaitingFor]=useState(''),[followUp,setFollowUp]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!tasks.length)return null;
 const completed=tasks.some(t=>t.done);
 async function submit(){setError('');setBusy(true);try{if(action==='ai'){await onClassify();return;}if(action==='situation'&&completed)throw new Error('Ajuste a situação de tarefas em aberto.');const change:BatchChange=action==='area'?{kind:'area',value:area}:action==='priority'?{kind:'priority',value:priority}:action==='complete'?{kind:'complete'}:action==='due'?{kind:'due',value:date}:action==='minutes'?{kind:'minutes',value:minutes}:action==='situation'?{kind:'situation',value:situation,waitingFor,followUp}:{kind:'label',id:label,remove:action==='remove-label'};await onApply(change);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const field=(label:string,control:React.ReactNode,hint?:string)=><div className="f" style={{minWidth:150}}><label className="lab">{label}{control}</label>{hint&&<p className="desc" style={{fontSize:12}}>{hint}</p>}</div>;
 const sel="inp";
 return <form className="tc-card-s bulk-actions tc-bulk" aria-label="Ações em lote" onSubmit={e=>{e.preventDefault();void submit();}}>
  <fieldset disabled={busy||features.working} className="tc-fs" style={{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:12}}>
   <div style={{display:'flex',alignItems:'center',gap:8,alignSelf:'center'}}><strong>{tasks.length} selecionada(s)</strong><button type="button" className="btn btn-g btn-sm" onClick={onClear}>Limpar seleção</button></div>
   {field('Ação',<select className={sel} style={{marginTop:6}} value={action} onChange={e=>{setAction(e.target.value);setError('');}}><option value="label">Adicionar label</option><option value="remove-label">Retirar label</option><option value="ai">Classificar labels por IA</option><option value="complete">Concluir</option><option value="due">Ajustar prazo</option><option value="priority">Ajustar prioridade</option><option value="area">Alterar área</option><option value="minutes">Ajustar duração</option><option value="situation">Ajustar situação</option></select>)}
   {['label','remove-label'].includes(action)&&field('Label',<select className={sel} style={{marginTop:6}} required value={label} onChange={e=>setLabel(e.target.value)}><option value="">Selecione</option>{features.labels.filter(l=>!l.archived).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>)}
   {action==='area'&&field('Área',<select className={sel} style={{marginTop:6}} value={area} onChange={e=>setArea(e.target.value as Task['area'])}><option>Pessoal</option><option>Profissional</option></select>,'Ao mudar de área, a reserva existente será retirada.')}
   {action==='priority'&&field('Prioridade',<select className={sel} style={{marginTop:6}} value={priority} onChange={e=>setPriority(e.target.value as Priority)}>{priorities.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>)}
   {action==='due'&&field('Prazo',<input className={sel} style={{marginTop:6}} type="date" value={date} onChange={e=>setDate(e.target.value)}/>,'Vazio retira o prazo.')}
   {action==='minutes'&&field('Duração (min)',<input className={sel} style={{marginTop:6}} type="number" min={5} max={480} step={5} required value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/>,'Reservas existentes serão retiradas.')}
   {action==='situation'&&<>
    {field('Situação',<select className={sel} style={{marginTop:6}} value={situation} onChange={e=>setSituation(e.target.value as 'todo'|'waiting')}><option value="todo">A fazer</option><option value="waiting">Aguardando retorno</option></select>)}
    {situation==='waiting'&&<>
     {field('De quem depende?',<input className={sel} style={{marginTop:6}} required maxLength={180} value={waitingFor} onChange={e=>setWaitingFor(e.target.value)}/>)}
     {field('Acompanhar em',<input className={sel} style={{marginTop:6}} required type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}/>)}
    </>}
   </>}
   {action==='ai'&&<p className="desc" style={{alignSelf:'center'}}>A IA acrescenta somente labels existentes, preservando as atuais. Até 20 tarefas por vez.</p>}
   <button className="btn btn-p" disabled={action==='ai'&&(!features.ai?.enabled||tasks.length>20)||action==='situation'&&completed}>{busy?'Aplicando…':action==='ai'?'Classificar por IA':'Aplicar'}</button>
  </fieldset>
  {error&&<p role="alert" className="desc" style={{color:'var(--tc-danger)',marginTop:8}}>{error}</p>}
 </form>;
}
