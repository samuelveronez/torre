import {Switch} from '../components/ui/switch';

type Hours={enabled:boolean;start:number;end:number};
type Props={
 hours:Hours[];
 days:string[];
 syncing:boolean;
 copyFeedback:string;
 onChange:(update:(hours:Hours[])=>Hours[])=>Promise<boolean>;
 onCopyMonday:()=>void;
};

const hourText=(value:number)=>`${String(value).padStart(2,'0')}:00`;

export function WorkHoursSection({hours,days,syncing,copyFeedback,onChange,onCopyMonday}:Props){
 const patch=(index:number,change:Partial<Hours>)=>void onChange(list=>list.map((item,i)=>i===index?{...item,...change}:item));
 return <section className="card settings">
  <div className="card-head"><h2>Jornada de trabalho</h2></div>
  <div className="settings-body">
   <div className="hours-copy">
    <p>Copia os horários de segunda para terça a sexta. Os dias ativos permanecem iguais.</p>
    <button disabled={syncing||!hours[1].enabled} onClick={onCopyMonday}>Aplicar horário de segunda a sexta</button>
    <span role="status">{copyFeedback}</span>
   </div>
   {hours.map((h,i)=><div className="hours-row" key={i}>
    <label className="flex items-center gap-2"><Switch checked={h.enabled} onCheckedChange={enabled=>patch(i,{enabled})}/>{days[i]}</label>
    <input aria-label={`Início ${days[i]}`} type="time" step="3600" disabled={!h.enabled} value={hourText(h.start)} onChange={e=>{const n=Number(e.target.value.slice(0,2));if(n<h.end)patch(i,{start:n});}}/>
    <span>até</span>
    <input aria-label={`Fim ${days[i]}`} type="time" step="3600" disabled={!h.enabled} value={hourText(h.end)} onChange={e=>{const n=Number(e.target.value.slice(0,2));if(n>h.start)patch(i,{end:n});}}/>
   </div>)}
   <p>Alterações salvas automaticamente. Desative os dias sem trabalho. Os horários iniciais são exemplos.</p>
  </div>
 </section>;
}
