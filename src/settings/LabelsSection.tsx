import {useState} from 'react';
import {GripVertical,MoreHorizontal,Plus,X} from 'lucide-react';
import type {Label} from '../features';
import {SectionHeader} from '../ui-kit/SectionHeader';
import {Feedback} from './Feedback';
import type {SettingsActions} from './useSettingsActions';

type Props={labels:Label[];counts:Record<string,number>;actions:SettingsActions;busy:boolean};
type Area=NonNullable<Label['area']>;
type Draft={id?:string;name:string;description:string;color:string;area:Area};

const palette=[
 {name:'Azul',color:'#0176d3'},
 {name:'Roxo',color:'#8755ad'},
 {name:'Verde',color:'#15803d'},
 {name:'Âmbar',color:'#b45309'},
 {name:'Vermelho',color:'#b91c1c'},
 {name:'Ciano',color:'#0e7490'},
 {name:'Rosa',color:'#be185d'},
 {name:'Cinza',color:'#52525b'},
];
const areaNames:Record<Area,string>={both:'Ambas',personal:'Pessoal',professional:'Profissional'};
const emptyDraft:Draft={name:'',description:'',color:palette[0].color,area:'both'};

export function LabelsSection({labels,counts,actions,busy}:Props){
 const [draft,setDraft]=useState<Draft|null>(null);
 const [menuId,setMenuId]=useState('');
 const [showArchived,setShowArchived]=useState(false);
 const active=labels.filter(l=>!l.archived);
 const archived=labels.filter(l=>l.archived);
 const edit=(label:Label)=>{setMenuId('');setDraft({id:label.id,name:label.name,description:label.description,color:label.color,area:label.area??'both'});};
 const save=async()=>{
  if(!draft||!draft.name.trim())return;
  const value={name:draft.name.trim(),description:draft.description,color:draft.color,area:draft.area};
  const ok=draft.id?await actions.patch('torre_labels',draft.id,value):await actions.insert('torre_labels',value);
  if(ok)setDraft(null);
 };
 const archive=async(id:string,value:boolean)=>{setMenuId('');if(await actions.patch('torre_labels',id,{archived:value})&&draft?.id===id)setDraft(null);};
 const colors=draft&&!palette.some(p=>p.color===draft.color)?[{name:'Personalizada',color:draft.color},...palette]:palette;

 return <>
  <SectionHeader title="Labels" description="Organize tarefas por assunto. Arraste para mudar a ordem no menu." action={<button className="btn btn-p" disabled={busy||draft!==null} onClick={()=>setDraft(emptyDraft)}><Plus size={16} aria-hidden="true"/>Nova label</button>}/>
  <Feedback message={actions.message} failed={actions.failed}/>
  <div className="tbl">
   <div className="th tc-hide-m">
    <span style={{width:16}}/>
    <span style={{flex:1}}>Label</span>
    <span style={{width:110}}>Área</span>
    <span style={{width:60,textAlign:'right'}}>Tarefas</span>
    <span style={{width:32}}/>
   </div>
   {active.map(l=><div className="tr" key={l.id} style={draft?.id===l.id?{background:'var(--muted)'}:undefined}>
    <GripVertical className="tc-hide-m" size={16} color="#a1a1aa" aria-hidden="true"/>
    <div className="tc-grow" style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
     <span style={{width:12,height:12,borderRadius:'50%',background:l.color,flex:'0 0 auto'}}/>
     <div style={{minWidth:0}}>
      <div style={{fontWeight:500}}>{l.name}</div>
      {l.description&&<p className="desc" style={{fontSize:12}}>{l.description}</p>}
     </div>
    </div>
    <span style={{width:110}}><span className="badge">{areaNames[l.area??'both']}</span></span>
    <span style={{width:60,textAlign:'right',color:'var(--muted-foreground)'}}>{counts[l.id]??0}</span>
    <span style={{position:'relative',width:32}}>
     <button className="btn btn-g btn-sm btn-i" aria-label={`Ações de ${l.name}`} aria-expanded={menuId===l.id} onClick={()=>setMenuId(menuId===l.id?'':l.id)}><MoreHorizontal size={16} aria-hidden="true"/></button>
     {menuId===l.id&&<div className="tc-menu" role="menu">
      <button role="menuitem" onClick={()=>edit(l)}>Editar</button>
      <button role="menuitem" className="danger" disabled={busy} onClick={()=>void archive(l.id,true)}>Arquivar</button>
     </div>}
    </span>
   </div>)}
   {!active.length&&<div className="tr"><p className="desc">Nenhuma label ainda. Crie a primeira em “Nova label”.</p></div>}
  </div>
  {draft&&<div role="group" aria-label={draft.id?'Editar label':'Nova label'} className="tc-card" style={{padding:16,display:'flex',flexDirection:'column',gap:14}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <div className="lab" style={{fontSize:15,fontWeight:600}}>{draft.id?`Editar label · ${labels.find(l=>l.id===draft.id)?.name??''}`:'Nova label'}</div>
    <button className="btn btn-g btn-sm btn-i" aria-label="Fechar" onClick={()=>setDraft(null)}><X size={16} aria-hidden="true"/></button>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 170px',gap:12}}>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
     <label className="lab" htmlFor="label-name">Nome</label>
     <input id="label-name" className="inp" required maxLength={60} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
     <label className="lab" htmlFor="label-area">Área</label>
     <select id="label-area" className="inp" value={draft.area} onChange={e=>setDraft({...draft,area:e.target.value as Area})}>
      <option value="professional">Profissional</option>
      <option value="personal">Pessoal</option>
      <option value="both">Ambas</option>
     </select>
    </div>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label className="lab" htmlFor="label-description">Quando usar esta label</label>
    <textarea id="label-description" className="inp" rows={2} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/>
    <p className="desc">A IA usa esta descrição para sugerir a label certa nas capturas.</p>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <span className="lab">Cor</span>
    <div role="radiogroup" aria-label="Cor da label" style={{display:'flex',flexWrap:'wrap',gap:8}}>
     {colors.map(c=><button key={c.color} type="button" role="radio" aria-checked={draft.color===c.color} aria-label={c.name} className="tc-swatch" style={{background:c.color,boxShadow:draft.color===c.color?`0 0 0 2px ${c.color}`:'0 0 0 1px var(--border)'}} onClick={()=>setDraft({...draft,color:c.color})}/>)}
    </div>
   </div>
   <hr className="sep"/>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
    {draft.id&&<button className="btn btn-d" disabled={busy} onClick={()=>void archive(draft.id!,true)}>Arquivar</button>}
    <span style={{flex:1}}/>
    <button className="btn" onClick={()=>setDraft(null)}>Cancelar</button>
    <button className="btn btn-p" disabled={busy||!draft.name.trim()} onClick={()=>void save()}>{draft.id?'Salvar label':'Criar label'}</button>
   </div>
  </div>}
  {archived.length>0&&<>
   <button className="btn btn-g btn-sm" style={{alignSelf:'flex-start'}} aria-expanded={showArchived} onClick={()=>setShowArchived(!showArchived)}>Arquivadas ({archived.length})</button>
   {showArchived&&<div className="tbl">
    {archived.map((l,i)=><div className="tr" key={l.id} style={i===0?{borderTop:0}:undefined}>
     <span style={{width:12,height:12,borderRadius:'50%',background:l.color,flex:'0 0 auto',opacity:.5}}/>
     <span style={{flex:1,color:'var(--muted-foreground)'}}>{l.name}</span>
     <button className="btn btn-sm" disabled={busy} onClick={()=>void archive(l.id,false)}>Restaurar</button>
    </div>)}
   </div>}
  </>}
 </>;
}
