import {db,checked,secret,callback,site,api,discover} from '../_shared/google.ts';
Deno.serve(async(req)=>{
 try{
  const url=new URL(req.url);const state=url.searchParams.get('state');if(!state)throw new Error('Estado ausente');
  const {data:user}=await checked(db.rpc('torre_oauth_state',{p_state:state}));if(!user)throw new Error('Autorização expirada');
  if(url.searchParams.has('error'))throw new Error('Autorização não concedida');
  const code=url.searchParams.get('code');if(!code)throw new Error('Código ausente');
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,redirect_uri:callback,grant_type:'authorization_code',client_id:Deno.env.get('GOOGLE_CLIENT_ID')!,client_secret:Deno.env.get('GOOGLE_CLIENT_SECRET')!})});
  if(!res.ok)throw new Error('Falha na troca de autorização');const tokens=await res.json();
  const previous=await secret(user,'google');tokens.refresh_token??=previous?JSON.parse(previous).refresh_token:null;if(!tokens.refresh_token)throw new Error('Autorize o acesso offline novamente');
  await secret(user,'google',JSON.stringify({...tokens,expires_at:Date.now()+tokens.expires_in*1000}));
  const profile=await api(tokens.access_token,'oauth2/v2/userinfo');await checked(db.from('torre_google_status').upsert({user_id:user,email:profile.email,connected:true,error:null}));
  await discover(user,tokens.access_token);
  return Response.redirect(site+'?google=connected',303);
 }catch{return Response.redirect(site+'?google=error',303);}
});
