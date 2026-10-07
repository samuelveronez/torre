import {db,checked,sendDigest} from '../_shared/telegram.ts';
Deno.serve(async req=>{
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return json({error:'Método inválido.'},405);
 try{
  const token=req.headers.get('x-torre-worker');if(!token||!await checked(db.rpc('torre_worker_authorized',{p_token:token})))return json({error:'Não autorizado.'},401);
  const cutoff=new Date(Date.now()-10*60000).toISOString();
  await checked(db.from('torre_telegram_deliveries').update({state:'uncertain',error:'Envio sem confirmação. Confira o Telegram antes de enviar um teste.'}).eq('state','sending').lt('started_at',cutoff));
  await checked(db.from('torre_telegram_deliveries').update({state:'error',error:'Geração interrompida. Use Enviar resumo de teste para tentar novamente.'}).eq('state','generating').lt('started_at',cutoff));
  const jobs=await checked(db.rpc('torre_telegram_claim'));
  const results=await Promise.all(jobs.map(async(job:any)=>{
   let sending=false;
   try{
    const result=await sendDigest(job.user_id,job.digest_date,async()=>{await checked(db.from('torre_telegram_deliveries').update({state:'sending'}).eq('id',job.id));sending=true;});
    await checked(db.from('torre_telegram_deliveries').update({state:'sent',sent_at:new Date().toISOString(),model:result.model,telegram_message_id:result.messageId}).eq('id',job.id));return true;
   }catch(e){await checked(db.from('torre_telegram_deliveries').update({state:sending?'uncertain':'error',error:e instanceof Error?e.message:'Falha no resumo.'}).eq('id',job.id));return false;}
  }));
  return json({processed:results.length,sent:results.filter(Boolean).length});
 }catch{return json({error:'Falha no processamento dos lembretes.'},500);}
});
