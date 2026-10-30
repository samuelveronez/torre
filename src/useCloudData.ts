import {defaultAgendaRange,type AgendaRange} from './AgendaRange';
import {useEffect,useRef,useState,type SetStateAction} from 'react';
import {supabase} from './supabase';
import type {Task} from './task';
import {dbTimeToHour,hourToDbTime,defaultLunch,type Lunch} from './hourClock';
export type Hours={enabled:boolean;start:number;end:number;lunch?:Lunch};
async function check(result:PromiseLike<{error:unknown}>){const {error}=await result;if(error)throw error;}
export function useCloudData(userId:string,defaults:Hours[]){
 const [tasks,putTasks]=useState<Task[]>([]),[hours,putHours]=useState(defaults),[theme,putTheme]=useState<'light'|'dark'>('light'),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const [agendaRange,putAgendaRange]=useState(defaultAgendaRange);
 const [needsRefresh,setNeedsRefresh]=useState(false);
 const locked=useRef(false),loaded=useRef(false);
 async function load(){
  await check(supabase.rpc('torre_release_expired_blocks'));
  const results=await Promise.all([supabase.from('torre_tasks').select('*').is('archived_at',null).order('created_at'),supabase.from('torre_scheduled_blocks').select('*'),supabase.from('torre_work_hours').select('*'),supabase.from('torre_preferences').select('*').maybeSingle(),supabase.from('torre_task_labels').select('*'),supabase.from('torre_task_people').select('*')]);
  for(const result of results)if(result.error)throw result.error;
  const [t,b,h,p,labels,people]=results;
  if(!p.data)await check(supabase.from('torre_preferences').insert({user_id:userId}));
  const missing=defaults.flatMap((value,weekday)=>h.data?.some(row=>row.weekday===weekday)?[]:[{user_id:userId,weekday,enabled:value.enabled,start_time:hourToDbTime(value.start),end_time:hourToDbTime(value.end)}]);
  if(missing.length)await check(supabase.from('torre_work_hours').upsert(missing,{ignoreDuplicates:true}));
  putTasks((t.data??[]).map(row=>({id:row.id,focusDate:row.focus_date??'',reservationKind:b.data?.find(block=>block.task_id===row.id)?.kind??'execution',people:people.data?.filter(p=>p.task_id===row.id).map(p=>({name:p.name,personId:p.person_id,role:p.role}))??[],priority:row.priority??'none',radarTaskId:row.radar_task_id??undefined,createdAt:row.created_at,capturePosition:row.capture_position,labelIds:labels.data?.filter(l=>l.task_id===row.id).map(l=>l.label_id)??[],captureId:row.capture_id,googleTaskId:row.google_task_id,title:row.title,area:row.area==='personal'?'Pessoal':'Profissional',minutes:row.duration_minutes,due:row.due_date??'',source:row.source==='torre'?'Torre':'Google Tasks',done:row.status==='completed',situation:row.status==='waiting'?'waiting':'todo',description:row.description,link:row.reference_url??'',waitingFor:row.waiting_for??'',followUp:row.follow_up_date??'',at:b.data?.find(block=>block.task_id===row.id)?.start_at})));
  const lunch:Lunch=p.data?.lunch_start?{enabled:p.data.lunch_enabled,start:dbTimeToHour(p.data.lunch_start),end:dbTimeToHour(p.data.lunch_end)}:defaultLunch;
  putHours(defaults.map((value,weekday)=>{const row=h.data?.find(r=>r.weekday===weekday);return {...(row?{enabled:row.enabled,start:dbTimeToHour(row.start_time),end:dbTimeToHour(row.end_time)}:value),lunch};}));putTheme(p.data?.theme??'light');putAgendaRange({start:p.data?.agenda_start_hour??7,end:p.data?.agenda_end_hour??22});loaded.current=true;setReady(true);
 }
 useEffect(()=>{load().catch(e=>setError(e.message??String(e)));},[userId]);
 async function write(operation:()=>Promise<void>){
  if(!loaded.current||locked.current)return false;
  locked.current=true;
  setPending(true);
  setError('');
  try{
   await operation();
   await load();
   return true;
  }catch(e){
   setError(e instanceof Error?e.message:(e as {message?:string}).message??String(e));
   try{
    await load();
   }catch{
    // Mantém a lista carregada e impede gravações com dados desatualizados.
    loaded.current=false;
    setNeedsRefresh(true);
   }
   return false;
  }finally{
   locked.current=false;
   setPending(false);
  }
 }
 async function retry(){
  if(locked.current)return;
  locked.current=true;
  setPending(true);
  setError('');
  try{
   await load();
   setNeedsRefresh(false);
  }catch(e){
   setError(e instanceof Error?e.message:(e as {message?:string}).message??String(e));
  }finally{
   locked.current=false;
   setPending(false);
  }
 }
 function setTasks(action:SetStateAction<Task[]>){return write(async()=>{const next=typeof action==='function'?action(tasks):action;for(const old of tasks){if(!next.some(t=>t.id===old.id))await check(supabase.from('torre_tasks').update({archived_at:new Date().toISOString()}).eq('id',old.id));}for(const t of next){const old=tasks.find(x=>x.id===t.id);if(JSON.stringify(t)===JSON.stringify(old))continue;
   const taskFields={radar_task_id:t.radarTaskId||null,focus_date:t.focusDate||null,priority:t.priority??'none',id:t.id,user_id:userId,title:t.title,description:t.description??'',reference_url:t.link||null,area:t.area==='Pessoal'?'personal':'professional',duration_minutes:t.minutes,due_date:t.due||null,status:t.done?'completed':t.situation==='waiting'?'waiting':'todo',waiting_for:t.waitingFor||null,follow_up_date:t.followUp||null};
   await check(supabase.rpc('torre_save_task',{p_task:t.id,p_fields:taskFields,p_at:t.at??null,p_kind:t.reservationKind??'execution'}));
   if(JSON.stringify(t.people??[])!==JSON.stringify(old?.people??[])){await check(supabase.rpc('torre_set_task_people',{p_task:t.id,p_people:t.people??[]}));}
   if(JSON.stringify(t.labelIds??[])!==JSON.stringify(old?.labelIds??[])){await check(supabase.rpc('torre_set_task_labels',{p_task:t.id,p_labels:t.labelIds??[]}));}

  }});}
 function setHours(action:SetStateAction<Hours[]>){return write(async()=>{const next=typeof action==='function'?action(hours):action;await check(supabase.from('torre_work_hours').upsert(next.map((h,weekday)=>({user_id:userId,weekday,enabled:h.enabled,start_time:hourToDbTime(h.start),end_time:hourToDbTime(h.end)}))));});}
 function setLunch(lunch:Lunch){return write(async()=>{await check(supabase.from('torre_preferences').upsert({user_id:userId,lunch_enabled:lunch.enabled,lunch_start:hourToDbTime(lunch.start),lunch_end:hourToDbTime(lunch.end)}));});}
 function setTheme(value:'light'|'dark'){void write(async()=>{await check(supabase.from('torre_preferences').upsert({user_id:userId,theme:value}));});}
 function setAgendaRange(range:AgendaRange){return write(async()=>{await check(supabase.from('torre_preferences').upsert({user_id:userId,agenda_start_hour:range.start,agenda_end_hour:range.end}));});}
 return {agendaRange,setAgendaRange,tasks,setTasks,hours,setHours,setLunch,theme,setTheme,ready,pending,error,needsRefresh,retry};
}
