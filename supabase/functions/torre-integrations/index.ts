import {classifierModel,buildQuestions,parseDecision} from '../_shared/openrouter.ts';
import {triageMany,extractionModel,request} from '../_shared/intelligence.ts';
import {propose} from '../_shared/planning.ts';
import {db,checked,secret,googleToken,api,completeJobs,discover,syncTasks,syncCalendar,callback,site} from '../_shared/google.ts';
const cors={'Access-Control-Allow-Origin':new URL(site).origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
 const headers={...cors};const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
 const origin=req.headers.get('Origin');if(origin&&['http://127.0.0.1:5180','http://127.0.0.1:5173','http://127.0.0.1:5174','https://samuelveronez.github.io',new URL(site).origin].includes(origin))headers['Access-Control-Allow-Origin']=origin;else headers['Access-Control-Allow-Origin']=new URL(site).origin;
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 try{
  // Every user action validates the bearer JWT with Supabase Auth.
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!bearer)return json({error:'Entre na Torre.'},401);
  const {data:{user},error}=await db.auth.getUser(bearer);if(error||!user)return json({error:'Sessão inválida.'},401);
  const input=await req.json();const uid=user.id;
  if(input.action==='ai-key'){
   if(input.remove){await secret(uid,'ai',undefined,true);await checked(db.from('torre_ai_settings').upsert({user_id:uid,has_key:false,enabled:false}));}
   else{if(typeof input.key!=='string'||!input.key.trim()||input.key.length>8192)throw new Error('Chave inválida');await secret(uid,'ai',input.key.trim());await checked(db.from('torre_ai_settings').upsert({user_id:uid,has_key:true,enabled:false}));}
   return json({ok:true});
  }
  if(input.action==='ai-config'){
   if(input.enabled===false){await checked(db.from('torre_ai_settings').update({enabled:false}).eq('user_id',uid));return json({ok:true});}
   const key=await secret(uid,'ai');if(!key)return json({error:'Guarde a chave OpenRouter antes de ativar.'},409);
   // Test uses synthetic text only; no capture data or files are sent during activation.
   await triageMany({text:'Comprar frutas para minha casa',labels:[]},key,'free');
   await checked(db.from('torre_ai_settings').upsert({user_id:uid,has_key:true,provider:'openrouter',model:classifierModel,enabled:true}));return json({ok:true,model:classifierModel});
  }
  if(input.action==='classify-tasks'||input.action==='undo-completion'){
   const ids=input.taskIds;if(!Array.isArray(ids)||ids.length<1||ids.length>200||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[0-9a-f-]{36}$/i.test(x)))throw new Error('Seleção de tarefas inválida.');
   const {data:tasks}=await checked(db.from('torre_tasks').select('*').eq('user_id',uid).is('archived_at',null).in('id',ids));if(tasks?.length!==ids.length)throw new Error('Tarefa indisponível nesta conta.');
   if(input.action==='undo-completion'){
    if(tasks.some((t:any)=>t.source!=='google_tasks'||t.status!=='completed'||!t.completed_at||Date.parse(t.completed_at)<Date.now()-60000))throw new Error('O período de desfazer terminou. Reabra esta tarefa no Google Tasks.');
    const token=await googleToken(uid);for(const task of tasks){await api(token,`tasks/v1/lists/${encodeURIComponent(task.google_list_id)}/tasks/${encodeURIComponent(task.google_task_id)}`,{method:'PATCH',body:JSON.stringify({status:'needsAction',completed:null})});await checked(db.from('torre_sync_jobs').delete().eq('task_id',task.id).eq('user_id',uid));await checked(db.from('torre_tasks').update({status:'todo',google_completion_pending:false,sync_error:null}).eq('id',task.id).eq('user_id',uid));}return json({ok:true});
   }
   if(ids.length>20)throw new Error('Classifique até 20 tarefas por vez.');
   const {data:settings}=await checked(db.from('torre_ai_settings').select('*').eq('user_id',uid).maybeSingle());if(!settings?.enabled||settings.provider!=='openrouter')throw new Error('Ative a IA nas configurações.');const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre sua chave OpenRouter.');
   const {data:labels}=await checked(db.from('torre_labels').select('id,name,description').eq('user_id',uid).eq('archived',false));const inputs=tasks.map((t:any)=>({text:[t.title,t.description].filter(Boolean).join('\n').slice(0,20000),labels:labels??[]}));const questions:Record<string,unknown>={};inputs.forEach((item:any,i:number)=>{for(const [name,q] of Object.entries(buildQuestions(item)))questions[`task_${i}_${name}`]={...(q as object),instructions:`Classifique somente tasks[${i}], independentemente das outras. ${(q as any).instructions.replaceAll('capture_text',`tasks[${i}].text`)}`};});const payload=await request('alpha/decisions',{model:classifierModel,state:{tasks:inputs.map((item:any)=>({text:item.text}))},questions},key);const results=inputs.map((item:any,i:number)=>{const answers:Record<string,unknown>={};for(const name of Object.keys(buildQuestions(item)))answers[name]=payload.answers?.[`task_${i}_${name}`];return {taskId:tasks[i].id,labelIds:parseDecision({answers},item).labelIds};});return json({results});
  }
  if(input.action==='triage'){
   if(typeof input.captureId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.captureId))return json({error:'Captura inválida.'},400);
   const {data:settings}=await checked(db.from('torre_ai_settings').select('*').eq('user_id',uid).maybeSingle());
   if(!settings?.enabled||settings.provider!=='openrouter'||settings.model!==classifierModel)return json({error:'Ative o classificador OpenRouter nas configurações.'},409);
   const key=await secret(uid,'ai');if(!key)return json({error:'Cadastre sua chave OpenRouter.'},409);
   const token=crypto.randomUUID();const {data:claim}=await checked(db.rpc('torre_claim_triage',{p_user:uid,p_capture:input.captureId,p_token:token}));
   if(claim.taskIds)return json({ok:true,taskIds:claim.taskIds});
   try{
    const {data:labels}=await checked(db.from('torre_labels').select('id,name,description').eq('user_id',uid).eq('archived',false));
    const {results,audit}=await triageMany({text:claim.text,labels:labels??[]},key,claim.mode);
    const {data:taskIds}=await checked(db.rpc('torre_finish_triage_many',{p_user:uid,p_capture:input.captureId,p_token:token,p_text:claim.text,p_results:results,p_audit:audit}));return json({ok:true,taskIds});
   }catch(e){await db.from('torre_captures').update({state:'error',error:(e as Error).message,triage_token:null,triage_until:null}).eq('id',input.captureId).eq('user_id',uid).eq('triage_token',token);throw e;}
  }
  if(input.action==='plan-propose'){
   const ids=input.taskIds;
   if(!Array.isArray(ids)||ids.length<1||ids.length>20||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[0-9a-f-]{36}$/i.test(x)))throw new Error('Selecione de 1 a 20 tarefas.');
   const start=Date.parse(input.start),end=Date.parse(input.end);
   if(!Number.isFinite(start)||!Number.isFinite(end)||end-start<6*86400000||end-start>8*86400000||end<=Date.now())throw new Error('Semana inválida.');
   if(typeof input.instruction!=='string'||input.instruction.length>1000)throw new Error('Orientação de até mil caracteres.');
   const {data:settings}=await checked(db.from('torre_ai_settings').select('enabled').eq('user_id',uid).maybeSingle());if(!settings?.enabled)throw new Error('Ative a IA nas configurações.');
   const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre sua chave OpenRouter.');
   const {data:snapshot}=await checked(db.rpc('torre_plan_snapshot',{p_user:uid,p_tasks:ids}));
   if(snapshot.tasks.length!==ids.length||snapshot.tasks.some((t:any)=>t.archived_at||t.status!=='todo'||snapshot.blocks.some((b:any)=>b.task_id===t.id)))throw new Error('Selecione somente pendências sem reserva.');
   const g=snapshot.google;if(g?.connected&&(!g.calendar_synced_at||Date.parse(g.calendar_synced_at)<Date.now()-300000||g.error||!g.range_start||!g.range_end||Date.parse(g.range_start)>start||Date.parse(g.range_end)<end))throw new Error('Atualize a agenda antes de gerar a proposta.');
   const proposal=await propose(snapshot,new Date(start).toISOString(),new Date(end).toISOString(),input.instruction,key);
   const {data:saved}=await checked(db.from('torre_week_proposals').insert({user_id:uid,task_ids:ids,range_start:new Date(start).toISOString(),range_end:new Date(end).toISOString(),snapshot,placements:proposal.placements}).select('id,expires_at').single());
   return json({...proposal,...saved,model:extractionModel});
  }
  if(input.action==='plan-apply'){
   const {data:taskIds}=await checked(db.rpc('torre_apply_week_proposal',{p_user:uid,p_proposal:input.proposalId,p_tasks:input.taskIds,p_placements:input.placements??null}));return json({ok:true,taskIds});
  }
  if(input.action==='connect'){
   if(!Deno.env.get('GOOGLE_CLIENT_ID')||!Deno.env.get('GOOGLE_CLIENT_SECRET'))return json({error:'Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos segredos do Supabase.'},503);
   const state=crypto.randomUUID();await checked(db.rpc('torre_oauth_state',{p_state:state,p_user:uid}));
   const params=new URLSearchParams({client_id:Deno.env.get('GOOGLE_CLIENT_ID')!,redirect_uri:callback,response_type:'code',access_type:'offline',prompt:'consent',state,scope:'openid email https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.readonly'});
   return json({url:'https://accounts.google.com/o/oauth2/v2/auth?'+params});
  }
  if(input.action==='disconnect'){
   const raw=await secret(uid,'google');if(raw){const token=JSON.parse(raw).refresh_token;await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});}
   await secret(uid,'google',undefined,true);await checked(db.from('torre_google_status').update({connected:false,error:null}).eq('user_id',uid));return json({ok:true});
  }
  const token=await googleToken(uid);
  if(input.action==='discover')await discover(uid,token);
  else if(input.action==='sync'){try{await syncTasks(uid,token);const released=await syncCalendar(uid,token,input.start,input.end);return json({ok:true,released});}catch(e){await db.from('torre_google_status').update({error:(e as Error).message}).eq('user_id',uid);throw e;}}
  else if(input.action==='retry'){await checked(db.from('torre_sync_jobs').update({next_attempt_at:new Date().toISOString()}).eq('user_id',uid));await completeJobs(uid,token);}
  else throw new Error('Ação desconhecida');return json({ok:true});
 }catch(e){return json({error:(e as Error).message??'Falha na integração.'},400);}
});
