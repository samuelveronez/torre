import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {invitationResponse,blocksPlanning} from './calendar.ts';
export const site='https://torre.veronez.app/';
export const callback=`${Deno.env.get('SUPABASE_URL')}/functions/v1/torre-google-callback`;
export const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
export async function checked<T extends {error:unknown}>(promise:PromiseLike<T>):Promise<T>{const result=await promise;if(result.error)throw result.error;return result;}
export async function secret(user:string,kind:string,value?:string,remove=false){const {data}=await checked(db.rpc('torre_secret',{p_user:user,p_kind:kind,p_value:value??null,p_delete:remove}));return data as string|null;}
export async function googleToken(user:string){
 const raw=await secret(user,'google');if(!raw)throw new Error('Conecte sua conta Google.');const tokens=JSON.parse(raw);
 if(tokens.expires_at>Date.now()+60000)return tokens.access_token;
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:Deno.env.get('GOOGLE_CLIENT_ID')??'',client_secret:Deno.env.get('GOOGLE_CLIENT_SECRET')??'',refresh_token:tokens.refresh_token,grant_type:'refresh_token'})});
 if(!res.ok){await db.from('torre_google_status').update({connected:false,error:'Autorização expirada. Reconecte o Google.'}).eq('user_id',user);throw new Error('Reconecte o Google.');}
 const data=await res.json();await secret(user,'google',JSON.stringify({...tokens,...data,expires_at:Date.now()+data.expires_in*1000}));return data.access_token;
}
export async function api(token:string,path:string,options:RequestInit={}){
 const response=await fetch(`https://www.googleapis.com/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
 if(!response.ok)throw Object.assign(new Error(`Google respondeu ${response.status}. Tente sincronizar novamente.`),{status:response.status});
 return response.status===204?{}:await response.json();
}
export async function pages(token:string,path:string){let result:any[]=[];let page='';do{const data=await api(token,`${path}${path.includes('?')?'&':'?'}maxResults=100${page?'&pageToken='+encodeURIComponent(page):''}`);result.push(...(data.items??[]));page=data.nextPageToken??'';}while(page);return result;}
export async function discover(user:string,token:string){
 const [lists,calendars]=await Promise.all([pages(token,'tasks/v1/users/@me/lists'),pages(token,'calendar/v3/users/me/calendarList')]);
 const l=await checked(db.from('torre_google_lists').select('*').eq('user_id',user));const c=await checked(db.from('torre_calendars').select('*').eq('user_id',user));
 if(lists.length)await checked(db.from('torre_google_lists').upsert(lists.map(x=>({user_id:user,id:x.id,name:x.title,selected:l.data?.find(y=>y.id===x.id)?.selected??false,area:l.data?.find(y=>y.id===x.id)?.area??'personal'}))));
 if(calendars.length)await checked(db.from('torre_calendars').upsert(calendars.map(x=>{const old=c.data?.find(y=>y.id===x.id);return {user_id:user,id:x.id,name:x.summary,access_role:x.accessRole,color:x.backgroundColor??'#64748b',timezone:x.timeZone??'America/Sao_Paulo',selected:old?.selected??false,blocks_time:old?.blocks_time??true,mode:x.accessRole==='freeBusyReader'?'busy':old?.mode??'busy'};})));
}
export async function completeJobs(user:string,token:string){
 const jobs=await checked(db.from('torre_sync_jobs').select('*').eq('user_id',user).lte('next_attempt_at',new Date().toISOString()));
 for(const job of jobs.data??[]){try{const {data:task}=await checked(db.from('torre_tasks').select('*').eq('id',job.task_id).single());
  if(task.status!=='completed'||!task.google_completion_pending){await checked(db.from('torre_sync_jobs').delete().eq('id',job.id));continue;}
  await api(token,`tasks/v1/lists/${encodeURIComponent(task.google_list_id)}/tasks/${encodeURIComponent(task.google_task_id)}`,{method:'PATCH',body:JSON.stringify({status:'completed'})});
  await checked(db.from('torre_tasks').update({google_completion_pending:false,sync_error:null}).eq('id',task.id));await checked(db.from('torre_sync_jobs').delete().eq('id',job.id));
 }catch(e){const error=String((e as Error).message??e);await db.from('torre_sync_jobs').update({attempts:job.attempts+1,next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(job.attempts,6))).toISOString(),error}).eq('id',job.id);await db.from('torre_tasks').update({sync_error:error}).eq('id',job.task_id);}}
}
export async function syncTasks(user:string,token:string){
 await completeJobs(user,token);const {data:lists}=await checked(db.from('torre_google_lists').select('*').eq('user_id',user).eq('selected',true));
 for(const list of lists??[]){const items=await pages(token,`tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=true&showHidden=true&showDeleted=true`);
  for(const item of items){const {data:old}=await checked(db.from('torre_tasks').select('*').eq('user_id',user).eq('google_list_id',list.id).eq('google_task_id',item.id).maybeSingle());
   if(item.deleted){if(old)await checked(db.from('torre_tasks').update({archived_at:new Date().toISOString(),google_completion_pending:false}).eq('id',old.id));continue;}
   const fields={title:(item.title?.trim()||'Tarefa sem título').slice(0,180),description:item.notes??'',due_date:item.due?.slice(0,10)??null,google_updated_at:item.updated,status:old?.google_completion_pending?'completed':item.status==='completed'?'completed':old?.status==='waiting'?'waiting':'todo',archived_at:null};
   if(old)await checked(db.from('torre_tasks').update(fields).eq('id',old.id));else {const inserted=await checked(db.from('torre_tasks').insert({...fields,user_id:user,source:'google_tasks',google_list_id:list.id,google_task_id:item.id,area:list.area}).select('id').single());await checked(db.from('torre_tasks').update({google_completion_pending:false}).eq('id',inserted.data!.id));}
  }
 }
 await checked(db.from('torre_google_status').update({tasks_synced_at:new Date().toISOString()}).eq('user_id',user));
}
export function midnight(date:string,tz:string){let time=new Date(date+'T00:00:00Z').getTime();const target=time;for(let n=0;n<3;n++){const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(time);const get=(k:string)=>parts.find(p=>p.type===k)!.value;const local=Date.UTC(+get('year'),+get('month')-1,+get('day'),+get('hour'),+get('minute'),+get('second'));time+=target-local;}return new Date(time).toISOString();}
export async function syncCalendar(user:string,token:string,start:string,end:string){
 if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start)||Date.parse(end)-Date.parse(start)>32*86400000)throw new Error('Intervalo de agenda inválido.');
 const {data:calendars}=await checked(db.from('torre_calendars').select('*').eq('user_id',user).eq('selected',true));const events:any[]=[];const notices:string[]=[];
 const {data:account}=await checked(db.from('torre_google_status').select('email').eq('user_id',user).maybeSingle());
 for(const c of calendars??[]){
  if(c.mode==='busy'||c.access_role==='freeBusyReader'){
   const data=await api(token,'calendar/v3/freeBusy',{method:'POST',body:JSON.stringify({timeMin:start,timeMax:end,timeZone:c.timezone,items:[{id:c.id}]})});const result=data.calendars?.[c.id];if(!result||result.errors?.length)throw new Error('Sem acesso à disponibilidade de '+c.name);
   const busy=result.busy??[];
   let items:any[]|null=null;
   try{items=await pages(token,`calendar/v3/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&fields=${encodeURIComponent('nextPageToken,items(id,status,start,end)')}`);}
   catch(e){if(![403,404].includes((e as {status?:number}).status??0))throw e;}
   if(items&&!items.some(e=>e.status!=='cancelled'&&e.start&&e.end)&&busy.length)items=null;
   if(items===null){
    notices.push(`${c.name}: o Google não disponibilizou os eventos individuais à Torre. Exibindo os intervalos consolidados de ocupado; as sobreposições não podem ser detalhadas nesta sincronização.`);
    for(const b of busy)events.push({calendar_id:c.id,id:`busy:${b.start}:${b.end}`,title:'Ocupado',location:null,start_at:b.start,end_at:b.end,all_day:false,blocks_time:c.blocks_time,response_status:null});
   }else{
    for(const e of items){if(e.status==='cancelled'||!e.start||!e.end)continue;const allDay=!!e.start.date;const from=allDay?midnight(e.start.date,c.timezone):e.start.dateTime;const to=allDay?midnight(e.end.date,c.timezone):e.end.dateTime;
     events.push({calendar_id:c.id,id:e.id,title:'Ocupado',location:null,start_at:from,end_at:to,all_day:allDay,blocks_time:c.blocks_time&&busy.some((b:{start:string;end:string})=>Date.parse(b.start)<Date.parse(to)&&Date.parse(b.end)>Date.parse(from)),response_status:null,display_only:true});
    }
    // FreeBusy is authoritative for automatic planning; anonymous events are for display.
    for(const b of busy)events.push({calendar_id:c.id,id:`busy:${b.start}:${b.end}`,start_at:b.start,end_at:b.end,blocks_time:c.blocks_time,availability_only:true});
   }
  }else{
   const items=await pages(token,`calendar/v3/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&showHiddenInvitations=true&timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`);
   for(const e of items){if(e.status==='cancelled')continue;const allDay=!!e.start.date;const response=invitationResponse(e,account?.email??null,c.id);events.push({calendar_id:c.id,id:e.id,title:e.summary||'Ocupado',location:e.visibility==='private'?null:e.location??null,start_at:allDay?midnight(e.start.date,c.timezone):e.start.dateTime,end_at:allDay?midnight(e.end.date,c.timezone):e.end.dateTime,all_day:allDay,blocks_time:blocksPlanning(c.blocks_time,e.transparency,response),response_status:response});}
  }
 }
 const applied=(await checked(db.rpc('torre_apply_calendar',{p_user:user,p_start:start,p_end:end,p_events:events}))).data;
 if(notices.length)await checked(db.from('torre_google_status').update({notice:notices.join('\n')}).eq('user_id',user));
 return applied;
}
