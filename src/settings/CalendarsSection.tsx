import type {Features} from '../features';
import {Sw} from '../ui-kit/Sw';
import {SectionHeader} from '../ui-kit/SectionHeader';
import {Feedback} from './Feedback';
import type {SettingsActions} from './useSettingsActions';

type Props={features:Features;actions:SettingsActions};

export function CalendarsSection({features:f,actions}:Props){
 const restricted=f.calendars.filter(c=>c.access_role==='freeBusyReader');
 return <>
  <SectionHeader title="Calendários e listas" description={f.google?.connected?`Conta conectada: ${f.google.email}`:'Google não conectado'} action={<button className="btn btn-sm" disabled={f.working||!f.google?.connected} onClick={()=>void actions.refresh()}>Atualizar</button>}/>
  <Feedback message={actions.message} failed={actions.failed}/>
  <div className="tbl">
   <div className="th tc-hide-m">
    <span style={{flex:1}}>Calendário</span>
    <span style={{width:170}}>Privacidade</span>
    <span style={{width:110}}>Mostrar na agenda</span>
    <span style={{width:100}}>Bloqueia horário</span>
   </div>
   {f.calendars.map(c=><div className="tr" key={c.id}>
    <span className="tc-grow" style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:10}}>
     <span style={{width:10,height:10,borderRadius:2,background:c.color,flex:'0 0 auto'}}/>
     <span>{c.name}</span>
    </span>
    <span className="tc-fixed" style={{width:170}}>
     <select className="inp" style={{height:32,fontSize:13}} aria-label={`Privacidade ${c.name}`} disabled={f.working||c.access_role==='freeBusyReader'} value={c.mode} onChange={e=>void actions.patch('torre_calendars',c.id,{mode:e.target.value})}>
      <option value="busy">Somente ocupado</option>
      <option value="details">Detalhes permitidos</option>
     </select>
    </span>
    <span className="tc-fixed" style={{width:110}}><span className="tc-only-m desc">Na agenda </span><Sw checked={c.selected} label={`Mostrar ${c.name} na agenda`} disabled={f.working} onChange={selected=>void actions.patch('torre_calendars',c.id,{selected})}/></span>
    <span className="tc-fixed" style={{width:100}}><span className="tc-only-m desc">Bloqueia </span><Sw checked={c.blocks_time} label={`Bloquear planejamento em ${c.name}`} disabled={f.working} onChange={blocks_time=>void actions.patch('torre_calendars',c.id,{blocks_time})}/></span>
   </div>)}
   {!f.calendars.length&&<div className="tr"><p className="desc">Nenhum calendário disponível. Conecte o Google e use “Atualizar”.</p></div>}
  </div>
  <div className="tbl">
   <div className="th tc-hide-m">
    <span style={{flex:1}}>Lista do Google Tasks</span>
    <span style={{width:150}}>Área</span>
    <span style={{width:110}}>Sincronizar</span>
   </div>
   {f.lists.map(l=><div className="tr" key={l.id}>
    <span className="tc-grow" style={{flex:1}}>{l.name}</span>
    <span className="tc-fixed" style={{width:150}}>
     <select className="inp" style={{height:32,fontSize:13}} aria-label={`Área da lista ${l.name}`} disabled={f.working} value={l.area} onChange={e=>void actions.patch('torre_google_lists',l.id,{area:e.target.value})}>
      <option value="personal">Pessoal</option>
      <option value="professional">Profissional</option>
     </select>
    </span>
    <span className="tc-fixed" style={{width:110}}><span className="tc-only-m desc">Sincronizar </span><Sw checked={l.selected} label={`Sincronizar ${l.name}`} disabled={f.working} onChange={selected=>void actions.patch('torre_google_lists',l.id,{selected})}/></span>
   </div>)}
   {!f.lists.length&&<div className="tr"><p className="desc">Nenhuma lista disponível.</p></div>}
  </div>
  <p className="desc">Listas: somente importação. Tarefas já importadas são gerenciadas na Torre e nada é enviado ao Google Tasks. “Somente ocupado” preserva horários sem títulos; “Detalhes permitidos” mostra títulos e respostas aos convites.</p>
  {restricted.length>0&&<div className="tc-card" style={{padding:12}}>
   <strong>Detalhes bloqueados pela permissão do Google.</strong>
   <p className="desc" style={{marginTop:4}}>Em {restricted.map(c=>c.name).join(', ')}, os eventos aparecem como “Ocupado”. Para liberar títulos e respostas, compartilhe a agenda com a conta conectada ({f.google?.email}) usando “Ver detalhes de todos os eventos”, se a empresa permitir, e depois atualize as permissões.</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
    <a className="btn btn-sm" href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noreferrer">Abrir configurações do Google Agenda</a>
    <button className="btn btn-sm" disabled={f.working} onClick={()=>void actions.refresh()}>Atualizar permissões</button>
   </div>
  </div>}
 </>;
}
