import {Sheet,SheetContent,SheetTitle,SheetDescription} from './components/ui/sheet';
import {Button} from './components/ui/button';
import {usePreference} from './uiState';
import type {Label} from './features';
import {useEffect,useState,type ReactNode} from 'react';
import {Menu,Plus} from 'lucide-react';
import {Sidebar} from './shell/Sidebar';
import {Topbar} from './shell/Topbar';
import {navItems,type ShellCounts} from './shell/navItems';
import type {LabelDraft} from './shell/ShellLabelEditor';

type Props={
 userId:string;
 email:string;
 account:ReactNode;
 counts:ShellCounts;
 labels:Label[];
 labelFilter:string[];
 labelsBusy:boolean;
 labelError:string;
 children:ReactNode;
 page:string;
 area:string;
 query:string;
 onPage:(page:string)=>void;
 onArea:(area:string)=>void;
 onQuery:(query:string)=>void;
 onNew:()=>void;
 onLabel:(id:string)=>void;
 onDropLabel:(taskIds:string[],labelId:string)=>void;
 onSaveLabel:(value:LabelDraft,id?:string)=>Promise<boolean>;
 onArchiveLabel:(id:string)=>Promise<boolean>;
};

function useMedia(query:string){
 const [matches,setMatches]=useState(()=>window.matchMedia(query).matches);
 useEffect(()=>{
  const media=window.matchMedia(query);
  const change=()=>setMatches(media.matches);
  media.addEventListener('change',change);
  return()=>media.removeEventListener('change',change);
 },[query]);
 return matches;
}

export function AppShell(props:Props){
 const {userId,email,account,counts,labels,labelFilter,labelsBusy,labelError,children,page,area,query,onPage,onArea,onQuery,onNew,onLabel,onDropLabel,onSaveLabel,onArchiveLabel}=props;
 const narrow=useMedia('(max-width:1023px)');
 const phone=useMedia('(max-width:767px)');
 const [menuOpen,setMenuOpen]=useState(false);
 const agentPage=page==='Modo IA';
 const [compact,setCompact]=usePreference<boolean>(userId,'sidebar-collapsed',false);
 const bottomNav=phone&&!agentPage;
 const pageTitle=navItems.find(i=>i.key===page)?.label??page;

 useEffect(()=>{setMenuOpen(false);},[page,narrow]);

 const choose=(next:string)=>{onPage(next);setMenuOpen(false);};
 const sidebar=<Sidebar userId={userId} page={page} area={area} counts={counts} labels={labels} labelFilter={labelFilter} labelsBusy={labelsBusy} labelError={labelError} phone={phone}
  onPage={choose} onLabel={onLabel} onDropLabel={onDropLabel} onSaveLabel={onSaveLabel} onArchiveLabel={onArchiveLabel}/>;

 return <div className={'app-shell tc'+(agentPage?' agent-focus':'')+(compact?' menu-compact':'')} onKeyDown={e=>{if(e.key==='Escape')setMenuOpen(false);}}>
  {narrow
   ? <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent side="left" className="navigation-sheet">
       <SheetTitle className="sr-only">Menu principal</SheetTitle>
       <SheetDescription className="sr-only">Navegação, labels e conta da Torre.</SheetDescription>
       {sidebar}
      </SheetContent>
     </Sheet>
   : sidebar}
  <div className="app-content">
   <Topbar title={pageTitle} agentPage={agentPage} phone={phone} narrow={narrow} compact={compact} menuOpen={menuOpen} area={area} query={query} email={email} account={account}
    onMenu={()=>setMenuOpen(true)} onToggleCompact={()=>setCompact(v=>!v)} onArea={onArea} onQuery={onQuery} onNew={onNew}/>
   {children}
   {bottomNav&&<div aria-hidden="true" className="h-24 shrink-0"/>}
  </div>
  {bottomNav&&<>
   <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
    {navItems.filter(i=>['Home','Caixa de entrada','Tarefas','Planejamento'].includes(i.key)).map(item=>{
     const Icon=item.icon;
     const short=item.key==='Planejamento'?'Agenda':item.key==='Caixa de entrada'?'Caixa':item.label;
     const current=page===item.key;
     return <Button key={item.key} variant="ghost" aria-label={item.label} aria-current={current?'page':undefined} className={'h-14 min-w-0 flex-1 flex-col gap-0.5 rounded-none px-0 '+(current?'text-primary!':'text-muted-foreground!')} onClick={()=>onPage(item.key)}>
      <Icon size={20}/>
      <span className="text-[11px] leading-none">{short}</span>
     </Button>;
    })}
    <Button variant="ghost" aria-label="Mais opções" aria-expanded={menuOpen} className="h-14 min-w-0 flex-1 flex-col gap-0.5 rounded-none px-0 text-muted-foreground!" onClick={()=>setMenuOpen(true)}>
     <Menu size={20}/>
     <span className="text-[11px] leading-none">Mais</span>
    </Button>
   </nav>
   <Button size="icon" aria-label="Captura rápida" className="fixed right-4 bottom-20 z-40 size-12 rounded-full shadow-lg" onClick={onNew}><Plus size={22}/></Button>
  </>}
 </div>;
}
