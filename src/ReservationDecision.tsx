import type {Task} from './task';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
import {Button} from './components/ui/button';
export function ReservationDecision({tasks,onDecision}:{tasks:Task[];onDecision:(keep:boolean|null)=>void}){
 return <Dialog open={tasks.length>0} onOpenChange={open=>{if(!open)onDecision(null);}}><DialogContent onCloseAutoFocus={e=>{const save=document.querySelector<HTMLButtonElement>('[form=task-editor][type=submit]');if(save){e.preventDefault();requestAnimationFrame(()=>save.focus());}}}><DialogTitle>Revisar horário reservado</DialogTitle><DialogDescription>Área, duração ou situação mudou. Manter o horário adapta a duração; tarefas aguardando resposta ficam como lembretes sem bloquear disponibilidade. Ao voltar a A fazer, manter converte o lembrete em reserva.</DialogDescription>{tasks.map(t=><p key={t.id}>{t.title}</p>)}<Button onClick={()=>onDecision(true)}>Manter horário</Button><Button variant="outline" onClick={()=>onDecision(false)}>Retirar horário</Button><Button variant="ghost" onClick={()=>onDecision(null)}>Cancelar alteração</Button></DialogContent></Dialog>;
}
