import {db,checked,secret,credentials,telegramApi,sha} from '../_shared/telegram.ts';
Deno.serve(async req=>{
 const json=(status=200)=>new Response(JSON.stringify({ok:status===200}),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return json(405);
 const uid=new URL(req.url).searchParams.get('owner');if(!uid||!/^[0-9a-f-]{36}$/i.test(uid))return json(401);
 try{
  const expected=await secret(uid,'telegram-hook');const header=req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if(!expected||!header||await sha(expected)!==await sha(header))return json(401);
  const input=await req.json();const m=input.message;
  if(!m||m.chat?.type!=='private'||m.from?.is_bot||!Number.isSafeInteger(m.chat.id)||m.from?.id!==m.chat.id)return json();
  const nonce=typeof m.text==='string'?m.text.match(/^\/start(?:@\w+)? ([a-f0-9]{32})$/)?.[1]:null;
  if(!nonce)return json();
  const bound=await checked(db.rpc('torre_telegram_bind',{p_user:uid,p_hash:await sha(nonce),p_chat:m.chat.id}));
  if(bound){const bot=await credentials(uid);await telegramApi(bot.token,'sendMessage',{chat_id:m.chat.id,text:'Seu Telegram foi vinculado à Torre de Controle. Volte a Configurações → Telegram para escolher os dias e o horário do resumo.'});}
  return json();
 }catch{return json(500);}
});
