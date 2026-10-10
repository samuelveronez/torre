import {db,checked,googleToken,completeJobs} from '../_shared/google.ts';
Deno.serve(async(req)=>{
 try{
  const token=req.headers.get('x-torre-worker');if(!token)return new Response('Unauthorized',{status:401});
  const {data:allowed}=await checked(db.rpc('torre_worker_authorized',{p_token:token}));if(!allowed)return new Response('Unauthorized',{status:401});
  // Tasks are import-only; retain legacy queue records for audit.
  return Response.json({processedUsers:0,mode:'import-only'});
 }catch{return Response.json({error:'Worker failed'},{status:500});}
});
