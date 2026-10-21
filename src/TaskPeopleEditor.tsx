import {useId} from 'react';

type Props={
 value:string;
 onChange:(value:string)=>void;
 people:{id:string;name:string}[];
 required?:boolean;
 label?:string;
 extras?:number;
};

export function TaskPersonField({value,onChange,people,required=false,label='Pessoa',extras=0}:Props){
 const base=useId();
 const trimmed=value.trim().toLocaleLowerCase('pt-BR');
 const known=people.some(p=>p.name.trim().toLocaleLowerCase('pt-BR')===trimmed);
 const hint=!trimmed
  ? 'Escolha alguém do cadastro ou digite um nome novo.'
  : known
   ? 'Pessoa do cadastro.'
   : 'Nome novo: será cadastrado ao salvar.';
 return <div className="f">
  <label className="lab" htmlFor={`${base}-person`}>{label}</label>
  <input id={`${base}-person`} className="inp" name="person" list={`${base}-list`} maxLength={180} required={required} autoComplete="off" value={value} onChange={e=>onChange(e.target.value)} placeholder="Digite ou escolha"/>
  <datalist id={`${base}-list`}>{people.map(p=><option key={p.id} value={p.name}/>)}</datalist>
  <span className="desc" style={{fontSize:12}}>{hint}{extras>0&&` Mais ${extras} vínculo(s) antigo(s) serão mantidos.`}</span>
 </div>;
}
