import {db,checked,secret} from './google.ts';
import {propose} from './planning.ts';
import {selectedAiModel} from './aiSettings.ts';
export async function preparePlan(uid:string,input:any){
 const ids=input.taskIds,start=Date.parse(input.start),end=Date.parse(input.end);
 if(!Array.isArray(ids)||ids.length<1||ids.length>20||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[0-9a-f-]{36}$/i.test(x)))throw new Error('Selecione de 1 a 20 tarefas.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end-start<6*86400000||end-start>8*86400000||end<=Date.now())throw new Error('Semana inválida.');
 if(typeof input.instruction!=='string'||input.instruction.length>1000)throw new Error('Orientação de até mil caracteres.');
 const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre sua chave OpenRouter.');
 const {data:snapshot}=await checked(db.rpc('torre_plan_snapshot',{p_user:uid,p_tasks:ids}));
 if(snapshot.tasks.length!==ids.length||snapshot.tasks.some((t:any)=>t.archived_at||t.status!=='todo'||snapshot.blocks.some((b:any)=>b.task_id===t.id)))throw new Error('Selecione somente pendências sem reserva.');
 const g=snapshot.google;
 if(g?.connected&&(!g.calendar_synced_at||Date.parse(g.calendar_synced_at)<Date.now()-300000||g.error||!g.range_start||!g.range_end||Date.parse(g.range_start)>start||Date.parse(g.range_end)<end))throw new Error('Atualize a agenda antes de gerar a proposta.');
 const model=await selectedAiModel(db,uid),proposal=await propose(snapshot,new Date(start).toISOString(),new Date(end).toISOString(),input.instruction,key,model);
 const {data:saved}=await checked(db.from('torre_week_proposals').insert({user_id:uid,task_ids:ids,range_start:new Date(start).toISOString(),range_end:new Date(end).toISOString(),snapshot,placements:proposal.placements}).select('id,expires_at').single());
 return {...proposal,...saved,model};
}
