import {useState} from 'react';
import {Landmark,Plus,Pencil,GripVertical} from 'lucide-react';
import type {Label} from '../features';
import {labelMatchesArea} from '../labelArea';
import {isTaskDrag,readTaskDrag} from '../taskDrag';
import {usePreference} from '../uiState';
import {navItems,type NavItem,type ShellCounts} from './navItems';
import {ShellLabelEditor,type LabelDraft} from './ShellLabelEditor';

type Props={
 userId:string;
 page:string;
 area:string;
 counts:ShellCounts;
 labels:Label[];
 labelFilter:string[];
 labelsBusy:boolean;
 labelError:string;
 onPage:(page:string)=>void;
 onLabel:(id:string)=>void;
 onDropLabel:(taskIds:string[],labelId:string)=>void;
 onSaveLabel:(value:LabelDraft,id?:string)=>Promise<boolean>;
 onArchiveLabel:(id:string)=>Promise<boolean>;
};

const iconSize=16;

export function Sidebar({userId,page,area,counts,labels,labelFilter,labelsBusy,labelError,onPage,onLabel,onDropLabel,onSaveLabel,onArchiveLabel}:Props){
 const [labelOrder,setLabelOrder]=usePreference<string[]>(userId,'sidebar-label-order',[]);
 const [dropLabel,setDropLabel]=useState('');
 const [draggingLabel,setDraggingLabel]=useState('');
 const [labelTarget,setLabelTarget]=useState<{id:string;after:boolean}|null>(null);
 const [editing,setEditing]=useState<Label|null|undefined>(undefined);

 const activeLabels=labels.filter(l=>!l.archived);
 const rank=(id:string)=>{const index=Array.isArray(labelOrder)?labelOrder.indexOf(id):-1;return index<0?Number.MAX_SAFE_INTEGER:index;};
 const allOrdered=[...activeLabels].sort((a,b)=>rank(a.id)-rank(b.id));
 const ordered=allOrdered.filter(label=>labelMatchesArea(label,area));

 const moveLabel=(id:string,target:string,after:boolean)=>{
  if(id===target)return;
  const ids=allOrdered.map(l=>l.id).filter(value=>value!==id);
  const index=ids.indexOf(target);
  if(index<0||!activeLabels.some(l=>l.id===id))return;
  ids.splice(index+(after?1:0),0,id);
  setLabelOrder(ids);
 };
 const moveByKey=(key:string,id:string)=>{
  const index=ordered.findIndex(item=>item.id===id);
  const target=ordered[index+(key==='ArrowUp'?-1:1)];
  if(target)moveLabel(id,target.id,key==='ArrowDown');
 };

 const navButton=(item:NavItem,count?:number)=>{
  const Icon=item.icon;
  const current=page===item.key;
  return <button key={item.key} className="nav" aria-label={item.label} title={item.label} aria-current={current?'page':undefined} style={current?{background:'var(--muted)',fontWeight:600}:undefined} onClick={()=>onPage(item.key)}>
   <Icon size={iconSize} aria-hidden="true"/>
   <span className="tc-c-hide" style={{flex:1}}>{item.label}</span>
   {count!==undefined&&<span className="tc-c-hide" style={{fontSize:12,fontWeight:400,color:'var(--muted-foreground)'}}>{count}</span>}
  </button>;
 };
 const countFor=(key:string)=>key==='Home'?counts.home:key==='Caixa de entrada'?counts.inbox:key==='Tarefas'?counts.tasks:undefined;
 const settings=navItems.find(i=>i.key==='Configurações')!;

 return <aside className="tc tc-side" aria-label="Menu principal">
  <div className="tc-brand">
   <span className="tc-brand-icon"><Landmark size={16} color="#fff" aria-hidden="true"/></span>
   <div className="tc-c-hide">
    <div style={{fontSize:13,fontWeight:600,lineHeight:1.2}}>Torre de Controle</div>
    <div style={{fontSize:12,color:'var(--muted-foreground)'}}>Planejamento</div>
   </div>
  </div>
  <nav aria-label="Principal" className="tc-navlist">
   {navItems.filter(i=>i.group==='main').map(item=>navButton(item,countFor(item.key)))}
  </nav>
  <div>
   <div className="glab tc-c-hide">Assistente</div>
   <div className="tc-navlist">{navItems.filter(i=>i.group==='assistant').map(item=>navButton(item))}</div>
  </div>
  <div className="tc-c-hide">
   <div className="glab" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <span>Labels{labelFilter.length>0&&<span style={{marginLeft:6,color:'var(--primary)'}}>{labelFilter.length}</span>}</span>
    <button className="btn btn-g btn-i" aria-label="Criar label" title="Criar label" style={{height:20,width:20,minHeight:0}} disabled={labelsBusy||editing!==undefined} onClick={()=>setEditing(null)}><Plus size={14} aria-hidden="true"/></button>
   </div>
   <nav id="sidebar-labels" aria-label="Labels" className="tc-navlist">
    {ordered.map(l=><div key={l.id} className={'tc-label-row'+(draggingLabel===l.id?' label-reordering':'')+(labelTarget?.id===l.id?(labelTarget.after?' label-insert-after':' label-insert-before'):'')}
     onKeyDown={e=>{if(e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();moveByKey(e.key,l.id);}}}
     onDragOver={e=>{if(draggingLabel&&e.dataTransfer.types.includes('application/x-torre-label-id')){e.preventDefault();e.dataTransfer.dropEffect='move';const rect=e.currentTarget.getBoundingClientRect();setLabelTarget({id:l.id,after:e.clientY>rect.top+rect.height/2});}}}
     onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setLabelTarget(null);}}
     onDrop={e=>{if(!draggingLabel||!e.dataTransfer.types.includes('application/x-torre-label-id'))return;e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();moveLabel(draggingLabel,l.id,e.clientY>rect.top+rect.height/2);setDraggingLabel('');setLabelTarget(null);}}>
     <button className={'nav'+(dropLabel===l.id?' label-drop-ready':'')} aria-pressed={labelFilter.includes(l.id)} title="Solte tarefas aqui para adicionar esta label" style={labelFilter.includes(l.id)?{background:'var(--muted)',fontWeight:600}:undefined}
      onDragOver={e=>{if(isTaskDrag(e.dataTransfer)){e.preventDefault();e.dataTransfer.dropEffect='copy';setDropLabel(l.id);}}}
      onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDropLabel('');}}
      onDrop={e=>{e.preventDefault();setDropLabel('');const ids=readTaskDrag(e.dataTransfer);if(ids.length)onDropLabel(ids,l.id);}}
      onClick={()=>onLabel(l.id)}>
      <span className="dot" style={{background:l.color,margin:'0 3px'}}/>
      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
      <span className="tc-label-count" style={{fontSize:12,fontWeight:400,color:'var(--muted-foreground)'}}>{counts.labels[l.id]??0}</span>
     </button>
     <button className="tc-label-tool tc-label-grip" draggable={!labelsBusy&&editing===undefined} disabled={labelsBusy||editing!==undefined} aria-label={`Reordenar label ${l.name}`} title="Arraste para ordenar · Alt + ↑/↓ para mover"
      onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-torre-label-id',l.id);setDraggingLabel(l.id);}}
      onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();moveByKey(e.key,l.id);}}}><GripVertical size={14} aria-hidden="true"/></button>
     <button className="tc-label-tool tc-label-edit" aria-label={`Editar label ${l.name}`} title={`Editar ${l.name}`} disabled={labelsBusy||editing!==undefined} onClick={()=>setEditing(l)}><Pencil size={13} aria-hidden="true"/></button>
    </div>)}
    <button className="nav" aria-pressed={labelFilter.includes('none')} style={labelFilter.includes('none')?{background:'var(--muted)',fontWeight:600}:{color:'var(--muted-foreground)'}} onClick={()=>onLabel('none')}>
     <span className="dot" style={{background:'transparent',border:'1px dashed var(--muted-foreground)',margin:'0 3px',width:8,height:8,boxSizing:'border-box'}}/>
     <span style={{flex:1}}>Sem label</span>
    </button>
    {editing!==undefined&&<ShellLabelEditor key={editing?.id??'new'} label={editing} defaultArea={area} busy={labelsBusy} error={labelError} onCancel={()=>setEditing(undefined)}
     onArchive={async()=>{if(editing&&await onArchiveLabel(editing.id))setEditing(undefined);}}
     onSave={async value=>{if(await onSaveLabel(value,editing?.id))setEditing(undefined);}}/>}
   </nav>
  </div>
  <div className="tc-side-foot">{navButton(settings)}</div>
 </aside>;
}
