import {Info} from 'lucide-react';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '../components/ui/tooltip';

// Dica secundária: ícone com tooltip na web (foco ou mouse); escondida no mobile (classe tc-hint).
export function Hint({text}:{text:string}){
 return <span className="tc-hint">
  <TooltipProvider delayDuration={150}>
   <Tooltip>
    <TooltipTrigger asChild>
     <button type="button" className="tc-hint-btn" aria-label={text}><Info size={14} aria-hidden="true"/></button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-64 text-center">{text}</TooltipContent>
   </Tooltip>
  </TooltipProvider>
 </span>;
}
