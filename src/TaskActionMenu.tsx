import {useContext,useEffect,useId,useRef,useState} from 'react';
import {MoreHorizontal} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSub,DropdownMenuSubTrigger,DropdownMenuSubContent,DropdownMenuRadioGroup,DropdownMenuRadioItem} from './components/ui/dropdown-menu';
import {PriorityContext} from './priorityContext';
import {priorities,type Priority} from './priority';
import type {Task} from './task';
export function TaskActionMenu({task,onOpen,onPlan,onComplete}:{task:Task;onOpen?:(id:string)=>void;onPlan?:(id:string)=>void;onComplete?:(id:string)=>void}){
 const save=useContext(PriorityContext),menuId=useId();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const previousFocus=useRef<HTMLElement|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),hovered=useRef(false);
 const cancel=()=>clearTimeout(timer.current);
 const enter=()=>cancel();
 const leave=()=>{cancel();timer.current=setTimeout(()=>setOpen(false),350);};
 useEffect(()=>{const close=(event:Event)=>{if((event as CustomEvent).detail!==menuId)setOpen(false);};window.addEventListener('torre-task-menu',close);return()=>{clearTimeout(timer.current);window.removeEventListener('torre-task-menu',close);};},[menuId]);
 const change=async(value:string)=>{if(!save||busy)return;setBusy(true);setError('');try{if(!await save(task.id,value as Priority))setError('Não foi possível salvar a prioridade. Tente novamente.');}catch{setError('Não foi possível salvar a prioridade. Tente novamente.');}finally{setBusy(false);}};
 return <DropdownMenu modal={false} open={open} onOpenChange={value=>{cancel();setOpen(value);}}><DropdownMenuTrigger asChild><button type="button" className="btn btn-g btn-sm btn-i" aria-label={`Ações de ${task.title}`} onPointerEnter={e=>{if(e.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){cancel();timer.current=setTimeout(()=>{previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;hovered.current=true;window.dispatchEvent(new CustomEvent('torre-task-menu',{detail:menuId}));setOpen(true);},180);}}} onPointerLeave={leave} onPointerDown={()=>{hovered.current=false;cancel();}} onKeyDown={()=>{hovered.current=false;cancel();}}><MoreHorizontal size={16}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" onPointerEnter={enter} onPointerLeave={leave} onCloseAutoFocus={e=>{if(hovered.current){e.preventDefault();previousFocus.current?.focus();}}}>
 {save&&<DropdownMenuSub><DropdownMenuSubTrigger disabled={busy}>Prioridade</DropdownMenuSubTrigger><DropdownMenuSubContent onPointerEnter={enter} onPointerLeave={leave}><DropdownMenuRadioGroup value={task.priority??'none'} onValueChange={value=>void change(value)}>{priorities.map(p=><DropdownMenuRadioItem disabled={busy} key={p.value} value={p.value} onSelect={e=>e.preventDefault()}>{p.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>}
 {onOpen&&<DropdownMenuItem onSelect={()=>onOpen(task.id)}>Editar tarefa</DropdownMenuItem>}
 {onPlan&&!task.done&&task.situation!=='waiting'&&<DropdownMenuItem onSelect={()=>onPlan(task.id)}>{task.at?'Reagendar':'Reservar horário'}</DropdownMenuItem>}
 {onComplete&&!task.done&&<DropdownMenuItem onSelect={()=>onComplete(task.id)}>Concluir</DropdownMenuItem>}
 {busy&&<small role="status">Salvando…</small>}{error&&<small role="alert">{error}</small>}
 </DropdownMenuContent></DropdownMenu>;
}
