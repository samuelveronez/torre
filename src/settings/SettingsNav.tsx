import {settingsGroups} from './sections';

type Props={section:string;onSection:(key:string)=>void};

export function SettingsNav({section,onSection}:Props){
 return <>
  <select className="settings-select" aria-label="Seção das configurações" value={section} onChange={e=>onSection(e.target.value)}>
   {settingsGroups.map(group=><optgroup key={group.title} label={group.title}>{group.items.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>)}
  </select>
  <nav className="settings-nav" aria-label="Seções das configurações">
   {settingsGroups.map(group=><div key={group.title} className="contents">
    <p className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group.title}</p>
    {group.items.map(item=><button key={item.key} aria-current={section===item.key?'page':undefined} onClick={()=>onSection(item.key)}>{item.label}</button>)}
   </div>)}
  </nav>
 </>;
}
