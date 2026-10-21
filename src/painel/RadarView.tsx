import {dayLabel,type PTask} from './painelModel';

const W=760;
const H=620;
const CX=380;
const CY=340;
const R=260;
const BASE:Record<string,number>={high:250,medium:205,low:160,none:115};
const NAMES:Record<string,string>={high:'ALTA',medium:'MÉDIA',low:'BAIXA',none:'SEM PRIORIDADE'};
const SIZE:Record<string,number>={high:6,medium:4,low:2,none:0};
const short=(text:string,n:number)=>text.length>n?text.slice(0,n-1)+'…':text;

type Props={
 tasks:PTask[];
 undated:number;
 day:number;
 selected:string;
 onSelect:(id:string)=>void;
};

export function RadarView({tasks,undated,day,selected,onSelect}:Props){
 const stack:Record<string,number>={};
 const dated=tasks.filter(t=>t.date!==null);
 const late=dated.filter(t=>t.date!<day);
 const lateDeg=Math.min(170,Math.max(0,...late.map(t=>(day-t.date!)*8)));
 const rad=(deg:number)=>deg*Math.PI/180;
 const wedge=lateDeg>0?`M${CX} ${CY} L${CX+R*Math.sin(-rad(lateDeg))} ${CY-R*Math.cos(-rad(lateDeg))} A${R} ${R} 0 0 1 ${CX} ${CY-R}Z`:'';
 const sweep=`M${CX} ${CY} L${CX+R*Math.sin(-rad(30))} ${CY-R*Math.cos(-rad(30))} A${R} ${R} 0 0 1 ${CX} ${CY-R}Z`;
 const dots=dated.map(task=>{
  const offset=Math.max(-21,Math.min(21,task.date!-day));
  const key=offset+':'+task.prio;
  stack[key]=(stack[key]??0)+1;
  const radius=BASE[task.prio]+(stack[key]-1)*18;
  const angle=rad(offset*8);
  const overdue=task.date!<day;
  const color=overdue?'var(--pn-orange)':task.date!<=day+7?'var(--pn-blue)':'var(--pn-ink2)';
  const size=12+SIZE[task.prio];
  const chosen=selected===task.id;
  const title=`${task.title} · ${dayLabel(task.date!)}`;
  return {task,overdue,color,size,chosen,title,x:CX+radius*Math.sin(angle),y:CY-radius*Math.cos(angle)};
 });
 return <div className="pn-radar">
  <div className="pn-radar-box">
   <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
    {Object.keys(BASE).map(prio=><g key={prio}>
     <circle cx={CX} cy={CY} r={BASE[prio]} fill="none" stroke="var(--pn-line)" strokeDasharray="4 4"/>
     <text x={CX+6} y={CY-BASE[prio]-4}>{NAMES[prio]}</text>
    </g>)}
    <line x1={CX} y1={CY-R+20} x2={CX} y2={CY} stroke="var(--pn-ink2)" opacity=".5"/>
    <text x={CX-28} y={52} style={{fill:'var(--pn-ink)'}}>{dayLabel(day)}</text>
    <text x={60} y={CY-10} style={{fill:'var(--pn-orange)'}}>← VENCIDO</text>
    <text x={W-120} y={CY-10} style={{fill:'var(--pn-blue)'}}>PRÓXIMO →</text>
    {wedge&&<path d={wedge} fill="var(--pn-orange)" opacity=".16"/>}
    <path className="pn-spin" d={sweep} fill="var(--pn-blue)" opacity=".18"/>
   </svg>
   <div className="pn-undated" style={{left:`${(CX-50)/W*100}%`,top:`${(CY-50)/H*100}%`,width:`${100/W*100}%`,height:`${100/H*100}%`}}>
    <span style={{fontSize:24}}>{undated}</span>
    <small>sem data</small>
   </div>
   {dots.map(dot=><button key={dot.task.id} type="button" className="pn-dot pn-tw" title={dot.title} aria-label={dot.title} aria-pressed={dot.chosen} style={{left:`${dot.x/W*100}%`,top:`${dot.y/H*100}%`}} onClick={()=>onSelect(dot.task.id)}>
    {dot.overdue&&<span className="ring" style={{borderColor:dot.color}}/>}
    <span className="core" style={{left:-dot.size/2,top:-dot.size/2,width:dot.size,height:dot.size,background:dot.color,boxShadow:`var(--pn-glow) ${dot.color}${dot.chosen?',0 0 0 3px var(--pn-ink)':''}`}}/>
    {(dot.chosen||dot.task.date===day||dot.task.date===day+1)&&<span className="name">{short(dot.task.title,22)}</span>}
   </button>)}
  </div>
 </div>;
}
