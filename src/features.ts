import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
export type Label={id:string;name:string;description:string;color:string;archived:boolean};
export type Capture={id:string;body:string;title:string;state:string;error:string|null;created_at:string};
export type Attachment={id:string;capture_id:string;name:string;path:string;size:number;state:string;error:string|null};
export type Calendar={id:string;name:string;color:string;selected:boolean;mode:'busy'|'details';access_role:string;blocks_time:boolean};
export type CalendarEvent={id:string;calendar_id:string;title:string;location:string|null;start_at:string;end_at:string;all_day:boolean;blocks_time:boolean};
export type GoogleStatus={connected:boolean;email:string;calendar_synced_at:string|null;tasks_synced_at:string|null;range_start:string|null;range_end:string|null;error:string|null;notice:string|null};
export async function invoke(action:string,fields:Record<string,unknown>={}){
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entre novamente.');
 const response=await fetch('https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-integrations',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...fields})});
 const data=await response.json();if(!response.ok)throw new Error(data.error??'Falha na integração.');return data;
}
export async function ensure<T extends {error:unknown}>(promise:PromiseLike<T>){const value=await promise;if(value.error)throw value.error;return value;}
export function useFeatures(userId:string,start:Date,onTasks:()=>void){
 const [labels,setLabels]=useState<Label[]>([]),[captures,setCaptures]=useState<Capture[]>([]),[attachments,setAttachments]=useState<Attachment[]>([]),[calendars,setCalendars]=useState<Calendar[]>([]),[events,setEvents]=useState<CalendarEvent[]>([]),[lists,setLists]=useState<{id:string;name:string;selected:boolean;area:string}[]>([]),[google,setGoogle]=useState<GoogleStatus|null>(null),[ai,setAi]=useState<{has_key:boolean;provider:string|null;model:string|null}|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const lock=useRef(false),googleRef=useRef<GoogleStatus|null>(null),tasksRefresh=useRef(onTasks);tasksRefresh.current=onTasks;
 const from=start.toISOString(),to=new Date(start.getTime()+7*86400000).toISOString();
 async function load(){const tables=['torre_labels','torre_captures','torre_attachments','torre_calendars','torre_calendar_events','torre_google_lists','torre_google_status','torre_ai_settings'];const values=await Promise.all(tables.map(table=>supabase.from(table).select('*').eq('user_id',userId)));for(const value of values)if(value.error)throw value.error;
 setLabels(values[0].data??[]);setCaptures(values[1].data??[]);setAttachments(values[2].data??[]);setCalendars(values[3].data??[]);setEvents(values[4].data??[]);setLists(values[5].data??[]);const g=values[6].data?.[0]??null;setGoogle(g);googleRef.current=g;setAi(values[7].data?.[0]??null);}
 async function run(action:()=>Promise<unknown>){if(lock.current)return;lock.current=true;setWorking(true);setError('');try{await action();await load();tasksRefresh.current();}catch(e){setError((e as Error).message??'Não foi possível salvar.');await load().catch(()=>{});}finally{lock.current=false;setWorking(false);}}
 async function sync(){if(!googleRef.current?.connected)return;await run(async()=>{try{await invoke('sync',{start:from,end:to});}catch(e){setGoogle(g=>g?{...g,error:(e as Error).message}:g);throw e;}});}
 useEffect(()=>{void load().then(()=>sync()).catch(e=>setError(e.message));const timer=setInterval(()=>void sync(),300000);return()=>clearInterval(timer);},[userId,from]);
 async function upload(a:Attachment,file:File){
 if(file.size>20*1024*1024||file.size!==a.size||file.name!==a.name)throw new Error('Selecione o mesmo arquivo, até 20 MB.');
 try{await ensure(supabase.from('torre_attachments').update({state:'uploading',error:null}).eq('id',a.id));const existing=await supabase.storage.from('torre-attachments').createSignedUrl(a.path,60);if(existing.error)await ensure(supabase.storage.from('torre-attachments').upload(a.path,file,{upsert:false,contentType:'application/octet-stream'}));await ensure(supabase.from('torre_attachments').update({state:'uploaded',error:null}).eq('id',a.id));}
 catch(e){await supabase.from('torre_attachments').update({state:'error',error:(e as Error).message}).eq('id',a.id);throw e;}
 }
 async function capture(id:string,text:string,files:File[]){if(files.length>10||files.some(f=>f.size>20*1024*1024))throw new Error('Até dez arquivos, com 20 MB cada.');if(!text.trim()&&!files.length)throw new Error('Digite um texto ou anexe um arquivo.');
 await ensure(supabase.from('torre_captures').upsert({id,user_id:userId,body:text},{onConflict:'id',ignoreDuplicates:true}));
 const existing=await ensure(supabase.from('torre_attachments').select('*').eq('capture_id',id));
 for(const [ordinal,file] of files.entries()){const old=existing.data?.find(a=>a.ordinal===ordinal);const attachmentId=old?.id??crypto.randomUUID();const a:Attachment=old??{id:attachmentId,capture_id:id,name:file.name,size:file.size,path:`${userId}/${id}/${attachmentId}`,state:'uploading',error:null};if(!old)await ensure(supabase.from('torre_attachments').insert({...a,user_id:userId,ordinal}));if(a.state!=='uploaded')try{await upload(a,file);}catch{/* Persisted error remains retryable in inbox. */}}
 await load();
 }
 const fresh=!!google?.calendar_synced_at&&!google.error&&Date.now()-Date.parse(google.calendar_synced_at)<300000&&!!google.range_start&&!!google.range_end&&Date.parse(google.range_start)<=Date.parse(from)&&Date.parse(google.range_end)>=Date.parse(to);
 return {labels,captures,attachments,calendars,events,lists,google,ai,error,working,run,load,sync,fresh,capture,upload,
 convert:(id:string,title:string,labelIds:string[])=>run(()=>ensure(supabase.rpc('torre_convert_capture',{p_capture:id,p_title:title,p_labels:labelIds}))),
 undo:(id:string)=>run(()=>ensure(supabase.rpc('torre_undo_capture',{p_capture:id}))),
 download:async(a:Attachment)=>{const {data}=await ensure(supabase.storage.from('torre-attachments').createSignedUrl(a.path,60,{download:a.name}));window.open(data!.signedUrl,'_blank','noopener,noreferrer');}
 };
}
export type Features=ReturnType<typeof useFeatures>;
