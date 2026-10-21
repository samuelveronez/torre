import {Pause,Play} from 'lucide-react';
import {dayKey,dayLabel} from './painelModel';

type Props={
 days:{day:number;due:number}[];
 day:number;
 today:number;
 playing:boolean;
 onDay:(day:number)=>void;
 onToday:()=>void;
 onPlay:()=>void;
};

export function Scrubber({days,day,today,playing,onDay,onToday,onPlay}:Props){
 const isToday=day===today;
 const simulation=isToday?'hoje':day>today?'futuro: se nada for feito':'passado';
 const simulationColor=isToday?'var(--pn-green)':day>today?'var(--pn-blue)':'var(--pn-ink2)';
 return <section className="pn-panel pn-scrub" aria-label="Simular outro dia">
  <button type="button" className="pn-play" aria-label={playing?'Pausar':'Reproduzir'} onClick={onPlay}>{playing?<Pause size={14} aria-hidden="true"/>:<Play size={14} aria-hidden="true"/>}</button>
  <div className="pn-now"><b>{dayLabel(day)}</b><span style={{color:simulationColor}}>{simulation}</span></div>
  <div className="pn-days">
   {days.map(item=>{
    const selected=item.day===day;
    const tip=dayLabel(item.day)+(item.due?` · ${item.due} prazos`:'');
    return <button key={item.day} type="button" className="pn-day" title={tip} aria-label={tip} aria-pressed={selected} onClick={()=>onDay(item.day)}>
     <i className="pn-tw" style={{height:3+item.due*7,background:item.day<today?'var(--pn-orange)':'var(--pn-blue)',opacity:selected?1:.45}}/>
     <span style={{color:selected?'var(--pn-ink)':item.day===today?'var(--pn-blue)':'var(--pn-ink3)',fontWeight:selected||item.day===today?700:400}}>{Number(dayKey(item.day).slice(8,10))}</span>
    </button>;
   })}
  </div>
  <button type="button" className="pn-today" onClick={onToday}>Hoje</button>
 </section>;
}
