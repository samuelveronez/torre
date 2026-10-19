import {useEffect,useState} from 'react';
import {invoke,type Features} from './features';

export function AiModelSettings({features}:{features:Features}){
 const current=features.ai?.default_model||'openrouter/free';
 const [selected,setSelected]=useState(current),[feedback,setFeedback]=useState('');
 useEffect(()=>{setSelected(current);},[current]);
 const save=()=>{
  setFeedback('');
  void features.run(()=>invoke('ai-default',{model:selected})).then(ok=>setFeedback(ok?'Modelo padrão salvo para toda a Torre.':'Não foi possível salvar o modelo padrão.'));
 };
 return <form onSubmit={e=>{e.preventDefault();save();}} style={{display:'flex',flexDirection:'column',gap:6}}>
  <label className="lab" htmlFor="ai-default-model">Modelo padrão de toda a aplicação</label>
  <select id="ai-default-model" className="inp" aria-label="Modelo padrão de toda a aplicação" value={selected} disabled={features.working} onChange={e=>{setSelected(e.target.value as typeof selected);setFeedback('');}}>
   <option value="openrouter/free">OpenRouter gratuito</option>
   <option value="google/gemini-2.5-flash">Gemini 2.5 Flash — pago</option>
  </select>
  <p className="desc">Vale para Modo IA, classificação em lote, conversas, planejamento e resumos do Telegram. Capturas têm seleção própria no campo de texto.</p>
  {selected==='google/gemini-2.5-flash'&&<p className="desc">Gemini usa a mesma chave OpenRouter e cobra por tokens. <a href="https://openrouter.ai/google/gemini-2.5-flash" target="_blank" rel="noreferrer" style={{color:'var(--primary)'}}>Consultar preços</a></p>}
  <div style={{display:'flex',alignItems:'center',gap:12}}>
   <button className="btn" disabled={features.working||selected===current}>Salvar modelo padrão</button>
   <p className="desc" role="status">{feedback}</p>
  </div>
 </form>;
}
