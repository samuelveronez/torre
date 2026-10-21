import type {ThemeGroup} from './painelModel';

type Props={
 groups:ThemeGroup[];
 day:number;
 selected:string;
 onSelect:(id:string)=>void;
};

export function ThemesView({groups,day,selected,onSelect}:Props){
 if(!groups.length)return <div className="pn-themes"><p className="pn-empty">Nenhuma tarefa com estes filtros.</p></div>;
 return <div className="pn-themes">
  {groups.map(group=><section key={group.name} className="pn-theme pn-rise" aria-label={group.name}>
   <h3><i style={{background:group.color}}/>{group.name}<span>{group.tasks.length}{group.overdue?` · ${group.overdue} venc.`:''}</span></h3>
   <div className="pn-tiles">
    {group.tasks.map(task=>{
     const border=task.date!==null&&task.date<day?'var(--pn-orange)':task.date!==null&&task.date<=day+7?'var(--pn-blue)':group.color;
     return <button key={task.id} type="button" className="pn-tile pn-tw" title={task.title} aria-label={task.title} aria-pressed={selected===task.id} style={{background:task.date!==null?group.color:'transparent',borderColor:border}} onClick={()=>onSelect(task.id)}/>;
    })}
   </div>
  </section>)}
  <div className="pn-legend">
   <span>■ cheio = com prazo</span>
   <span>□ vazado = sem data</span>
   <span style={{color:'var(--pn-orange)'}}>borda laranja = vencida</span>
   <span style={{color:'var(--pn-blue)'}}>borda azul = vence em 7 dias</span>
  </div>
 </div>;
}
