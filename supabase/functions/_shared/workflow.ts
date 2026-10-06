import type {TriageResult} from './triage.ts';
export function waitingDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function validDate(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function enrichWaiting(results:TriageResult[],sources:{sourceText:string}[],data:any,today:string){
 if(!validDate(today))throw new Error('Data de referência inválida.');
 const nextDay=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const waiting=results.map((r,i)=>({r,i})).filter(x=>x.r.situation==='waiting');
 if(!Array.isArray(data?.items)||data.items.length!==waiting.length)throw new Error('Dados de espera incompletos.');
 const seen=new Set<number>();
 for(const item of data.items){if(!Number.isInteger(item.index)||seen.has(item.index)||!waiting.some(x=>x.i===item.index))throw new Error('Dados de espera inválidos.');seen.add(item.index);}
 return results.map((result,i)=>{
 if(result.situation!=='waiting')return {...result,situation:'todo' as const};
 const item=data.items.find((x:any)=>x.index===i),source=sources[i].sourceText;
 if(item.waitingFor!==null&&(typeof item.waitingFor!=='string'||!item.waitingFor.trim()||item.waitingFor.length>180||!source.includes(item.waitingFor)))throw new Error('Responsável sem referência no texto original.');
 const explicit=item.followUpDate!==null;
 if(explicit&&(!validDate(item.followUpDate)||typeof item.dateEvidence!=='string'||!item.dateEvidence.trim()||!source.includes(item.dateEvidence)))throw new Error('Acompanhamento sem referência válida no texto original.');
 const followUpDate=explicit?item.followUpDate:nextDay;
 return {...result,waitingFor:item.waitingFor??'Responsável não informado',followUpDate,description:result.description+(!explicit?'\n\nAcompanhamento sugerido automaticamente para '+followUpDate+'; ajuste se necessário.':'')};
 });
}
