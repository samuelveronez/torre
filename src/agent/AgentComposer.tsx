import {ArrowUp,ChevronDown} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {modelLabel,type ModelChoice} from './types';

type Props={
 text:string;onText:(value:string)=>void;onSend:()=>void;
 model:ModelChoice;onModel:(value:string)=>void;
 busy:boolean;loading:boolean;modelBusy:boolean;canSend:boolean;
};
/** Rounded input box with the model picker inside; the note below states what the chosen model costs. */
export function AgentComposer(p:Props){
 return <div className="ag-composer-wrap">
  <form className="agent-composer ag-composer-col" onSubmit={e=>{e.preventDefault();p.onSend();}}>
   <div className="ag-composer">
    <label htmlFor="agent-message" className="sr-only">Seu pedido</label>
    <textarea id="agent-message" rows={2} maxLength={4000} disabled={p.busy||p.loading} value={p.text} onChange={e=>p.onText(e.target.value)} placeholder="Pergunte ou peça uma mudança nas suas tarefas…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();p.onSend();}}}/>
    <div className="ag-composer-row">
     <DropdownMenu>
      <DropdownMenuTrigger asChild>
       <button type="button" className="model" aria-haspopup="menu" aria-label={`Modelo da IA: ${modelLabel(p.model)}`} disabled={p.busy||p.modelBusy}>{modelLabel(p.model)}<ChevronDown size={12} aria-hidden="true"/></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
       <DropdownMenuRadioGroup value={p.model} onValueChange={p.onModel}>
        <DropdownMenuRadioItem value="openrouter/free">OpenRouter gratuito</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="google/gemini-2.5-flash">Gemini 2.5 Flash — pago</DropdownMenuRadioItem>
       </DropdownMenuRadioGroup>
      </DropdownMenuContent>
     </DropdownMenu>
     <button type="submit" className="ag-send" aria-label="Enviar pedido" disabled={!p.canSend||p.busy||p.loading||!p.text.trim()}><ArrowUp size={16} aria-hidden="true"/></button>
    </div>
   </div>
   <p className="desc ag-note">{p.model==='openrouter/free'
    ?'Padrão de toda a Torre: gratuito · disponibilidade e cota variáveis. '
    :<>Padrão de toda a Torre: Gemini usa a mesma chave OpenRouter e cobra por tokens. <a href="https://openrouter.ai/google/gemini-2.5-flash" target="_blank" rel="noopener noreferrer">Consultar preços</a>. </>}
    A IA pode errar. Nada é alterado sem você aplicar. Enter envia · Shift + Enter quebra a linha.</p>
  </form>
 </div>;
}
