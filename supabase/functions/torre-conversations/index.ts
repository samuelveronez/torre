import {selectedAiModel} from '../_shared/aiSettings.ts';
import {db,checked,secret,site} from '../_shared/google.ts';
import {extractConversation} from '../_shared/conversationExtraction.ts';
import {validDate} from '../_shared/conversationModel.ts';
const allowed=[new URL(site).origin,'https://samuelveronez.github.io','http://127.0.0.1:5173','http://127.0.0.1:5174','http://127.0.0.1:5180'];
Deno.serve(async req=>{
 const origin=req.headers.get('Origin');const headers={'Access-Control-Allow-Origin':origin&&allowed.includes(origin)?origin:new URL(site).origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'Método inválido.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return json({error:'Entre novamente.'},401);
  const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return json({error:'Sessão inválida.'},401);
  const input=await req.json();
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>20000||!validDate(input.date)||typeof input.personId!=='string')return json({error:'Informe texto e data válidos.'},400);
  const {data:person}=await checked(db.from('torre_people').select('name').eq('id',input.personId).eq('user_id',user.id).single());
  const {data:settings}=await checked(db.from('torre_ai_settings').select('enabled,provider').eq('user_id',user.id).maybeSingle());
  if(!settings?.enabled||settings.provider!=='openrouter')return json({error:'Ative a IA em Configurações. Você pode preencher o formulário manualmente.'},409);
  const key=await secret(user.id,'ai');if(!key)return json({error:'Cadastre sua chave OpenRouter.'},409);
  if(!person)throw new Error('Pessoa não encontrada nesta conta.');
  return json(await extractConversation(input.text,input.date,person.name,key,await selectedAiModel(db,user.id)));
 }catch(e){return json({error:e instanceof Error?e.message:'Não foi possível organizar. Seu texto permanece salvo.'},400);}
});
