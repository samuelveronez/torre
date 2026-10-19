import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ChevronRight,Menu,PanelLeft,Plus,Search,X} from 'lucide-react';

type Props={
 title:string;
 agentPage:boolean;
 phone:boolean;
 narrow:boolean;
 compact:boolean;
 menuOpen:boolean;
 area:string;
 query:string;
 email:string;
 account:ReactNode;
 onMenu:()=>void;
 onToggleCompact:()=>void;
 onArea:(area:string)=>void;
 onQuery:(query:string)=>void;
 onNew:()=>void;
};

const areas=[['Tudo','Todas as áreas'],['Pessoal','Pessoal'],['Profissional','Profissional']];

function initials(email:string){
 const name=email.split('@')[0].replace(/[^a-zA-Z]+/g,' ').trim();
 const parts=name.split(' ').filter(Boolean);
 if(parts.length>1)return (parts[0][0]+parts[1][0]).toUpperCase();
 return (name.slice(0,2)||'?').toUpperCase();
}

export function Topbar({title,agentPage,phone,narrow,compact,menuOpen,area,query,email,account,onMenu,onToggleCompact,onArea,onQuery,onNew}:Props){
 const [accountOpen,setAccountOpen]=useState(false);
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!accountOpen)return;
  const close=(e:MouseEvent)=>{if(!box.current?.contains(e.target as Node))setAccountOpen(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setAccountOpen(false);};
  document.addEventListener('mousedown',close);
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',escape);};
 },[accountOpen]);

 const bottomNav=phone&&!agentPage;
 const showMenuButton=!bottomNav;
 const menuButton=narrow
  ? <button className="btn btn-g btn-i mobile-menu" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={onMenu}><Menu size={16} aria-hidden="true"/></button>
  : <button className="btn btn-g btn-i" aria-label={compact?'Expandir menu principal':'Recolher menu principal'} aria-expanded={!compact} title={compact?'Expandir menu principal':'Recolher menu principal'} onClick={onToggleCompact}><PanelLeft size={16} aria-hidden="true"/></button>;

 return <header className="tc tc-top">
  {showMenuButton&&menuButton}
  {showMenuButton&&!phone&&<span aria-hidden="true" style={{width:1,height:16,background:'var(--border)'}}/>}
  {agentPage&&phone&&<strong style={{fontSize:15}}>Modo IA</strong>}
  {!phone&&!agentPage&&<nav aria-label="Trilha" style={{display:'flex',alignItems:'center',gap:6,fontSize:14,padding:0,border:0,background:'transparent'}}>
   <span style={{color:'var(--muted-foreground)'}}>Torre de Controle</span>
   <ChevronRight size={14} color="var(--muted-foreground)" aria-hidden="true"/>
   <span style={{fontWeight:500}} aria-current="page">{title}</span>
  </nav>}
  <div className="tc-spacer" style={{flex:1}}/>
  {!agentPage&&<>
   <div className="tc-search">
    <Search size={16} color="var(--muted-foreground)" aria-hidden="true"/>
    <input className="inp" type="search" aria-label="Buscar tarefas" placeholder="Buscar tarefas…" value={query} onChange={e=>onQuery(e.target.value)} style={{paddingLeft:32}}/>
    {query&&<button className="btn btn-g btn-i" aria-label="Limpar busca" style={{position:'absolute',right:2,top:2,height:32,width:32}} onClick={()=>onQuery('')}><X size={14} aria-hidden="true"/></button>}
   </div>
   <div className="seg tc-area" role="group" aria-label="Área das tarefas">
    {areas.map(([value,label])=><button key={value} aria-pressed={area===value} onClick={()=>onArea(value)}>{label}</button>)}
   </div>
  </>}
  {!phone&&<button className="btn btn-p" aria-label="Captura rápida" onClick={onNew}><Plus size={16} aria-hidden="true"/>Capturar</button>}
  <div ref={box} className="tc-avatar-box" style={{position:'relative'}}>
   <button className="tc-avatar" aria-label={`Conta de ${email}`} aria-expanded={accountOpen} onClick={()=>setAccountOpen(!accountOpen)}>{initials(email)}</button>
   {accountOpen&&<div className="tc-menu tc-account" role="group" aria-label="Conta">{account}</div>}
  </div>
 </header>;
}
