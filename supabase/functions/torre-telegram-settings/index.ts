import {db,checked,secret,config,credentials,telegramApi,sha,sendDigest} from '../_shared/telegram.ts';
import {validateSchedule} from '../_shared/telegramDigest.ts';
const origins=['https://torre.veronez.app','https://samuelveronez.github.io','http://127.0.0.1:5173','http://127.0.0.1:5174','http://127.0.0.1:5180','http://127.0.0.1:5181'];
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!bearer)return json({error:'Entre na Torre.'},401);
 const {data:{user},error}=await db.auth.getUser(bearer);if(error||!user)return json({error:'Sessão inválida.'},401);
 const uid=user.id;
 try{
  const input=await req.json();
  if(input.action==='status'){
   const raw=await secret(uid,'telegram');const stored=raw?JSON.parse(raw):null;const cfg=await config(uid);
   const last=await checked(db.from('torre_telegram_deliveries').select('digest_date,state,sent_at,error').eq('user_id',uid).order('digest_date',{ascending:false}).limit(1));
   return json({botName:stored?.botName||'',hasToken:!!stored?.token,linked:!!cfg?.chat_id,enabled:cfg?.enabled??false,weekdays:cfg?.weekdays??[0,1,2,3,4,5,6],sendTime:cfg?.send_time?.slice(0,5)||'21:00',testAfter:cfg?.test_after||null,last:last[0]||null});
  }
  if(input.action==='save'){
   const old=await secret(uid,'telegram');const stored=old?JSON.parse(old):null;
   if(typeof input.botName!=='string'||typeof input.token!=='string')throw new Error('Informe nome e token do bot.');
   const botName=input.botName.trim().replace(/^@/,'');const token=input.token.trim()||stored?.token;
   if(!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(botName)||!botName.toLowerCase().endsWith('bot'))throw new Error('Informe o nome de usuário do bot, terminado em bot.');
   if(!token||!/^\d{5,20}:[A-Za-z0-9_-]{20,200}$/.test(token))throw new Error('Informe um token válido do BotFather.');
   const identity=await telegramApi(token,'getMe',{});if(identity.username?.toLowerCase()!==botName.toLowerCase())throw new Error('O token pertence a outro bot. Confira o nome.');
   if(stored?.token!==token)await checked(db.from('torre_telegram_settings').upsert({user_id:uid,chat_id:null,enabled:false,link_hash:null,link_expires_at:null}));
   await secret(uid,'telegram',JSON.stringify({botName:identity.username,token}));return json({botName:identity.username,hasToken:true});
  }
  if(input.action==='remove'){
   await checked(db.from('torre_telegram_settings').delete().eq('user_id',uid));
   await secret(uid,'telegram',null,true);await secret(uid,'telegram-hook',null,true);return json({hasToken:false});
  }
  if(input.action==='link'){
   const bot=await credentials(uid);const identity=await telegramApi(bot.token,'getMe',{});
   const url=`${Deno.env.get('SUPABASE_URL')}/functions/v1/torre-telegram-webhook?owner=${uid}`;
   const current=await telegramApi(bot.token,'getWebhookInfo',{});
   if(current.url&&current.url!==url)throw new Error('Este bot já tem outra integração. Use um bot dedicado à Torre.');
   let hook=await secret(uid,'telegram-hook');if(!hook){hook=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');await secret(uid,'telegram-hook',hook);}
   const nonce=crypto.randomUUID().replaceAll('-','');
   await checked(db.from('torre_telegram_settings').upsert({user_id:uid,link_hash:await sha(nonce),link_expires_at:new Date(Date.now()+10*60000).toISOString()}));
   await telegramApi(bot.token,'setWebhook',{url,secret_token:hook,allowed_updates:['message']});
   return json({url:`https://t.me/${identity.username}?start=${nonce}`});
  }
  if(input.action==='schedule'){
   const schedule=validateSchedule(input);const cfg=await config(uid);
   if(schedule.enabled&&!cfg?.chat_id)throw new Error('Vincule seu chat antes de ativar o lembrete.');
   if(schedule.enabled&&!(await secret(uid,'ai')))throw new Error('Cadastre a chave OpenRouter em Configurações → IA.');
   await credentials(uid);await checked(db.from('torre_telegram_settings').upsert({user_id:uid,...schedule,updated_at:new Date().toISOString()}));return json({ok:true});
  }
  if(input.action==='test'){
   const cfg=await config(uid);
   if(!cfg?.chat_id)return json({error:'Vincule seu chat do Telegram antes de enviar o resumo.',code:'CHAT_NOT_LINKED'},409);
   const after=new Date(Date.now()+60000).toISOString();
   const claimed=await checked(db.from('torre_telegram_settings').update({test_after:after}).eq('user_id',uid).not('chat_id','is',null).or(`test_after.is.null,test_after.lte.${new Date().toISOString()}`).select('user_id'));
   if(!claimed.length){const current=await config(uid);if(!current?.chat_id)return json({error:'Vincule seu chat do Telegram antes de enviar o resumo.',code:'CHAT_NOT_LINKED'},409);const seconds=Math.max(1,Math.ceil((Date.parse(current.test_after)-Date.now())/1000));return json({error:`Seu chat está vinculado. Aguarde ${seconds} segundos para enviar outro teste.`,code:'TEST_COOLDOWN',retryAfter:seconds,testAfter:current.test_after},429);}
   let sending=false;
   try{const result=await sendDigest(uid,undefined,async()=>{sending=true;});return json({ok:true,delivered:true,messageId:result.messageId,testAfter:after});}
   catch(e){if(!sending)await checked(db.from('torre_telegram_settings').update({test_after:null}).eq('user_id',uid).eq('test_after',after));throw e;}
  }
  return json({error:'Ação inválida.'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Não foi possível configurar o Telegram.'},400);}
});
