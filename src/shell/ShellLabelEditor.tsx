import {useState} from 'react';
import type {Label} from '../features';

export type LabelDraft=Pick<Label,'name'|'description'|'color'|'area'>;
type Props={
 label:Label|null;
 defaultArea:string;
 busy:boolean;
 error:string;
 onSave:(value:LabelDraft)=>Promise<void>;
 onCancel:()=>void;
 onArchive:()=>Promise<void>;
};

const palette=['#0176d3','#8755ad','#15803d','#b45309','#b91c1c','#0e7490','#be185d','#52525b'];

export function ShellLabelEditor({label,defaultArea,busy,error,onSave,onCancel,onArchive}:Props){
 const [name,setName]=useState(label?.name??'');
 const [description,setDescription]=useState(label?.description??'');
 const [color,setColor]=useState(label?.color??palette[0]);
 const [saving,setSaving]=useState(false);
 const [localError,setLocalError]=useState('');
 const [area,setArea]=useState<NonNullable<Label['area']>>(label?.area??(label?'both':defaultArea==='Pessoal'?'personal':defaultArea==='Profissional'?'professional':'both'));
 const pending=busy||saving;
 const colors=palette.includes(color)?palette:[color,...palette];

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(pending)return;
  setLocalError('');
  if(!name.trim()){setLocalError('Digite um nome para a label.');return;}
  setSaving(true);
  try{await onSave({name:name.trim(),description:description.trim(),color,area});}
  catch(error){setLocalError((error as Error).message);}
  finally{setSaving(false);}
 };
 const archive=async()=>{
  if(pending)return;
  setLocalError('');
  setSaving(true);
  try{await onArchive();}
  catch(error){setLocalError((error as Error).message);}
  finally{setSaving(false);}
 };

 return <form className="tc-card" aria-label={label?'Editar label':'Criar label'} style={{padding:10,margin:'4px 0',display:'flex',flexDirection:'column',gap:8}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!pending)onCancel();}}} onSubmit={e=>void submit(e)}>
  <strong style={{fontSize:13}}>{label?'Editar label':'Nova label'}</strong>
  <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
   <label className="lab" style={{display:'flex',flexDirection:'column',gap:4,fontSize:13}}>Nome<input className="inp" autoFocus required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="lab" style={{display:'flex',flexDirection:'column',gap:4,fontSize:13}}>Descrição<textarea className="inp" rows={2} placeholder="Quando usar esta label" value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <label className="lab" style={{display:'flex',flexDirection:'column',gap:4,fontSize:13}}>Área
    <select className="inp" value={area} onChange={e=>setArea(e.target.value as typeof area)}>
     <option value="both">Ambas as áreas</option>
     <option value="personal">Pessoal</option>
     <option value="professional">Profissional</option>
    </select>
   </label>
   <div role="radiogroup" aria-label="Cor da label" style={{display:'flex',flexWrap:'wrap',gap:6}}>
    {colors.map(c=><button key={c} type="button" role="radio" aria-checked={color===c} aria-label={`Cor ${c}`} className="tc-swatch" style={{width:22,height:22,background:c,boxShadow:color===c?`0 0 0 2px ${c}`:'0 0 0 1px var(--border)'}} onClick={()=>setColor(c)}/>)}
   </div>
   <div style={{display:'flex',gap:6}}>
    <button className="btn btn-p btn-sm" type="submit">{pending?'Salvando…':label?'Salvar':'Criar'}</button>
    <button className="btn btn-sm" type="button" onClick={onCancel}>Cancelar</button>
   </div>
   {label&&<button className="btn btn-d btn-sm" type="button" onClick={()=>void archive()}>Arquivar label</button>}
  </fieldset>
  {(localError||error)&&<p className="desc" role="alert" style={{color:'var(--tc-danger)'}}>{localError||error}</p>}
 </form>;
}
