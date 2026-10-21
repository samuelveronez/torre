import {useId,useState} from 'react';

type Props={
 value:string;
 onChange:(value:string)=>void;
 people:{id:string;name:string}[];
 required?:boolean;
 label?:string;
 extras?:number;
 allowNew?:boolean;
};

const NEW='__new__';
const same=(a:string,b:string)=>a.trim().toLocaleLowerCase('pt-BR')===b.trim().toLocaleLowerCase('pt-BR');

/** Escolha de pessoa a partir do cadastro (o mesmo de Conversas); "Nova pessoa…" cadastra ao salvar. */
export function TaskPersonField({value,onChange,people,required=false,label='Pessoa',extras=0,allowNew=true}:Props){
 const base=useId();
 const registered=people.find(p=>same(p.name,value));
 const [creating,setCreating]=useState(false);
 const typing=allowNew&&(creating||(!!value.trim()&&!registered));
 const hint=typing
  ? 'Nome novo: será cadastrado em Conversas e pessoas ao salvar.'
  : people.length===0&&!allowNew
   ? 'Cadastre pessoas em Conversas para escolher aqui.'
   : 'Lista de Conversas e pessoas.';
 return <div className="f">
  <label className="lab" htmlFor={`${base}-person`}>{label}</label>
  <select id={`${base}-person`} className="inp" required={required&&!typing} value={typing?NEW:registered?.name??''} onChange={e=>{
   if(e.target.value===NEW){setCreating(true);onChange('');return;}
   setCreating(false);
   onChange(e.target.value);
  }}>
   <option value="">{required?'Selecione':'Ninguém'}</option>
   {people.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
   {allowNew&&<option value={NEW}>+ Nova pessoa…</option>}
  </select>
  {typing&&<input className="inp" aria-label="Nome da nova pessoa" name="person" maxLength={180} required={required} autoFocus={creating&&!value} autoComplete="off" value={value} onChange={e=>onChange(e.target.value)} placeholder="Nome da pessoa"/>}
  <span className="desc" style={{fontSize:12}}>{hint}{extras>0&&` Mais ${extras} vínculo(s) antigo(s) serão mantidos.`}</span>
 </div>;
}
