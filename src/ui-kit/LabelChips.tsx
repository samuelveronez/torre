import type {Label} from '../features';

type Props={labels:Label[];selected:string[];onChange:(value:string[])=>void};

// Labels como chips alternáveis (aria-pressed), como nos mockups de tarefa.
export function LabelChips({labels,selected,onChange}:Props){
 const visible=labels.filter(l=>!l.archived||selected.includes(l.id));
 const toggle=(id:string)=>onChange(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
 return <div role="group" aria-label="Labels" style={{display:'flex',flexWrap:'wrap',gap:6}}>
  {visible.map(l=><button key={l.id} type="button" className="chip" aria-pressed={selected.includes(l.id)} onClick={()=>toggle(l.id)}>
   <span className="dot" style={{background:l.color}}/>{l.name}{l.archived?' (arquivada)':''}
  </button>)}
  {!visible.length&&<span className="desc">Nenhuma label ainda. Crie em Configurações › Labels.</span>}
 </div>;
}
