import {useId} from 'react';
import {Plus,Trash2} from 'lucide-react';
import type {TaskPerson} from './task';

type Props={value:TaskPerson[];onChange:(value:TaskPerson[])=>void;people:{id:string;name:string}[]};

export function TaskPeopleEditor({value,onChange,people}:Props){
 const base=useId();
 const patch=(index:number,change:Partial<TaskPerson>)=>onChange(value.map((x,j)=>index===j?{...x,...change}:x));
 return <fieldset className="task-people-editor" style={{border:0,margin:0,padding:0,minWidth:0,display:'flex',flexDirection:'column',gap:10}}>
  <legend className="lab" style={{padding:0,marginBottom:10}}>Envolvidos</legend>
  {value.map((p,i)=><div className="tc-card" key={i} style={{padding:12,display:'flex',flexDirection:'column',gap:10}}>
   <div className="f">
    <label className="lab" htmlFor={`${base}-name-${i}`}>Nome ou equipe</label>
    <input id={`${base}-name-${i}`} className="inp" maxLength={180} required value={p.name} onChange={e=>patch(i,{name:e.target.value,personId:null})}/>
   </div>
   <div className="tc-grid2">
    <div className="f">
     <label className="lab" htmlFor={`${base}-reg-${i}`}>Cadastro</label>
     <select id={`${base}-reg-${i}`} className="inp" aria-label="Cadastro" value={p.personId??''} onChange={e=>patch(i,{personId:e.target.value||null})}>
      <option value="">Nome livre · sem vínculo</option>
      {people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}
     </select>
    </div>
    <div className="f">
     <label className="lab" htmlFor={`${base}-role-${i}`}>Participação</label>
     <select id={`${base}-role-${i}`} className="inp" value={p.role} onChange={e=>patch(i,{role:e.target.value as TaskPerson['role']})}>
      <option value="involved">Envolvido</option>
      <option value="waiting_for">De quem aguardo</option>
     </select>
    </div>
   </div>
   <button type="button" className="btn btn-g btn-sm btn-d" style={{alignSelf:'flex-start'}} onClick={()=>onChange(value.filter((_,j)=>j!==i))}><Trash2 size={14} aria-hidden="true"/>Remover pessoa</button>
  </div>)}
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <button type="button" className="btn btn-g btn-sm" style={{color:'var(--primary)'}} onClick={()=>onChange([...value,{name:'',personId:null,role:'involved'}])}><Plus size={14} aria-hidden="true"/>Adicionar pessoa ou equipe</button>
   <span className="desc" style={{fontSize:12}}>Você pode manter nomes que ainda não estão cadastrados.</span>
  </div>
 </fieldset>;
}
