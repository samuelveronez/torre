import {useEffect,useRef,useState,type SetStateAction} from 'react';
import {supabase} from './supabase';
import type {Task} from './task';
export type Hours={enabled:boolean;start:number;end:number};
async function check(result:PromiseLike<{error:unknown}>){const {error}=await result;if(error)throw error;}
export function useCloudData(userId:string,defaults:Hours[]){
 const [tasks,putTasks]=useState<Task[]>([]),[hours,putHours]=useState(defaults),[theme,putTheme]=useState<'light'|'dark'>('light'),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),loaded=useRef(false);
 async function load(){
  await check(supabase.rpc('torre_release_expired_blocks'));
  const results=await Promise.all([supabase.from('torre_tasks').select('*').is('archived_at',null).order('created_at'),supabase.from('torre_scheduled_blocks').select('*'),supabase.from('torre_work_hours').select('*'),supabase.from('torre_preferences').select('*').maybeSingle(),supabase.from('torre_task_labels').select('*')]);
  for(const result of results)if(result.error)throw result.error;
  const [t,b,h,p,labels]=results;
  if(!p.data)await check(supabase.from('torre_preferences').insert({user_id:userId}));
  const missing=defaults.flatMap((value,weekday)=>h.data?.some(row=>row.weekday===weekday)?[]:[{user_id:userId,weekday,enabled:value.enabled,start_time:`${String(value.start).padStart(2,'0')}:00`,end_time:`${String(value.end).padStart(2,'0')}:00`}]);
  if(missing.length)await check(supabase.from('torre_work_hours').upsert(missing,{ignoreDuplicates:true}));
  putTasks((t.data??[]).map(row=>({id:row.id,labelIds:labels.data?.filter(l=>l.task_id===row.id).map(l=>l.label_id)??[],captureId:row.capture_id,googleTaskId:row.google_task_id,completionPending:row.google_completion_pending,syncError:row.sync_error,title:row.title,area:row.area==='personal'?'Pessoal':'Profissional',minutes:row.duration_minutes,due:row.due_date??'',source:row.source==='torre'?'Torre':'Google Tasks',done:row.status==='completed',situation:row.status==='waiting'?'waiting':'todo',description:row.description,link:row.reference_url??'',waitingFor:row.waiting_for??'',followUp:row.follow_up_date??'',at:b.data?.find(block=>block.task_id===row.id)?.start_at})));
  putHours(defaults.map((value,weekday)=>{const row=h.data?.find(r=>r.weekday===weekday);return row?{enabled:row.enabled,start:Number(row.start_time.slice(0,2)),end:Number(row.end_time.slice(0,2))}:value;}));putTheme(p.data?.theme??'light');loaded.current=true;setReady(true);
 }
 useEffect(()=>{load().catch(e=>setError(e.message??String(e)));},[userId]);
 async function write(operation:()=>Promise<void>){if(!loaded.current||locked.current)return;locked.current=true;setPending(true);setError('');try{await operation();await load();}catch(e){setError(e instanceof Error?e.message:(e as {message?:string}).message??String(e));try{await load();}catch{setReady(false);}}finally{locked.current=false;setPending(false);}}
 function setTasks(action:SetStateAction<Task[]>){void write(async()=>{const next=typeof action==='function'?action(tasks):action;for(const t of next){const old=tasks.find(x=>x.id===t.id);if(JSON.stringify(t)===JSON.stringify(old))continue;
   const taskFields={id:t.id,user_id:userId,title:t.title,description:t.description??'',reference_url:t.link||null,area:t.area==='Pessoal'?'personal':'professional',duration_minutes:t.minutes,due_date:t.due||null,status:t.done?'completed':t.situation==='waiting'?'waiting':'todo',waiting_for:t.waitingFor||null,follow_up_date:t.followUp||null};
   await check(old?supabase.from('torre_tasks').update(taskFields).eq('id',t.id):supabase.from('torre_tasks').insert(taskFields));
   if(JSON.stringify(t.labelIds??[])!==JSON.stringify(old?.labelIds??[])){await check(supabase.rpc('torre_set_task_labels',{p_task:t.id,p_labels:t.labelIds??[]}));}
   if(t.at!==old?.at){if(!t.at)await check(supabase.from('torre_scheduled_blocks').delete().eq('task_id',t.id));else {const existing=await supabase.from('torre_scheduled_blocks').select('id').eq('task_id',t.id).maybeSingle();if(existing.error)throw existing.error;await check(supabase.from('torre_scheduled_blocks').upsert({id:existing.data?.id??crypto.randomUUID(),user_id:userId,task_id:t.id,start_at:t.at,end_at:new Date(new Date(t.at).getTime()+t.minutes*60000).toISOString()}));}}
  }});}
 function setHours(action:SetStateAction<Hours[]>){void write(async()=>{const next=typeof action==='function'?action(hours):action;await check(supabase.from('torre_work_hours').upsert(next.map((h,weekday)=>({user_id:userId,weekday,enabled:h.enabled,start_time:`${String(h.start).padStart(2,'0')}:00`,end_time:`${String(h.end).padStart(2,'0')}:00`}))));});}
 function setTheme(value:'light'|'dark'){void write(async()=>{await check(supabase.from('torre_preferences').upsert({user_id:userId,theme:value}));});}
 return {tasks,setTasks,hours,setHours,theme,setTheme,ready,pending,error,retry:()=>{setError('');void load().catch(e=>setError(e.message));}};
}
