import {createContext,useContext,useState} from 'react';
export type AgendaRange={start:number;end:number};
export const defaultAgendaRange:AgendaRange={start:7,end:22};
export const AgendaRangeContext=createContext(defaultAgendaRange);
export const useAgendaRange=()=>useContext(AgendaRangeContext);
export function AgendaRangeSettings({range,onSave}:{range:AgendaRange;onSave:(range:AgendaRange)=>Promise<boolean>}){
 const [start,setStart]=useState(range.start),[end,setEnd]=useState(range.end),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();if(start>=end){setMessage('O fim deve ser posterior ao início.');return;}setBusy(true);try{setMessage(await onSave({start,end})?'Faixa de horários salva.':'Não foi possível salvar. Tente novamente.');}finally{setBusy(false);}}}><h3>Faixa de horários da agenda</h3><p>Aplicada à agenda, reservas e sugestões. A jornada continua sendo uma orientação para reservas manuais.</p><div className="toolbar"><label>Início<select value={start} onChange={e=>setStart(Number(e.target.value))}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>)}</select></label><label>Fim<select value={end} onChange={e=>setEnd(Number(e.target.value))}>{Array.from({length:24},(_,i)=><option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}:00</option>)}</select></label><button disabled={busy}>{busy?'Salvando…':'Salvar faixa'}</button></div><p role="status">{message}</p></form>;
}
