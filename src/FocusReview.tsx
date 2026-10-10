import {useState} from 'react';
import type {Task} from './task';
import {dateKey} from './taskView';
import {Button} from './components/ui/button';
export function FocusReview({tasks,onChange}:{tasks:Task[];onChange:(id:string,date:string)=>Promise<boolean>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[deferred,setDeferred]=useState<string[]>([]);const today=dateKey(new Date());
 const pending=tasks.filter(t=>!t.done&&t.focusDate&&t.focusDate<today&&!deferred.includes(t.id));
 async function decide(id:string,date:string){setBusy(true);setError('');try{if(!await onChange(id,date))setError('Não foi possível atualizar o foco. Tente novamente.');}finally{setBusy(false);}}
 if(!pending.length)return null;
 return <section className="notice" aria-label="Revisar foco dos dias anteriores"><h2>Foco pendente dos dias anteriores</h2><p>Escolha o destino de cada tarefa. Até decidir, ela continua no dia escolhido e na lista geral.</p>{pending.map(t=><div key={t.id}><strong>{t.title}</strong> · {t.focusDate}<div className="toolbar"><Button disabled={busy} onClick={()=>void decide(t.id,today)}>Trazer para hoje</Button><Button variant="outline" disabled={busy} onClick={()=>void decide(t.id,'')}>Retirar do foco</Button><Button variant="ghost" disabled={busy} onClick={()=>setDeferred(ids=>[...ids,t.id])}>Decidir depois</Button></div></div>)}{error&&<p role="alert">{error}</p>}</section>;
}
