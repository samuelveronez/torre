import {useState} from 'react';
import {invoke,type Features} from '../features';
import {AiModelSettings} from '../AiModelSettings';
import {CaptureEvaluation} from '../CaptureEvaluation';
import {captureDefault,captureProfileNames,type CaptureProfile} from '../captureProfiles';
import {Sw} from '../ui-kit/Sw';
import {SectionHeader} from '../ui-kit/SectionHeader';
import {Feedback} from './Feedback';
import type {SettingsActions} from './useSettingsActions';

type Props={features:Features;actions:SettingsActions};

export function AiSection({features:f,actions}:Props){
 const [key,setKey]=useState(''),[replacing,setReplacing]=useState(false);
 const hasKey=!!f.ai?.has_key;
 const enabled=!!f.ai?.enabled;
 const editingKey=!hasKey||replacing;
 const profile=captureDefault(f.ai??null);
 const saveKey=(e:React.FormEvent)=>{
  e.preventDefault();
  void actions.run(async()=>{await invoke('ai-key',{key});setKey('');setReplacing(false);});
 };
 const [tested,setTested]=useState('');
 const testAgent=async()=>{
  setTested('');
  let model='';
  const ok=await actions.report('Testando o modelo padrão com texto sintético…','',()=>f.run(async()=>{const result=await invoke('agent-test');model=result.model;}));
  if(ok)setTested('Modelo padrão validado: '+model+'. Nenhum registro foi criado.');
 };
 return <>
  <SectionHeader title="Inteligência artificial" description="Usada para organizar capturas e conversas e para sugerir sua semana."/>
  <Feedback message={actions.message} failed={actions.failed}/>
  <div className="tc-card" style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
   <div>
    <div style={{fontWeight:500}}>IA ativada</div>
    <p className="desc" role="status">{enabled?'Processamento automático de capturas ativo. ':'Processamento automático de capturas desativado. '}Sem a IA, as capturas ficam na caixa de entrada para triagem manual.</p>
   </div>
   <Sw checked={enabled} label="Ativar processamento automático" disabled={f.working||!hasKey} onChange={on=>void actions.run(()=>invoke('ai-config',{enabled:on}))}/>
  </div>
  <form onSubmit={saveKey} style={{display:'flex',flexDirection:'column',gap:6}}>
   <label className="lab" htmlFor="ai-key">Chave de API da IA</label>
   <div style={{display:'flex',gap:8}}>
    <input id="ai-key" className="inp" aria-label="Chave de API da IA" type="password" autoComplete="off" required={editingKey} disabled={!editingKey} value={editingKey?key:'••••••••••••••••••••'} onChange={e=>setKey(e.target.value)}/>
    {editingKey?<button className="btn btn-p" disabled={f.working}>Guardar chave</button>:<button type="button" className="btn" disabled={f.working} onClick={()=>setReplacing(true)}>Substituir</button>}
    {hasKey&&replacing&&<button type="button" className="btn" onClick={()=>{setReplacing(false);setKey('');}}>Cancelar</button>}
   </div>
   <p className="desc">{hasKey?'Guardada com segurança no servidor. Nunca é exibida de novo.':'Nenhuma chave cadastrada. Cadastre a chave OpenRouter para ativar a IA.'}</p>
  </form>
  <AiModelSettings features={f}/>
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
   <label className="lab" htmlFor="ai-capture-model">Modelo padrão das capturas</label>
   <select id="ai-capture-model" className="inp" value={profile} disabled={f.working||!hasKey} onChange={e=>void actions.run(()=>invoke('capture-profile',{profile:e.target.value as CaptureProfile}),'Modelo padrão das capturas salvo.')}>
    {Object.entries(captureProfileNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}
   </select>
   <p className="desc">Pode ser trocado em cada captura rápida.</p>
  </div>
  {hasKey&&<div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <button className="btn" disabled={f.working} onClick={()=>void testAgent()}>Testar modelo padrão</button>
   <button className="btn btn-d" disabled={f.working} onClick={()=>void actions.run(()=>invoke('ai-key',{remove:true}))}>Remover chave</button>
  </div>}
  {tested&&<p className="desc" role="status">{tested}</p>}
  <p className="desc">A IA só sugere. Nenhuma tarefa é criada nem reservada sem a sua confirmação.</p>
  <details className="desc">
   <summary style={{cursor:'pointer'}}>Como a IA funciona na Torre</summary>
   <p style={{marginTop:8}}>Modo IA: converse para avaliar tarefas e gerenciar tarefas e labels com o modelo padrão escolhido para toda a aplicação. A opção Analisar consulta sem alterar; Executar pedido aplica comandos e oferece desfazer. O agente pode propor reservas; revise a prévia antes de aplicar.</p>
   <p style={{marginTop:8}}>Conversas, classificação, planejamento e resumos do Telegram seguem o modelo padrão da conta. Capturas usam o modelo escolhido no campo de texto: separam listas ou texto livre em até 20 tarefas, aplicam suas labels e identificam A fazer ou Aguardando resposta. Anexos não são enviados. O texto original fica na captura; duração inicial de 30 minutos. Pessoas podem ser vinculadas ao cadastro ou mantidas como nomes livres.</p>
  </details>
  <CaptureEvaluation enabled={enabled}/>
 </>;
}
