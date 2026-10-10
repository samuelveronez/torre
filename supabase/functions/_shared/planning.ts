import type {AiModel} from './aiSettings.ts';
import {generate} from './intelligence.ts';
export type Placement={taskId:string;start:string;end:string;reason:string};
export {allocate} from './allocation.ts';
import {allocate} from './allocation.ts';
export function validateOrder(data:any,ids:string[]){
 if(!Array.isArray(data?.order)||data.order.length!==ids.length||new Set(data.order.map((r:any)=>r.taskId)).size!==ids.length||data.order.some((r:any)=>!ids.includes(r?.taskId)||typeof r.reason!=='string'||r.reason.length>400))throw new Error('A IA retornou uma ordem inválida. Gere novamente.');
 return data.order as {taskId:string;reason:string}[];
}
export async function propose(snapshot:any,from:string,to:string,instruction:string,key:string,model:AiModel='openrouter/free'){
 const {data}=await generate('Organize as tarefas por prioridade para reservar na semana. Considere prazos explícitos e a orientação do usuário, sem inventar dependências. Não sugira horários nem altere tarefas. Retorne cada ID exatamente uma vez: {"order":[{"taskId":"ID existente","reason":"justificativa curta em português"}]}.', {tasks:snapshot.tasks.map((t:any)=>({id:t.id,title:t.title,area:t.area,duration:t.duration_minutes,due:t.due_date})),instruction},key,model);
 return allocate(snapshot,validateOrder(data,snapshot.tasks.map((t:any)=>t.id)),from,to);
}
