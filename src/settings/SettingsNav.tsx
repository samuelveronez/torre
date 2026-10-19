import {settingsGroups} from './sections';

type Props={section:string;onSection:(key:string)=>void;connected:Record<string,boolean>};

export function SettingsNav({section,onSection,connected}:Props){
 return <>
  <select className="inp tc-sselect" aria-label="Seção das configurações" value={section} onChange={e=>onSection(e.target.value)}>
   {settingsGroups.map(group=><optgroup key={group.title} label={group.title}>{group.items.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>)}
  </select>
  <nav className="tc-snav" aria-label="Seções das configurações" style={{flex:'0 0 200px',flexDirection:'column',gap:16,padding:0,border:0,background:'transparent'}}>
   {settingsGroups.map(group=><div key={group.title} style={{display:'flex',flexDirection:'column',gap:2}}>
    <div style={{padding:'0 12px 4px',fontSize:12,fontWeight:600,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--muted-foreground)'}}>{group.title}</div>
    {group.items.map(item=><button key={item.key} className="sub" aria-current={section===item.key?'page':undefined} onClick={()=>onSection(item.key)}>
     <span style={{flex:1}}>{item.label}</span>
     {connected[item.key]&&<span title="Conectado" aria-hidden="true" style={{width:6,height:6,borderRadius:'50%',background:'#16a34a'}}/>}
    </button>)}
   </div>)}
  </nav>
 </>;
}
