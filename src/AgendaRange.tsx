import {createContext,useContext,useState} from 'react';
export type AgendaRange={start:number;end:number};
export const defaultAgendaRange:AgendaRange={start:7,end:22};
export const AgendaRangeContext=createContext(defaultAgendaRange);
export const useAgendaRange=()=>useContext(AgendaRangeContext);
export function AgendaRangeSettings({range,onSave}:{range:AgendaRange;onSave:(range:AgendaRange)=>Promise<boolean>}){
 const [start,setStart]=useState(range.start),[end,setEnd]=useState(range.end),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const save=async(next:AgendaRange)=>{
  if(next.start>=next.end){setMessage('O fim deve ser posterior ao início.');return;}
  setBusy(true);
  try{setMessage(await onSave(next)?'Faixa de horários salva.':'Não foi possível salvar. Tente novamente.');}finally{setBusy(false);}
 };
 return <div><h3>Faixa de horários da agenda</h3><p>Aplicada à agenda, reservas e sugestões. A jornada continua sendo uma orientação para reservas manuais.</p><div className="toolbar"><label>Início<select disabled={busy} value={start} onChange={e=>{const value=Number(e.target.value);setStart(value);void save({start:value,end});}}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>)}</select></label><label>Fim<select disabled={busy} value={end} onChange={e=>{const value=Number(e.target.value);setEnd(value);void save({start,end:value});}}>{Array.from({length:24},(_,i)=><option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}:00</option>)}</select></label></div><p role="status">{message}</p></div>;
}
