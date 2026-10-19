import {Archive,ArchiveRestore,MoreHorizontal,Pencil} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

type Props={archived:boolean;disabled:boolean;onRename:()=>void;onArchive:(archived:boolean)=>void};
/** "⋯" menu of the open conversation: rename it, or archive it (hidden from the list, never deleted). */
export function AgentConversationMenu({archived,disabled,onRename,onArchive}:Props){
 return <DropdownMenu>
  <DropdownMenuTrigger asChild>
   <button type="button" className="ico" aria-label="Mais ações da conversa" disabled={disabled}><MoreHorizontal size={16} aria-hidden="true"/></button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
   <DropdownMenuItem onSelect={onRename}><Pencil size={14} aria-hidden="true"/>Renomear conversa</DropdownMenuItem>
   {archived
    ?<DropdownMenuItem onSelect={()=>onArchive(false)}><ArchiveRestore size={14} aria-hidden="true"/>Restaurar conversa</DropdownMenuItem>
    :<DropdownMenuItem onSelect={()=>onArchive(true)}><Archive size={14} aria-hidden="true"/>Arquivar conversa</DropdownMenuItem>}
  </DropdownMenuContent>
 </DropdownMenu>;
}
