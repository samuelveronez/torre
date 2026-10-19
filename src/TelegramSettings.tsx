import {useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Sw} from './ui-kit/Sw';
import {SectionHeader} from './ui-kit/SectionHeader';

async function telegram(action:string,fields:Record<string,unknown>={}){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Entre na Torre.');
 const response=await fetch('https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-telegram-settings',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...fields})});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Não foi possível salvar o Telegram.'),{code:data.code,testAfter:data.testAfter});return data;
}
type Delivery={digest_date:string;state:string;sent_at:string|null;error:string|null};
const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
export function TelegramSettings({userId}:{userId:string}){
 const [name,setName]=useState('torre_veronez_bot'),[token,setToken]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(true),[loaded,setLoaded]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const [linked,setLinked]=useState(false),[enabled,setEnabled]=useState(false),[weekdays,setWeekdays]=useState<number[]>([0,1,2,3,4,5,6]),[sendTime,setSendTime]=useState('21:00'),[link,setLink]=useState(''),[last,setLast]=useState<Delivery|null>(null);
 const [testAfter,setTestAfter]=useState<string|null>(null),[now,setNow]=useState(Date.now());
 const remaining=Math.max(0,Math.ceil(((testAfter?Date.parse(testAfter):0)-now)/1000));
 useEffect(()=>{if(!testAfter)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[testAfter]);
 function apply(data:any){setName(data.botName||'torre_veronez_bot');setSaved(data.hasToken);setLinked(data.linked);setEnabled(data.enabled);setWeekdays(data.weekdays);setSendTime(data.sendTime);setLast(data.last);setTestAfter(data.testAfter||null);setNow(Date.now());setLoaded(true);}
 useEffect(()=>{let active=true;setBusy(true);setLoaded(false);setToken('');telegram('status').then(data=>{if(active)apply(data);}).catch(()=>{if(active){setMessage('Não foi possível carregar as configurações. Reabra esta seção para tentar novamente.');setFailed(true);}}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[userId]);
 useEffect(()=>{
  if(!link||linked)return;
  let active=true,inFlight=false;const expires=Date.now()+10*60000;
  const check=async()=>{if(!active||inFlight||document.visibilityState==='hidden')return;if(Date.now()>expires){setLink('');setMessage('O link expirou. Clique em Vincular meu Telegram para gerar outro.');return;}inFlight=true;try{const data=await telegram('status');if(active&&data.linked){setLinked(true);setLink('');setFailed(false);setMessage('Chat vinculado. Você já pode enviar um resumo de teste.');}}catch{/* Keep the manual refresh available during network interruptions. */}finally{inFlight=false;}};
  const timer=window.setInterval(()=>void check(),5000);const onFocus=()=>void check();window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};
 },[link,linked,userId]);
 async function run(action:string,fields:Record<string,unknown>={},success='Configurações salvas.'){
  setBusy(true);setFailed(false);setMessage('');try{const data=await telegram(action,fields);if(action==='test'){
   if(data.delivered!==true)throw new Error('O Telegram não confirmou a entrega. Confira o chat antes de tentar novamente.');
   setTestAfter(data.testAfter||new Date(Date.now()+60000).toISOString());setNow(Date.now());setMessage(success);
   try{const status=await telegram('status');setLinked(status.linked);setLast(status.last);setTestAfter(status.testAfter||data.testAfter||null);}catch{setMessage(success+' Não foi possível atualizar o estado da tela; a entrega já foi confirmada.');}
  }else if(action==='link'){setLink(data.url);setMessage('Abra o link abaixo e toque em Iniciar. O link vale por 10 minutos.');}else{if(action==='save'||action==='remove'){setToken('');setLink('');}apply(await telegram('status'));setMessage(success);}}catch(e){const error=e as Error&{code?:string;testAfter?:string};if(error.code==='TEST_COOLDOWN'){setTestAfter(error.testAfter||null);setNow(Date.now());setLinked(true);}if(error.code==='CHAT_NOT_LINKED')setLinked(false);setFailed(true);setMessage(error.message);}finally{setBusy(false);}
 }
 const h3={margin:0,fontSize:15,fontWeight:600} as const;
 const fields={border:0,padding:0,margin:0,minWidth:0,display:'flex',flexDirection:'column',gap:12} as const;
 const field={display:'flex',flexDirection:'column',gap:6} as const;
 const deliveryText=last?`Último envio automático (${new Date(last.digest_date+'T12:00:00').toLocaleDateString('pt-BR')}): ${{sent:'Enviado',generating:'Gerando resumo',sending:'Enviando',error:'Falha',uncertain:'Sem confirmação de entrega'}[last.state]||last.state}${last.error?` · ${last.error}`:''}`:saved?'Token salvo. Vincule seu chat para receber os resumos.':'Cadastre o bot e vincule seu chat.';
 return <>
  <SectionHeader title="Telegram" description="Capture ideias e receba lembretes pelo bot da Torre."/>
  <div className="tbl" aria-busy={busy}><div className="tr" style={{borderTop:0,minHeight:56}}>
   <span style={{width:8,height:8,borderRadius:'50%',background:linked?'#16a34a':'#a1a1aa',flex:'0 0 auto'}}/>
   <div style={{flex:1}}><div style={{fontWeight:500}}>{linked?'Conta vinculada':'Chat não vinculado'}</div><p className="desc">{deliveryText}</p></div>
   {linked&&<span className="badge">Ativo</span>}
  </div></div>
  <form onSubmit={e=>{e.preventDefault();void run('save',{botName:name,token});}} style={{display:'flex',flexDirection:'column',gap:12}}>
   <h3 style={h3}>Bot</h3><p className="desc">Cadastre o bot que será usado pela Torre de Controle.</p>
   <fieldset disabled={busy||!loaded} style={fields}>
    <div style={field}><label className="lab" htmlFor="telegram-bot">Nome do bot</label><input id="telegram-bot" className="inp" value={name} onChange={e=>setName(e.target.value)} required maxLength={33} placeholder="@torre_veronez_bot" autoCapitalize="none" spellCheck={false}/></div>
    <div style={field}><label className="lab" htmlFor="telegram-token">Token do BotFather</label><input id="telegram-token" className="inp" type="password" value={token} onChange={e=>setToken(e.target.value)} required={!saved} maxLength={256} placeholder={saved?'Token salvo · preencha para substituir':'Cole o token fornecido pelo BotFather'} autoComplete="new-password" spellCheck={false}/><p className="desc">{saved?'Token armazenado com segurança. Deixe vazio para mantê-lo.':'O token não será exibido após salvar.'}</p></div>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button className="btn btn-p" type="submit">Salvar credenciais</button>{saved&&<button className="btn btn-d" type="button" onClick={()=>void run('remove',{},'Credenciais removidas e lembrete desativado.')}>Remover credenciais</button>}</div>
   </fieldset>
  </form>
  <hr className="sep"/>
  <div style={{display:'flex',flexDirection:'column',gap:12}}>
   <h3 style={h3}>Seu chat</h3>
   <p className="desc">{linked?'Chat vinculado à sua conta.':'Vincule seu chat para receber os resumos da sua conta.'}</p>
   <ol className="desc" style={{margin:0,paddingLeft:18,display:'flex',flexDirection:'column',gap:4}}><li>Gere um link de vinculação.</li><li>Abra o link e toque em <strong>Iniciar</strong> no bot.</li><li>Envie um resumo de teste para confirmar a entrega.</li></ol>
   <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button className="btn btn-p" disabled={busy||!saved} onClick={()=>void run('link')}>{linked?'Vincular outro chat':'Vincular meu Telegram'}</button><button className="btn" disabled={busy||!saved} onClick={()=>void run('status',{},'Estado da conexão atualizado.')}>Atualizar conexão</button></div>
   {link&&<p><a href={link} target="_blank" rel="noreferrer" style={{color:'var(--primary)'}}>Abrir bot e vincular meu chat</a></p>}
  </div>
  <hr className="sep"/>
  <form onSubmit={e=>{e.preventDefault();void run('schedule',{enabled,weekdays,sendTime},'Lembrete salvo.');}} style={{display:'flex',flexDirection:'column',gap:12}}>
   <h3 style={h3}>Resumo diário com IA</h3>
   <p className="desc">Fechamento do dia do envio e preparação do dia seguinte, com tarefas concluídas, pendências, acompanhamentos e agenda disponível na Torre.</p>
   <fieldset disabled={busy||!saved||!loaded} style={fields}>
    <div style={{display:'flex',alignItems:'center',gap:10}}><Sw checked={enabled} label="Ativar envio automático" disabled={busy||!saved||!loaded} onChange={setEnabled}/><span style={{fontWeight:500}}>Ativar envio automático</span></div>
    <div style={field}><span className="lab">Dias de envio</span><div role="group" aria-label="Dias de envio" style={{display:'flex',flexWrap:'wrap',gap:8}}>{days.map((day,index)=><label key={day} className="badge" style={{height:30,gap:6,cursor:'pointer',flexDirection:'row'}}><input style={{width:16,height:16,minHeight:0,padding:0,margin:0}} type="checkbox" checked={weekdays.includes(index)} onChange={e=>setWeekdays(current=>e.target.checked?[...current,index]:current.filter(d=>d!==index))}/>{day}</label>)}</div></div>
    <div style={field}><label className="lab" htmlFor="telegram-time">Horário de envio</label><input id="telegram-time" className="inp" style={{width:140}} type="time" required value={sendTime} onChange={e=>setSendTime(e.target.value)}/><p className="desc">Horário de Brasília · envio normalmente em até um minuto após o horário escolhido. O site pode estar fechado.</p></div>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="submit" className="btn btn-p" disabled={!weekdays.length}>Salvar lembrete</button><button type="button" className="btn" disabled={!linked||remaining>0} aria-describedby={!linked?'telegram-send-help':undefined} onClick={()=>void run('test',{},'Resumo de teste enviado ao seu Telegram.')}>{remaining>0?`Aguarde ${remaining}s`:'Enviar resumo de teste'}</button></div>
    {!linked&&<p className="desc" id="telegram-send-help">Para liberar o envio, clique em Vincular meu Telegram, abra o link e toque em Iniciar no bot. O vínculo será reconhecido automaticamente ao voltar; você também pode clicar em Atualizar conexão.</p>}
   </fieldset>
   <p className="desc">A IA usa a chave OpenRouter cadastrada em Configurações → Inteligência artificial. O resumo reflete os dados já registrados e a última sincronização da agenda.</p>
  </form>
  {busy&&<p className="desc" role="status">Processando…</p>}
  <p role={failed?'alert':'status'} className="desc" style={failed?{color:'var(--tc-danger)'}:undefined}>{message}</p>
 </>;
}
