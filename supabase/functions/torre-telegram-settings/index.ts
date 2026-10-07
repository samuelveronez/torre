import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const origins=['https://torre.veronez.app','https://samuelveronez.github.io','http://127.0.0.1:5173','http://127.0.0.1:5174','http://127.0.0.1:5180','http://127.0.0.1:5181'];
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!bearer)return json({error:'Entre na Torre.'},401);
 const {data:{user},error}=await db.auth.getUser(bearer);if(error||!user)return json({error:'Sessão inválida.'},401);
 async function secret(value:string|null=null,remove=false){const {data,error}=await db.rpc('torre_secret',{p_user:user!.id,p_kind:'telegram',p_value:value,p_delete:remove});if(error)throw new Error('Não foi possível acessar as configurações do Telegram.');return data as string|null;}
 try{
  const input=await req.json();
  if(input.action==='remove'){await secret(null,true);return json({hasToken:false});}
  if(!['status','save'].includes(input.action))return json({error:'Ação inválida.'},400);
  const raw=await secret();const stored=raw?JSON.parse(raw):null;
  if(input.action==='status')return json({botName:stored?.botName||'',hasToken:!!stored?.token});
  if(typeof input.botName!=='string'||typeof input.token!=='string')return json({error:'Informe nome e token do bot.'},400);
  const botName=input.botName.trim().replace(/^@/,'');const token=input.token.trim()||stored?.token;
  if(!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(botName)||!botName.toLowerCase().endsWith('bot'))return json({error:'Informe o nome de usuário do bot, terminado em bot.'},400);
  if(!token||!/^\d{5,20}:[A-Za-z0-9_-]{20,200}$/.test(token))return json({error:'Informe um token válido do BotFather.'},400);
  await secret(JSON.stringify({botName,token}));return json({botName,hasToken:true});
 }catch{return json({error:'Não foi possível salvar ou carregar o Telegram. Tente novamente.'},400);}
});
