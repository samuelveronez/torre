import {useState} from 'react';
import {Check} from 'lucide-react';
import {Sw} from '../ui-kit/Sw';
import {SectionHeader} from '../ui-kit/SectionHeader';

type Hours={enabled:boolean;start:number;end:number};
type Props={
 hours:Hours[];
 syncing:boolean;
 onChange:(update:(hours:Hours[])=>Hours[])=>Promise<boolean>;
};

// Índice = dia da semana (0 = domingo); a lista exibida começa na segunda.
const dayNames=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const displayOrder=[1,2,3,4,5,6,0];
const hourText=(value:number)=>`${String(value).padStart(2,'0')}:00`;

export function WorkHoursSection({hours,syncing,onChange}:Props){
 const [feedback,setFeedback]=useState('');
 const patch=(index:number,change:Partial<Hours>)=>void onChange(list=>list.map((item,i)=>i===index?{...item,...change}:item));
 const copyMonday=()=>{
  setFeedback('');
  void onChange(list=>list.map((h,i)=>i>=2&&i<=5?{...h,start:list[1].start,end:list[1].end}:h)).then(saved=>setFeedback(saved?'Horário de segunda aplicado e salvo.':'Não foi possível salvar. Tente novamente.'));
 };
 return <>
  <SectionHeader title="Jornada de trabalho" description="Quando a IA e as reservas podem usar seu tempo." action={<button className="btn btn-sm" disabled={syncing||!hours[1].enabled} onClick={copyMonday}>Copiar segunda para ter–sex</button>}/>
  <div className="tbl">
   {displayOrder.map((index,row)=>{
    const h=hours[index];
    const name=dayNames[index];
    const dim=h.enabled?1:.55;
    return <div className="tr" key={index} style={row===0?{borderTop:0}:undefined}>
     <Sw checked={h.enabled} label={name} onChange={enabled=>patch(index,{enabled})}/>
     <span className="tc-fixed" style={{width:84,fontWeight:500,opacity:dim}}>{name}</span>
     <input className="inp" style={{width:104,opacity:dim}} aria-label={`Início ${name}`} type="time" step="3600" disabled={!h.enabled} value={hourText(h.start)} onChange={e=>{const n=Number(e.target.value.slice(0,2));if(n<h.end)patch(index,{start:n});}}/>
     <span className="desc" style={{opacity:dim}}>até</span>
     <input className="inp" style={{width:104,opacity:dim}} aria-label={`Fim ${name}`} type="time" step="3600" disabled={!h.enabled} value={hourText(h.end)} onChange={e=>{const n=Number(e.target.value.slice(0,2));if(n>h.start)patch(index,{end:n});}}/>
     <span className="desc" style={{marginLeft:'auto'}}>{h.enabled?`${h.end-h.start} h`:'Sem jornada'}</span>
    </div>;
   })}
  </div>
  <p className="desc" role="status" style={{display:'flex',alignItems:'center',gap:6}}><Check size={14} color="#16a34a" aria-hidden="true"/>{feedback||'As alterações são salvas automaticamente.'}</p>
 </>;
}
