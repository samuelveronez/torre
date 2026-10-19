import {useState} from 'react';
import {Check} from 'lucide-react';
import type {AgendaRange} from '../AgendaRange';
import {Seg} from '../ui-kit/Seg';
import {SectionHeader} from '../ui-kit/SectionHeader';

type Props={
 theme:string;
 onTheme:(theme:'light'|'dark')=>void;
 density:string;
 onDensity:(density:'compact'|'comfortable')=>void;
 agendaRange:AgendaRange;
 onAgendaRange:(range:AgendaRange)=>Promise<boolean>;
};

const hourOptions=(from:number,to:number)=>Array.from({length:to-from+1},(_,i)=>from+i);
const hourText=(value:number)=>`${String(value).padStart(2,'0')}:00`;

export function AppearanceSection({theme,onTheme,density,onDensity,agendaRange,onAgendaRange}:Props){
 const [start,setStart]=useState(agendaRange.start),[end,setEnd]=useState(agendaRange.end),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const save=async(next:AgendaRange)=>{
  if(next.start>=next.end){setMessage('O fim deve ser posterior ao início.');return;}
  setBusy(true);
  try{setMessage(await onAgendaRange(next)?'Faixa de horários salva.':'Não foi possível salvar. Tente novamente.');}
  finally{setBusy(false);}
 };
 return <>
  <SectionHeader title="Aparência" description="Como a Torre é exibida. Fica salvo na sua conta."/>
  <div style={{display:'flex',flexWrap:'wrap',gap:24}}>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <span className="lab">Tema</span>
    <Seg label="Tema da aplicação" value={theme==='dark'?'dark':'light'} onChange={onTheme} options={[{value:'light',label:'Claro'},{value:'dark',label:'Escuro'}]}/>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <span className="lab">Densidade</span>
    <Seg label="Densidade da interface" value={density==='compact'?'compact':'comfortable'} onChange={onDensity} options={[{value:'compact',label:'Compacta'},{value:'comfortable',label:'Confortável'}]}/>
   </div>
  </div>
  <hr className="sep"/>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-end'}}>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label className="lab" htmlFor="agenda-start">Agenda começa às</label>
    <select id="agenda-start" className="inp" style={{width:120}} disabled={busy} value={start} onChange={e=>{const value=Number(e.target.value);setStart(value);void save({start:value,end});}}>
     {hourOptions(0,23).map(h=><option key={h} value={h}>{hourText(h)}</option>)}
    </select>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label className="lab" htmlFor="agenda-end">e termina às</label>
    <select id="agenda-end" className="inp" style={{width:120}} disabled={busy} value={end} onChange={e=>{const value=Number(e.target.value);setEnd(value);void save({start,end:value});}}>
     {hourOptions(1,24).map(h=><option key={h} value={h}>{hourText(h)}</option>)}
    </select>
   </div>
   <p className="desc" style={{paddingBottom:10}}>Faixa de horas mostrada em Meu dia e na Agenda semanal. Não altera sua jornada.</p>
  </div>
  <p className="desc" role="status" style={{display:'flex',alignItems:'center',gap:6}}><Check size={14} color="#16a34a" aria-hidden="true"/>{message||'As alterações são salvas automaticamente.'}</p>
 </>;
}
