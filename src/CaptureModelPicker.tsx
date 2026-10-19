import {useId} from 'react';
import {captureProfileNames,type CaptureProfile} from './captureProfiles';

export function CaptureModelPicker({value,onChange,disabled=false}:{value:CaptureProfile;onChange:(profile:CaptureProfile)=>void;disabled?:boolean}){
 const id=useId();
 const hint=value==='free'?'Extração gratuita e decisões com Mercury. Sujeito a cotas.':value==='luna'?'Luna extrai tarefas, datas e pessoas; Decisions classifica. Cobra por tokens.':'Gemini extrai e classifica. Cobra por tokens.';
 return <div className="f capture-model-picker">
  <label className="lab" htmlFor={id}>Modelo desta captura</label>
  <select id={id} className="inp" aria-label="Modelo desta captura" value={value} disabled={disabled} onChange={e=>onChange(e.target.value as CaptureProfile)}>
   {Object.entries(captureProfileNames).map(([key,name])=><option value={key} key={key}>{name}</option>)}
  </select>
  <p className="desc">{hint} A escolha vale somente para esta captura. O padrão fica em Configurações › Inteligência artificial.</p>
 </div>;
}
