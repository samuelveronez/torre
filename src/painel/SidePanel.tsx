import {X} from 'lucide-react';
import {priorities} from '../priority';
import {dayLabel,NO_THEME,NO_THEME_COLOR,type PersonBlock,type PTask,type TimelineEvent} from './painelModel';
import {HOT_DAYS} from './BlocksView';

const short=(text:string,n:number)=>text.length>n?text.slice(0,n-1)+'…':text;

type Props={
 people:PersonBlock[];
 events:TimelineEvent[];
 colors:Map<string,string>;
 selected:PTask|undefined;
 day:number;
 onSelect:(id:string)=>void;
 onClose:()=>void;
 onOpen:(id:string)=>void;
 onComplete:(id:string)=>void;
 onPlan:(id:string)=>void;
};

export function SidePanel(props:Props){
 const {selected,day}=props;
 return <aside className="pn-panel pn-side right" aria-label="Quem me trava e detalhe">
  {selected?<Detail {...props} task={selected}/>:<Feed {...props}/>}
 </aside>;
}

function Feed({people,events,day,onSelect}:Props){
 const max=Math.max(1,...people.map(p=>p.sum));
 return <>
  <h2>Quem me trava</h2>
  <div className="pn-rank">
   {people.map(person=>{
    const color=person.days>=HOT_DAYS?'var(--pn-orange)':'var(--pn-blue)';
    return <div key={person.name}>
     <div className="row"><strong style={{fontWeight:600}}>{person.name}</strong><span className="pn-mono" style={{color}}>{person.days} d · {person.tasks.length}</span></div>
     <div className="track"><i className="pn-tw" style={{width:`${person.sum/max*100}%`,background:color}}/></div>
    </div>;
   })}
   {!people.length&&<p className="pn-hint">Ninguém aguardando.</p>}
  </div>
  <div className="pn-sep"/>
  <div className="pn-hd"><h2>Linha do tempo</h2><span className="pn-hint pn-mono">até {dayLabel(day)}</span></div>
  <div className="pn-events">
   {events.map((event,index)=><button key={event.task.id+event.kind+index} type="button" className="pn-event" onClick={()=>onSelect(event.task.id)}>
    <time>{event.when===day?'hoje':dayLabel(event.when)}</time>
    <span><b style={{color:event.kind==='Nova'?'var(--pn-blue)':'var(--pn-orange)'}}>{event.kind}</b> {short(event.task.title,54)}</span>
   </button>)}
  </div>
 </>;
}

function Detail({task,day,colors,onClose,onOpen,onComplete,onPlan}:Props&{task:PTask}){
 const late=task.date!==null&&task.date<day;
 const priority=priorities.find(p=>p.value===task.prio)?.label;
 const date=task.date===null?'Sem data':dayLabel(task.date)+(late?` · há ${day-task.date} dias`:task.date===day?' · hoje':` · em ${task.date-day} dias`);
 const action=task.who
  ?`Mandar cobrança para ${task.who}${late?' e propor nova data':''}`
  :late?'Concluir hoje ou replanejar com nova data'
  :task.date===null?'Definir um prazo ou descartar'
  :'Reservar 30 min na agenda antes do prazo';
 const labels=task.labels.length?task.labels:[NO_THEME];
 return <div className="pn-detail pn-rise">
  <div className="pn-hd" style={{alignItems:'center'}}>
   <span className="pn-hint pn-mono">TAREFA</span>
   <button type="button" aria-label="Fechar detalhe" onClick={onClose} style={{width:32,height:32,display:'inline-flex',alignItems:'center',justifyContent:'center',color:'var(--pn-ink2)'}}><X size={18} aria-hidden="true"/></button>
  </div>
  <h2>{task.title}</h2>
  <div className="pn-labels">{labels.map(name=><span key={name}><i style={{background:colors.get(name)??NO_THEME_COLOR}}/>{name}</span>)}</div>
  <dl className="pn-facts">
   <dt>Situação</dt><dd>{task.status==='waiting'?'Aguardando retorno':'A fazer'}</dd>
   <dt>Prioridade</dt><dd>{priority}</dd>
   <dt>{task.kind==='retorno'?'Retorno':'Prazo'}</dt><dd style={{color:late?'var(--pn-orange)':undefined}}>{date}</dd>
   <dt>Depende de</dt><dd>{task.who??'—'}</dd>
  </dl>
  <div className="pn-next" style={{borderColor:late?'var(--pn-orange)':'var(--pn-blue)'}}>
   <small>PRÓXIMO PASSO</small>
   <div style={{color:late?'var(--pn-orange)':'var(--pn-blue)'}}>{action}</div>
  </div>
  <div className="pn-actions">
   <button type="button" className="primary" onClick={()=>onComplete(task.id)}>Concluir</button>
   <button type="button" onClick={()=>onOpen(task.id)}>Abrir tarefa</button>
   {task.status==='todo'&&<button type="button" onClick={()=>onPlan(task.id)}>Reservar horário</button>}
  </div>
 </div>;
}
