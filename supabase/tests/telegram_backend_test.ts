// Network calls are mocked; no real credentials, AI requests or messages are used.
Deno.env.set('SUPABASE_URL','https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service-key');
const {summary,sendDigest}=await import('../functions/_shared/telegram.ts');
const assert=(ok:unknown,label:string)=>{if(!ok)throw new Error(label);};
Deno.test('digest uses owner-scoped snapshots, private keys stay out of prompts, and sends only after valid AI output',async()=>{
 const original=globalThis.fetch;let sends=0,aiFail=false,changed=false,paid=false;const uid='10000000-0000-4000-8000-000000000001';let prompt:any;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);const body=typeof init?.body==='string'?JSON.parse(init.body):{};
  const reply=(value:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}}));
  if(url.pathname==='/rest/v1/rpc/torre_secret'){assert(body.p_user===uid,'secret belongs to owner');return reply(body.p_kind==='ai'?'synthetic-ai-secret':JSON.stringify({botName:'test_bot',token:'synthetic-telegram-secret'}));}
  if(url.hostname==='test.supabase.co'){
   assert(url.searchParams.get('user_id')==='eq.'+uid,'query belongs to owner');
   if(url.pathname.endsWith('/torre_ai_settings'))return reply({default_model:paid?'google/gemini-2.5-flash':'openrouter/free'});
   if(url.pathname.endsWith('/torre_telegram_settings'))return reply({chat_id:123,enabled:!changed});
   if(url.pathname.endsWith('/torre_google_status'))return reply({connected:true,calendar_synced_at:'2026-10-01T12:00:00Z',range_start:'2026-10-01T00:00:00Z',range_end:'2026-10-02T00:00:00Z',error:null});
   if(url.pathname.endsWith('/torre_tasks'))return reply(url.searchParams.has('completed_at')?[{title:'Tarefa feita',completed_at:'2026-10-07T12:00:00Z'}]:[{id:'private-id',title:'Pendência',status:'waiting',follow_up_date:'2026-10-08'}]);
   if(url.pathname.endsWith('/torre_calendar_events')){assert(url.searchParams.get('torre_calendars.selected')==='eq.true','only selected calendars');assert(url.searchParams.get('or')?.includes('response_status.is.null'),'unknown response stays visible');return reply([{title:'Ocupado',torre_calendars:{selected:true}}]);}
   return reply([]);
  }
  if(url.hostname==='openrouter.ai'){
   prompt=body;assert(!JSON.stringify(prompt).includes('synthetic-ai-secret'),'AI key never in prompt');assert(!JSON.stringify(prompt).includes('synthetic-telegram-secret'),'bot token never in prompt');
   if(aiFail)return reply({error:'synthetic'},429);return reply({model:body.model==='openrouter/free'?'test/model:free':body.model,choices:[{message:{content:'Fechamento de 07/10: uma tarefa concluída. Preparação de 08/10: acompanhar pendência.'}}]});
  }
  if(url.hostname==='api.telegram.org'){sends++;assert(body.chat_id===123,'only bound chat receives summary');return reply({ok:true,result:{message_id:7}});}
  throw new Error('Unexpected request');
 };
 try{
  const result=await summary(uid,'2026-10-07');assert(result.date==='2026-10-07','correct digest date');const data=JSON.parse(prompt.messages[1].content);assert(data.dates.tomorrow==='2026-10-08','next day');assert(!JSON.stringify(data).includes('private-id'),'internal task IDs omitted');assert(data.calendarSync.range_end==='2026-10-02T00:00:00Z','freshness exposed to summarizer');
  paid=true;await summary(uid,'2026-10-07');assert(prompt.model==='google/gemini-2.5-flash','Telegram follows global paid model');paid=false;
  const sent=await sendDigest(uid,'2026-10-07');assert(sent.messageId===7&&sends===1,'message confirmation');
  aiFail=true;let failed=false;try{await sendDigest(uid);}catch{failed=true;}assert(failed&&sends===1,'failed AI sends no message');
  aiFail=false;changed=true;failed=false;try{await sendDigest(uid,'2026-10-07');}catch{failed=true;}assert(failed&&sends===1,'disabled schedule cannot send');
 }finally{globalThis.fetch=original;}
});
