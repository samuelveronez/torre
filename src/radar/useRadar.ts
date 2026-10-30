import {useCallback,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/supabase';
import {defaultInterval,newThemeArgs,nextReviewDate,saoPauloDay,type Interval,type RadarRecord,type Temperature,type ThemeDraft} from './radarModel';

type Row={task_id:string;temperature:Temperature;review_interval_days:Interval;next_review_date:string|null;last_reviewed_at:string|null;notes:string};
const toRecord=(row:Row):RadarRecord=>({taskId:row.task_id,temperature:row.temperature,intervalDays:row.review_interval_days,nextReview:row.next_review_date,lastReviewedAt:row.last_reviewed_at,notes:row.notes});
const message=(error:unknown)=>error instanceof Error?error.message:(error as {message?:string})?.message??String(error);

/** Carrega os registros de `torre_radar` e cria os que faltam para os temas atuais (RN12, idempotente). */
export function useRadar(userId:string,themeIds:string[]){
 const [records,setRecords]=useState<Record<string,RadarRecord>>({});
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const idsKey=useMemo(()=>[...themeIds].sort().join(','),[themeIds]);

 const load=useCallback(async()=>{
  const {data,error:failure}=await supabase.from('torre_radar').select('*').eq('user_id',userId);
  if(failure)throw failure;
  setRecords(Object.fromEntries((data as Row[]).map(row=>[row.task_id,toRecord(row)])));
 },[userId]);

 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   try{
    const {data,error:failure}=await supabase.from('torre_radar').select('task_id').eq('user_id',userId);
    if(failure)throw failure;
    const have=new Set((data??[]).map(row=>row.task_id));
    const missing=idsKey?idsKey.split(',').filter(id=>!have.has(id)):[];
    if(missing.length){
     const first=nextReviewDate(new Date(),defaultInterval);
     const {error:insertFailure}=await supabase.from('torre_radar').upsert(missing.map(id=>({task_id:id,user_id:userId,next_review_date:first})),{onConflict:'task_id',ignoreDuplicates:true});
     if(insertFailure)throw insertFailure;
    }
    await load();
    if(!cancelled){setError('');setReady(true);}
   }catch(failure){
    if(!cancelled){setError(message(failure));setReady(true);}
   }
  })();
  return()=>{cancelled=true;};
 },[userId,idsKey,load]);

 async function update(taskId:string,fields:Record<string,unknown>){
  const {error:failure}=await supabase.from('torre_radar').update({...fields,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('task_id',taskId);
  if(failure){setError(message(failure));return false;}
  setError('');
  await load();
  return true;
 }
 /** Cria tarefa-tema, etiqueta, registro e pessoa numa única RPC (RF11, CA11). Devolve o id do tema ou a mensagem de erro. */
 async function createTheme(draft:ThemeDraft,ensurePerson:(name:string)=>Promise<{id:string;name:string}>,refresh:()=>Promise<void>):Promise<{id:string}|{error:string}>{
  try{
   const name=draft.personName.trim();
   const person=name?await ensurePerson(name):null;
   const id=crypto.randomUUID();
   const {error:failure}=await supabase.rpc('torre_create_radar_theme',newThemeArgs(id,draft,person?[{name:person.name,personId:person.id,role:'involved'}]:[]));
   if(failure)return {error:message(failure)};
   await Promise.all([refresh(),load()]);
   return {id};
  }catch(failure){
   return {error:message(failure)};
  }
 }
 return {
  records,ready,error,createTheme,
  /** Grava a configuração do tema sem tocar na revisão confirmada (RN06). */
  saveSettings:(taskId:string,draft:Pick<ThemeDraft,'temperature'|'intervalDays'|'nextReview'|'notes'>)=>update(taskId,{temperature:draft.temperature,review_interval_days:draft.intervalDays,next_review_date:draft.nextReview||null,notes:draft.notes}),
  /** Confirma a revisão: grava a data e agenda a próxima a partir de hoje (RN06). */
  review:(taskId:string,interval:Interval)=>update(taskId,{last_reviewed_at:new Date().toISOString(),next_review_date:nextReviewDate(new Date(),interval)}),
  today:saoPauloDay(),
 };
}
