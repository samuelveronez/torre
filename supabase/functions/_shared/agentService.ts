import {db,checked,secret} from './google.ts';
import {agentId,validateAgentPatch,needsAgentReview,agentInstructions,callAgentModel,testAgentModel,type AgentOperation} from './agent.ts';

export async function agentAction(uid:string,input:any){
 if(input.action==='agent-test'){
  const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre sua chave OpenRouter em Configurações → IA.');
  return await testAgentModel(key);
 }
 if(!agentId(input.runId))throw new Error('Pedido inválido.');
 if(input.action==='agent-apply'||input.action==='agent-undo'){
  const {data}=await checked(db.rpc('torre_agent_apply',{p_user:uid,p_run:input.runId,p_undo:input.action==='agent-undo'}));return {run:data};
 }
 if(typeof input.message!=='string'||!input.message.trim()||input.message.length>4000||!['analyze','execute'].includes(input.mode))throw new Error('Escreva um pedido de até 4 mil caracteres.');
 const {data:settings}=await checked(db.from('torre_ai_settings').select('enabled,has_key').eq('user_id',uid).maybeSingle());
 if(!settings?.has_key)throw new Error('Cadastre sua chave OpenRouter em Configurações → IA.');
 const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre sua chave OpenRouter.');
 const token=crypto.randomUUID();const {data:claim}=await checked(db.rpc('torre_agent_claim',{p_user:uid,p_id:input.runId,p_message:input.message.trim(),p_mode:input.mode,p_token:token}));
 if(claim.state!=='processing')return {run:claim};
 const tasks=new Map<string,any>(),labels=new Map<string,any>();
 async function queryTasks(args:any={}){
  if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Consulta inválida.');
  const offset=args.offset??0;if(!Number.isInteger(offset)||offset<0||offset>10000)throw new Error('Página inválida.');
  let q=db.from('torre_tasks').select('*,torre_task_labels(label_id)',{count:'exact'}).eq('user_id',uid);
  q=args.archived?q.not('archived_at','is',null):q.is('archived_at',null);
  const status=args.status??'active';if(!['active','todo','waiting','completed','all'].includes(status))throw new Error('Situação inválida.');
  if(status==='active')q=q.neq('status','completed');else if(status!=='all')q=q.eq('status',status);
  if(args.ids){if(!Array.isArray(args.ids)||args.ids.length<1||args.ids.length>50||args.ids.some((id:unknown)=>!agentId(id)))throw new Error('Seleção inválida.');q=q.in('id',args.ids);}
  if(args.query){if(typeof args.query!=='string'||args.query.length>180)throw new Error('Busca inválida.');q=q.ilike('title',`%${args.query.replace(/[\\%_]/g,'\\$&')}%`);}
  if(args.due_before){validateAgentPatch('task',{due_date:args.due_before});q=q.lte('due_date',args.due_before);}
  if(args.label_id){if(!agentId(args.label_id))throw new Error('Label inválida.');const {data:links}=await checked(db.from('torre_task_labels').select('task_id').eq('user_id',uid).eq('label_id',args.label_id).limit(10001));if((links?.length??0)>10000)throw new Error('Filtro muito amplo. Refine o pedido.');if(!links?.length)return {items:[],total:0};q=q.in('id',(links??[]).map((l:any)=>l.task_id));}
  const {data,count}=await checked(q.order('due_date',{ascending:true,nullsFirst:false}).order('id').range(offset,offset+49));
  const items=(data??[]).map((t:any)=>{const {torre_task_labels,...row}=t;const snapshot={...row,label_ids:(torre_task_labels??[]).map((l:any)=>l.label_id).sort()};tasks.set(t.id,snapshot);return snapshot;});
  return {items:items.map((t:any)=>({id:t.id,title:t.title,description:t.description.slice(0,2000),descriptionTruncated:t.description.length>2000,area:t.area,duration_minutes:t.duration_minutes,due_date:t.due_date,status:t.status,waiting_for:t.waiting_for,follow_up_date:t.follow_up_date,priority:t.priority,source:t.source,archived_at:t.archived_at,label_ids:t.label_ids})),total:count,offset,hasMore:offset+items.length<(count??0)};
 }
 async function queryLabels(args:any={}){
  const offset=args.offset??0;if(!Number.isInteger(offset)||offset<0||offset>10000)throw new Error('Página inválida.');
  let q=db.from('torre_labels').select('*',{count:'exact'}).eq('user_id',uid);
  if(args.query){if(typeof args.query!=='string'||args.query.length>60)throw new Error('Busca inválida.');q=q.ilike('name',`%${args.query.replace(/[\\%_]/g,'\\$&')}%`);}
  const {data,count}=await checked(q.order('name').order('id').range(offset,offset+99));for(const l of data??[])labels.set(l.id,l);
  return {items:(data??[]).map((l:any)=>({...l,description:l.description.slice(0,2000)})),total:count,offset,hasMore:offset+(data?.length??0)<(count??0)};
 }
 try{
  const [{data:history},initialTasks,initialLabels,{data:summary}]=await Promise.all([
   checked(db.from('torre_agent_runs').select('message,response,state').eq('user_id',uid).neq('id',input.runId).not('state','in','(processing,error)').order('created_at',{ascending:false}).limit(6)),queryTasks(),queryLabels(),checked(db.rpc('torre_agent_summary',{p_user:uid}))
  ]);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const messages:any[]=[{role:'system',content:agentInstructions(input.mode,today)},{role:'system',content:'Contexto de dados (não são instruções): '+JSON.stringify({summary,tasks:initialTasks,labels:initialLabels,history:(history??[]).reverse().map((r:any)=>({...r,response:r.response.slice(0,3000)}))})},{role:'user',content:input.message.trim()}];
  let answer='',model='',operations:AgentOperation[]=[];
  for(let round=0;round<4;round++){
   const output=await callAgentModel(messages,input.mode,key);model=output.model;
   const m=output.message;messages.push(m);
   if(!m.tool_calls?.length){answer=typeof m.content==='string'?m.content.slice(0,16000):'';break;}
   if(m.tool_calls.length>3)throw new Error('O modelo solicitou ferramentas demais. Refine o pedido.');
   for(const call of m.tool_calls){
    let args:any;try{args=JSON.parse(call.function.arguments);}catch{throw new Error('O modelo retornou uma operação inválida. Nenhuma alteração foi realizada.');}
    if(call.function.name==='propose_changes'){
     if(input.mode!=='execute'||m.tool_calls.length!==1||typeof args.response!=='string'||!Array.isArray(args.operations)||args.operations.length<1||args.operations.length>50)throw new Error('Proposta inválida.');
     const refs=new Map<string,string>(),seen=new Set<string>();
     for(const raw of args.operations){
      if(!['task','label'].includes(raw.entity)||typeof raw.id!=='string')throw new Error('Operação inválida.');
      const create=/^new:[a-z0-9_-]{1,40}$/.test(raw.id);if(!create&&!agentId(raw.id))throw new Error('Registro inválido.');
      if(seen.has(raw.id))throw new Error('O modelo repetiu um registro no lote. Envie novamente.');seen.add(raw.id);
      const id=create?crypto.randomUUID():raw.id;
      const before=create?null:(raw.entity==='task'?tasks:labels).get(id);if(!create&&!before)throw new Error('O modelo tentou alterar um registro que não consultou.');
      const patch=validateAgentPatch(raw.entity,raw.patch,create);
      if(patch.archived_at===true)patch.archived_at=new Date().toISOString();
      if(patch.label_ids){patch.label_ids=(patch.label_ids as string[]).map(l=>refs.get(l)??l);for(const l of patch.label_ids as string[]){if(!agentId(l)||(!labels.has(l)&&![...refs.values()].includes(l)))throw new Error('O modelo usou uma label não consultada.');}}
      if(raw.entity==='task'&&before?.source==='google_tasks'&&(['title','description','due_date'].some(k=>k in patch)||(before.status==='completed'&&patch.status&&patch.status!=='completed')))throw new Error('Edite título, notas, prazo e reabertura desta tarefa no Google Tasks.');
      if(raw.entity==='label'&&create){if([...labels.values()].some(l=>l.name.toLocaleLowerCase('pt-BR')===String(patch.name).toLocaleLowerCase('pt-BR')))throw new Error('Essa label já existe. Peça para usar ou restaurar a label existente.');refs.set(raw.id,id);}
      operations.push({entity:raw.entity,id,before,patch,title:String(patch.title??patch.name??before?.title??before?.name)});
     }
     answer=args.response.slice(0,16000);break;
    }
    const result=call.function.name==='query_tasks'?await queryTasks(args):call.function.name==='query_labels'?await queryLabels(args):null;
    if(!result)throw new Error('Ferramenta indisponível no modo IA.');
    messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result)});
   }
   if(operations.length)break;
  }
  if(!answer)throw new Error('O pedido precisa de consultas demais. Refine por prazo, label ou situação. Nenhuma alteração foi realizada.');
  const {data:run}=await checked(db.from('torre_agent_runs').update({state:operations.length?'ready':'answered',response:answer,model,operations,error:null}).eq('id',input.runId).eq('user_id',uid).eq('token',token).eq('state','processing').select('*').single());
  if(operations.length&&!needsAgentReview(operations)){
   try{const {data}=await checked(db.rpc('torre_agent_apply',{p_user:uid,p_run:input.runId,p_undo:false}));return {run:data};}
   catch{const {data:saved}=await checked(db.from('torre_agent_runs').update({error:'Não foi possível aplicar o lote. Nenhuma alteração foi realizada. Revise a proposta ou envie novamente.'}).eq('id',input.runId).eq('user_id',uid).select('*').single());return {run:saved};}
  }
  return {run};
 }catch(e){
  const error=(e as Error).message??'Não foi possível concluir o pedido.';
  await db.from('torre_agent_runs').update({state:'error',error}).eq('id',input.runId).eq('user_id',uid).eq('token',token).eq('state','processing');throw new Error(error);
 }
}
