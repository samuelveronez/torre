import {X} from 'lucide-react';
import type {Label} from '../features';

type Props={area:string;query:string;labelFilter:string[];labels:Label[];extra?:{label:string;onRemove:()=>void}[];onRemoveArea:()=>void;onRemoveQuery:()=>void;onRemoveLabel:(id:string)=>void;onClear:()=>void;count?:string};

export function FilterChip({label,color,onRemove}:{label:string;color?:string;onRemove:()=>void}){
 return <span className="badge b-s" style={{height:26,padding:'0 4px 0 10px'}}>
  {color&&<span className="dot" style={{background:color}}/>}{label}
  <button className="btn btn-g" aria-label={`Remover filtro ${label}`} style={{height:18,width:18,minHeight:0,padding:0,borderRadius:4}} onClick={onRemove}><X size={12} aria-hidden="true"/></button>
 </span>;
}

export function ActiveFilters({area,query,labelFilter,labels,extra=[],onRemoveArea,onRemoveQuery,onRemoveLabel,onClear,count}:Props){
 const labelName=(id:string)=>id==='none'?'Sem label':labels.find(l=>l.id===id)?.name??id;
 const labelColor=(id:string)=>labels.find(l=>l.id===id)?.color;
 if(area==='Tudo'&&!query&&!labelFilter.length&&!extra.length)return null;
 return <div aria-label="Filtros ativos" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
  {area!=='Tudo'&&<FilterChip label={area} onRemove={onRemoveArea}/>}
  {query&&<FilterChip label={`Busca: ${query}`} onRemove={onRemoveQuery}/>}
  {labelFilter.map(id=><FilterChip key={id} label={labelName(id)} color={labelColor(id)} onRemove={()=>onRemoveLabel(id)}/>)}
  {extra.map(item=><FilterChip key={item.label} label={item.label} onRemove={item.onRemove}/>)}
  <button className="btn btn-g btn-sm" style={{color:'var(--tc-chip-on)'}} onClick={onClear}>Limpar filtros</button>
  {count&&<span className="desc" style={{fontSize:12}}>{count}</span>}
 </div>;
}
