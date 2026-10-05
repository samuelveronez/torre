import {classify,classifierModel} from '../_shared/openrouter.ts';
import {db,checked,secret,googleToken,completeJobs,discover,syncTasks,syncCalendar,callback,site} from '../_shared/google.ts';
const cors={'Access-Control-Allow-Origin':new URL(site).origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
 const headers={...cors};const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
 const origin=req.headers.get('Origin');if(origin&&['http://127.0.0.1:5180','http://127.0.0.1:5173','http://127.0.0.1:5174',new URL(site).origin].includes(origin))headers['Access-Control-Allow-Origin']=origin;else headers['Access-Control-Allow-Origin']=new URL(site).origin;
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
   await classify({text:'Comprar frutas para minha casa',labels:[]},key);
   await checked(db.from('torre_ai_settings').upsert({user_id:uid,has_key:true,provider:'openrouter',model:classifierModel,enabled:true}));return json({ok:true,model:classifierModel});
  }
  if(input.action==='triage'){
   if(typeof input.captureId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.captureId))return json({error:'Captura inválida.'},400);
   const {data:settings}=await checked(db.from('torre_ai_settings').select('*').eq('user_id',uid).maybeSingle());
   if(!settings?.enabled||settings.provider!=='openrouter'||settings.model!==classifierModel)return json({error:'Ative o classificador OpenRouter nas configurações.'},409);
   const key=await secret(uid,'ai');if(!key)return json({error:'Cadastre sua chave OpenRouter.'},409);
   const token=crypto.randomUUID();const {data:claim}=await checked(db.rpc('torre_claim_triage',{p_user:uid,p_capture:input.captureId,p_token:token}));
   if(claim.taskId)return json({ok:true,taskId:claim.taskId});
   try{
    const {data:labels}=await checked(db.from('torre_labels').select('id,name,description').eq('user_id',uid).eq('archived',false));
    const {result,audit}=await classify({text:claim.text,labels:labels??[]},key);
    const {data:taskId}=await checked(db.rpc('torre_finish_triage',{p_user:uid,p_capture:input.captureId,p_token:token,p_text:claim.text,p_result:result,p_audit:audit}));return json({ok:true,taskId});
   }catch(e){await db.from('torre_captures').update({state:'error',error:(e as Error).message,triage_token:null,triage_until:null}).eq('id',input.captureId).eq('user_id',uid).eq('triage_token',token);throw e;}
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
