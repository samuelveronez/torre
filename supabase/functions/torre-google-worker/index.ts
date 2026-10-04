import {db,checked,googleToken,completeJobs} from '../_shared/google.ts';
Deno.serve(async(req)=>{
 try{
  const token=req.headers.get('x-torre-worker');if(!token)return new Response('Unauthorized',{status:401});
  const {data:allowed}=await checked(db.rpc('torre_worker_authorized',{p_token:token}));if(!allowed)return new Response('Unauthorized',{status:401});
  const {data:jobs}=await checked(db.from('torre_sync_jobs').select('user_id').lte('next_attempt_at',new Date().toISOString()).limit(100));
  let users=0;for(const user of new Set((jobs??[]).map(j=>j.user_id))){try{await completeJobs(user,await googleToken(user));users++;}catch{/* Reconnection is signaled by googleToken; leave the queue intact. */}}
  return Response.json({processedUsers:users});
 }catch{return Response.json({error:'Worker failed'},{status:500});}
});
