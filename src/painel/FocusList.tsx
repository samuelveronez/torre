import {priorities} from '../priority';
import {dayLabel,type Focus} from './painelModel';

type Props={
 focus:Focus[];
 trend:{day:number;count:number}[];
 day:number;
 today:number;
 selected:string;
 onSelect:(id:string)=>void;
};

const short=(text:string,n:number)=>text.length>n?text.slice(0,n-1)+'…':text;
const priorityName=(value:string)=>priorities.find(p=>p.value===value)?.label??'';

export function FocusList({focus,trend,day,today,selected,onSelect}:Props){
 const max=Math.max(1,...trend.map(t=>t.count));
 return <section className="pn-panel pn-side" aria-label="Faça agora">
  <div className="pn-hd"><h2>Faça agora</h2><span className="pn-hint pn-mono">TOP 5</span></div>
  <div style={{marginTop:10}}>
   {focus.map(({task,verb,late})=>{
    const when=late?`venceu há ${day-task.date!} d`:task.date!==null?(task.date===day?'vence hoje':`vence ${dayLabel(task.date)}`):'sem data';
    return <button key={task.id} type="button" className={'pn-focus pn-rise'+(late?' late':'')} aria-pressed={selected===task.id} onClick={()=>onSelect(task.id)}>
     <b style={{color:late?'var(--pn-orange)':'var(--pn-blue)'}}>{verb}</b>
     <span>{short(task.title,62)}</span>
     <small>{when} · {priorityName(task.prio)} · {task.labels[0]??'sem tema'}</small>
    </button>;
   })}
   {!focus.length&&<p className="pn-empty">Nada pendente para este dia.</p>}
  </div>
  <div className="pn-trend">
   <div className="pn-hd"><strong style={{fontSize:13}}>Vencidas ao longo do tempo</strong><span className="pn-hint pn-mono">{dayLabel(trend[0].day)} → {dayLabel(trend[trend.length-1].day)}</span></div>
   <div className="pn-bars">
    {trend.map(item=><i key={item.day} className="pn-tw" title={`${dayLabel(item.day)}: ${item.count} vencidas`} style={{height:Math.max(2,item.count/max*90),background:item.day>today?'var(--pn-ink3)':'var(--pn-orange)',opacity:item.day===day?1:item.day>today?.6:.75}}/>)}
   </div>
   <div className="pn-note">Barras após hoje mostram o que vence se nada for feito.</div>
  </div>
 </section>;
}
