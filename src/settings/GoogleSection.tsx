import type {Features} from '../features';
import {invoke} from '../features';
import {SectionHeader} from '../ui-kit/SectionHeader';
import {Feedback} from './Feedback';
import type {SettingsActions} from './useSettingsActions';

type Props={features:Features;actions:SettingsActions};

function syncText(value:string|null|undefined,done:string,missing:string){
 if(!value)return missing;
 const date=new Date(value);
 const time=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 const sameDay=date.toDateString()===new Date().toDateString();
 return `${done} ${sameDay?'hoje':date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}, ${time}`;
}

export function GoogleSection({features:f,actions}:Props){
 const connected=!!f.google?.connected;
 const connect=()=>void actions.run(async()=>{const data=await invoke('connect');window.location.assign(data.url);});
 return <>
  <SectionHeader title="Google" description="Sincroniza Google Tasks e Google Agenda com a Torre."/>
  <Feedback message={actions.message} failed={actions.failed}/>
  <div className="tbl">
   <div className="tr" style={{borderTop:0,minHeight:56}}>
    <span style={{width:8,height:8,borderRadius:'50%',background:connected?'#16a34a':'#a1a1aa',flex:'0 0 auto'}}/>
    <div style={{flex:1}}>
     <div style={{fontWeight:500}}>{connected?'Conectado':'Não conectado'}</div>
     <p className="desc">{connected?f.google?.email:'Conecte uma conta para selecionar calendários e listas.'}</p>
    </div>
    {connected&&<span className="badge">Ativo</span>}
   </div>
   {connected&&<>
    <div className="tr"><span style={{flex:1}}>Google Tasks</span><span className="desc">{syncText(f.google?.tasks_synced_at,'Sincronizado','Não sincronizado')}</span></div>
    <div className="tr"><span style={{flex:1}}>Google Agenda</span><span className="desc">{syncText(f.google?.calendar_synced_at,'Sincronizada','Não sincronizada')}</span></div>
   </>}
  </div>
  {f.google?.error&&<p className="desc" role="alert" style={{color:'var(--tc-danger)'}}>{f.google.error}</p>}
  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
   {connected?<>
    <button className="btn btn-p" disabled={f.working} onClick={()=>void actions.report('Sincronizando tarefas e agenda…','Sincronização concluída.',()=>f.sync())}>Sincronizar agora</button>
    <button className="btn" disabled={f.working} onClick={()=>void actions.refresh()}>Atualizar listas e calendários</button>
    <button className="btn" disabled={f.working} onClick={connect}>Reconectar</button>
    <span style={{flex:1}}/>
    <button className="btn btn-d" disabled={f.working} onClick={()=>void actions.run(()=>invoke('disconnect'))}>Desconectar</button>
   </>:<button className="btn btn-p" disabled={f.working} onClick={connect}>Conectar Google</button>}
  </div>
  <p className="desc">Eventos privados aparecem apenas como “Ocupado”. Você pode desconectar a qualquer momento.</p>
 </>;
}
