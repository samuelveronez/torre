import type {PersonBlock,PTask} from './painelModel';

export const HOT_DAYS=10;
const short=(text:string,n:number)=>text.length>n?text.slice(0,n-1)+'…':text;

type Props={
 people:PersonBlock[];
 day:number;
 selected:string;
 onSelect:(id:string)=>void;
 onCharge:(person:PersonBlock)=>void;
};

const age=(task:PTask,day:number)=>day-(task.date??task.created);

export function BlocksView({people,day,selected,onSelect,onCharge}:Props){
 const max=Math.max(1,...people.map(p=>p.sum));
 if(!people.length)return <div className="pn-blocks"><p className="pn-empty">Ninguém está travando você agora.</p></div>;
 return <div className="pn-blocks">
  {people.map(person=>{
   const hot=person.days>=HOT_DAYS;
   const color=hot?'var(--pn-orange)':'var(--pn-blue)';
   const diameter=54+person.sum/max*50;
   return <section key={person.name} className="pn-person pn-rise" aria-label={person.name}>
    <div className="pn-orb">
     {hot&&<span className="ping" style={{width:diameter,height:diameter,borderColor:color}}/>}
     <span className="body" style={{width:diameter,height:diameter,boxShadow:`var(--pn-glow) ${color}`}}>
      <b style={{color}}>{person.days}</b>
      <small>dias</small>
     </span>
    </div>
    <div style={{flex:1,minWidth:0}}>
     <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
      <h3>{person.name}</h3>
      <span className="pn-hint">{person.tasks.length} {person.tasks.length>1?'tarefas':'tarefa'} · {person.sum} dias somados</span>
      <button type="button" style={{marginLeft:'auto',fontSize:12,fontWeight:700,color}} onClick={()=>onCharge(person)}>{hot?'Cobrar em lote →':'Cobrar'}</button>
     </div>
     <div className="pn-pills">
      {person.tasks.map(task=><button key={task.id} type="button" className="pn-pill" aria-pressed={selected===task.id} title={task.title} onClick={()=>onSelect(task.id)}>
       <span className="pn-mono" style={{color:task.date!==null&&task.date<day?'var(--pn-orange)':'var(--pn-blue)'}}>{age(task,day)}d</span> · {short(task.title,44)}
      </button>)}
     </div>
    </div>
   </section>;
  })}
 </div>;
}
