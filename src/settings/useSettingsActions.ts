import {useEffect,useState} from 'react';
import {supabase} from '@/supabase';
import {ensure,invoke,type Features} from '../features';

// Ações compartilhadas pelas seções de integração: feedback de progresso, execução e gravação por tabela.
export function useSettingsActions(features:Features,userId:string,section:string){
 const [feedback,setFeedback]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{setFeedback('');setFailed(false);},[section]);

 const report=async(progress:string,success:string,action:()=>Promise<boolean>)=>{
  setFeedback(progress);
  setFailed(false);
  const ok=await action();
  setFeedback(ok?success:'Não foi possível concluir a alteração. Tente novamente.');
  setFailed(!ok);
  return ok;
 };

 const run=(action:()=>Promise<unknown>,success='Alteração salva.')=>report('Salvando alteração…',success,()=>features.run(action));

 const refresh=()=>report('Atualizando listas e permissões…','Listas e permissões atualizadas. Se o Google concedeu acesso aos detalhes, a opção já está disponível.',()=>features.run(()=>invoke('discover')));

 const patch=(table:string,id:string,value:Record<string,unknown>)=>run(async()=>{
  await ensure(supabase.from(table).update(value).eq('user_id',userId).eq('id',id));
  if(table==='torre_calendars'&&features.google?.connected){
   const start=new Date();
   start.setDate(start.getDate()-start.getDay()+1);
   start.setHours(0,0,0,0);
   await invoke('sync',{start:start.toISOString(),end:new Date(start.getTime()+7*86400000).toISOString()});
  }
 });

 const insert=(table:string,value:Record<string,unknown>)=>run(async()=>{
  await ensure(supabase.from(table).insert({user_id:userId,...value}));
 });

 const message=(feedback||features.working)?(failed?(features.error||feedback):feedback||'Atualizando…'):'';
 return {message,failed,report,run,refresh,patch,insert};
}
export type SettingsActions=ReturnType<typeof useSettingsActions>;
