import type {snapshot} from './painelModel';

type Props={
 data:ReturnType<typeof snapshot>;
 headline:string;
};

export function Scoreboard({data,headline}:Props){
 const total=Math.max(1,data.all.length);
 const pct=(n:number)=>`${n/total*100}%`;
 const numbers=[
  {value:data.over.length,label:'vencidas',color:'var(--pn-orange)'},
  {value:data.soon.length,label:'vencem em 7 dias',color:'var(--pn-blue)'},
  {value:data.wait.length,label:'aguardando alguém',color:'var(--pn-ink)'},
  {value:data.undated.length,label:'sem data',color:'var(--pn-ink2)'},
 ];
 return <section className="pn-panel pn-score" aria-label="Placar">
  <div className="pn-nums">
   {numbers.map(item=><div key={item.label} className="pn-num"><b className="pn-tw" style={{color:item.color}}>{item.value}</b>{item.label}</div>)}
   <div className="pn-headline">{headline}</div>
  </div>
  <div className="pn-meter" role="img" aria-label="Proporção de vencidas, próximas e futuras">
   <div className="pn-tw" style={{width:pct(data.over.length),background:'var(--pn-orange)',boxShadow:'var(--pn-glow) var(--pn-orange)'}}/>
   <div className="pn-tw" style={{width:pct(data.soon.length),background:'var(--pn-blue)'}}/>
   <div className="pn-tw" style={{width:pct(data.later.length),background:'var(--pn-ink3)'}}/>
  </div>
 </section>;
}
