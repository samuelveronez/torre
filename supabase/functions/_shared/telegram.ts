import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {digestDates,summaryInstructions} from './telegramDigest.ts';
export const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
export async function checked(p:PromiseLike<any>){const r=await p;if(r.error)throw new Error('Não foi possível acessar os dados da Torre.');return r.data;}
export async function secret(uid:string,kind:string,value:string|null=null,remove=false){return await checked(db.rpc('torre_secret',{p_user:uid,p_kind:kind,p_value:value,p_delete:remove})) as string|null;}
export async function config(uid:string){return await checked(db.from('torre_telegram_settings').select('*').eq('user_id',uid).maybeSingle());}
export async function credentials(uid:string){const raw=await secret(uid,'telegram');if(!raw)throw new Error('Cadastre as credenciais do Telegram.');return JSON.parse(raw);}
export async function telegramApi(token:string,method:string,body:unknown){
 let response:Response;try{response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{throw new Error('Telegram não confirmou a resposta.');}
 let data:any;try{data=await response.json();}catch{throw new Error('Telegram não confirmou a resposta.');}
 if(!response.ok||!data.ok)throw new Error(method==='getMe'?'Token do Telegram inválido ou indisponível.':'Telegram recusou a operação. Verifique se o bot foi iniciado e não está bloqueado.');return data.result;
}
export async function sha(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export async function summary(uid:string,date?:string){
 const dates=digestDates(date?new Date(date+'T12:00:00-03:00'):new Date());
 const key=await secret(uid,'ai');if(!key)throw new Error('Cadastre a chave OpenRouter em Configurações → IA.');
 const [completed,active,blocks,events,busy,google]=await Promise.all([
  checked(db.from('torre_tasks').select('title,area,completed_at').eq('user_id',uid).is('archived_at',null).gte('completed_at',dates.start).lt('completed_at',dates.end).order('completed_at').limit(101)),
  checked(db.from('torre_tasks').select('id,title,area,due_date,status,waiting_for,follow_up_date,priority,duration_minutes').eq('user_id',uid).is('archived_at',null).neq('status','completed').order('due_date',{nullsFirst:false}).limit(201)),
  checked(db.from('torre_scheduled_blocks').select('task_id,start_at,end_at,torre_tasks(title,status)').eq('user_id',uid).lt('start_at',dates.nextEnd).gt('end_at',dates.start).order('start_at').limit(101)),
  checked(db.from('torre_calendar_events').select('title,start_at,end_at,all_day,response_status,torre_calendars!inner(selected)').eq('user_id',uid).eq('torre_calendars.selected',true).lt('start_at',dates.nextEnd).gt('end_at',dates.start).or('response_status.is.null,response_status.neq.declined').order('start_at').limit(101)),
  checked(db.from('torre_busy_blocks').select('start_at,end_at').eq('user_id',uid).eq('source','manual').lt('start_at',dates.nextEnd).gt('end_at',dates.start).order('start_at').limit(101)),
  checked(db.from('torre_google_status').select('connected,calendar_synced_at,range_start,range_end,error').eq('user_id',uid).maybeSingle())
 ]);
 const dataset={dates,generatedAt:new Date().toISOString(),timezone:'America/Sao_Paulo',completed:completed.slice(0,100),pending:active.slice(0,200).map(({id,...row}:any)=>row),reservations:blocks.slice(0,100).map(({task_id,...row}:any)=>row),calendar:events.slice(0,100).map(({torre_calendars,...row}:any)=>row),manualBusy:busy.slice(0,100),calendarSync:google,truncated:completed.length>100||active.length>200||blocks.length>100||events.length>100||busy.length>100};
 let response:Response;try{response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(55000),body:JSON.stringify({model:'openrouter/free',temperature:0.2,max_tokens:1400,messages:[{role:'system',content:summaryInstructions()},{role:'user',content:JSON.stringify(dataset)}]})});}catch{throw new Error('A IA demorou a responder. Tente novamente.');}
 if(!response.ok)throw new Error(response.status===429?'Limite da IA atingido. Tente novamente mais tarde.':'Não foi possível gerar o resumo com IA. Confira a chave OpenRouter.');
 const output=await response.json();const text=output.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim()||text.length>3800)throw new Error('A IA retornou um resumo inválido.');
 return {text:text.trim(),model:output.model||'openrouter/free',date:dates.today};
}
export async function sendDigest(uid:string,date?:string,onSending?:()=>Promise<void>){
 const cfg=await config(uid);if(!cfg?.chat_id)throw new Error('Vincule seu chat do Telegram primeiro.');
 const bot=await credentials(uid);const result=await summary(uid,date);
 const current=await config(uid);const currentBot=await credentials(uid);
 if(current?.chat_id!==cfg.chat_id||currentBot.token!==bot.token||date&&!current.enabled)throw new Error('A configuração mudou durante a geração. O envio foi cancelado.');
 if(onSending)await onSending();
 const msg=await telegramApi(bot.token,'sendMessage',{chat_id:cfg.chat_id,text:result.text,link_preview_options:{is_disabled:true}});
 return {...result,messageId:msg.message_id};
}
