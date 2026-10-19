import {forwardRef} from 'react';
import {Pencil,Search,X} from 'lucide-react';
import {groupConversations} from './groupConversations';
import {conversationKey,type Conversation} from './types';

type Props={
 conversations:Conversation[];selected:string;search:string;onSearch:(value:string)=>void;
 busy:boolean;listBusy:boolean;more:boolean;showArchived:boolean;onToggleArchived:()=>void;
 onSelect:(key:string)=>void;onNew:()=>void;onMore:()=>void;
 dialog:boolean;
};
/** Conversation list. Always visible on desktop; on phones it opens over the conversation as a dialog. */
export const AgentHistory=forwardRef<HTMLElement,Props>(function AgentHistory(p,ref){
 const groups=groupConversations(p.conversations);
 return <aside ref={ref} id="agent-conversations" className="ag-conversations" role={p.dialog?'dialog':undefined} aria-modal={p.dialog?true:undefined} aria-label="Histórico do agente">
  <button type="button" className="conv ag-new" disabled={p.busy} onClick={p.onNew}><Pencil size={16} aria-hidden="true"/>Nova conversa</button>
  <label className="conv ag-search"><Search size={16} aria-hidden="true"/><input aria-label="Buscar conversa" placeholder="Buscar conversa…" value={p.search} onChange={e=>p.onSearch(e.target.value)}/>{p.search&&<button type="button" className="ico" aria-label="Limpar busca de conversas" onClick={()=>p.onSearch('')}><X size={14} aria-hidden="true"/></button>}</label>
  <div className="ag-groups" aria-busy={p.listBusy}>
   {p.showArchived&&<div className="glab" style={{paddingTop:14}}>Arquivadas</div>}
   {groups.map(group=><div className="ag-group" key={group.title}>
    <div className="glab">{group.title}</div>
    {group.items.map(c=>{
     const key=conversationKey(c.conversation_id);
     const current=key===p.selected;
     return <button type="button" key={key} className={'conv'+(current?' current':'')} aria-current={current?'true':undefined} disabled={p.busy} title={`${c.title} · ${c.run_count} pedido(s)`} onClick={()=>p.onSelect(key)}>{c.title}</button>;
    })}
   </div>)}
   {!p.conversations.length&&!p.listBusy&&<p className="desc ag-empty-list">{p.search?'Nenhuma conversa encontrada.':p.showArchived?'Nenhuma conversa arquivada.':'Suas conversas aparecerão aqui.'}</p>}
  </div>
  {p.more&&<button type="button" className="conv ag-more" disabled={p.listBusy} onClick={p.onMore}>Ver anteriores</button>}
  <button type="button" className="conv ag-more ag-archived-toggle" onClick={p.onToggleArchived}>{p.showArchived?'← Conversas ativas':'Arquivadas'}</button>
 </aside>;
});
