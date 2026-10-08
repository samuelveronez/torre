import {capturePipeline,type CaptureResult} from './capturePipeline.ts';
import {triageMany} from './intelligence.ts';
export const evaluationPeople=[{id:'10000000-0000-4000-8000-000000000001',name:'Ana Costa'},{id:'10000000-0000-4000-8000-000000000002',name:'Ana Lima'},{id:'10000000-0000-4000-8000-000000000003',name:'João Silva'}];
export const evaluationLabels=[{id:'casa',name:'Casa',description:'Manutenção, compras e rotina doméstica; não trabalho profissional.'},{id:'cliente',name:'Cliente',description:'Propostas, contratos e entregas de trabalho para clientes.'}];
const families=[
 ['Comprar ração para meu cachorro amanhã.','personal','todo','2026-10-09',null,null,'casa'],
 ['Consertar a torneira da minha casa até sexta-feira.','personal','todo','2026-10-09',null,null,'casa'],
 ['Preparar jantar em casa.','personal','todo',null,null,null,'casa'],
 ['Comprar frutas para minha casa até 12/10/2026.','personal','todo','2026-10-12',null,null,'casa'],
 ['Ler um livro no fim de semana.','personal','todo',null,null,null,null],
 ['Enviar proposta de trabalho ao cliente Ana Costa até amanhã.','professional','todo','2026-10-09',null,'10000000-0000-4000-8000-000000000001','cliente'],
 ['Já enviei o contrato ao cliente e aguardo Ana Costa. Acompanhar sexta-feira. Entrega até 12/10/2026.','professional','waiting','2026-10-12','2026-10-09','10000000-0000-4000-8000-000000000001','cliente'],
 ['Cobrar João Silva sobre a proposta de trabalho para o cliente.','professional','todo',null,null,'10000000-0000-4000-8000-000000000003','cliente'],
 ['O cliente João Silva ficou de enviar o contrato de trabalho.','professional','waiting',null,'2026-10-09','10000000-0000-4000-8000-000000000003','cliente'],
 ['Aguardo resposta da equipe financeira sobre o contrato do cliente; acompanhar amanhã.','professional','waiting',null,'2026-10-09',null,'cliente'],
 ['Comprar remédio para mim até 10/10/2026.','personal','todo','2026-10-10',null,null,null],
 ['Levar meu cachorro ao veterinário.','personal','todo',null,null,null,null],
 ['Limpar a cozinha da minha casa até domingo.','personal','todo','2026-10-11',null,null,'casa'],
 ['Não estou aguardando Ana Costa: eu preciso enviar a proposta de trabalho para o cliente.','professional','todo',null,null,'10000000-0000-4000-8000-000000000001','cliente'],
 ['Cliente Ana ficou de aprovar a proposta de trabalho; acompanhar em dois dias.','professional','waiting',null,'2026-10-10',null,'cliente'],
 ['Enviar contrato de trabalho ao cliente Beatriz Nunes até 15/10.','professional','todo','2026-10-15',null,null,'cliente'],
 ['Aguardo o cliente Beatriz Nunes aprovar a proposta de trabalho; acompanhar sexta.','professional','waiting',null,'2026-10-09',null,'cliente'],
 ['Entregar relatório de trabalho para o cliente até 05/10/2026.','professional','todo','2026-10-05',null,null,'cliente'],
 ['O cliente Ana Lima ficou de devolver a proposta de trabalho; acompanhar 20/10/2026.','professional','waiting',null,'2026-10-20','10000000-0000-4000-8000-000000000002','cliente'],
 ['Responder ao cliente João Silva sobre a proposta de trabalho.','professional','todo',null,null,'10000000-0000-4000-8000-000000000003','cliente']
] as const;
export const evaluationCases=Array.from({length:100},(_,i)=>{const family=i%20,variant=Math.floor(i/20),f=families[family];return {id:i+1,phase:family<10?'calibration':'holdout',text:`Caso ${i+1}: ${f[0]}${variant===1?' Não há outros prazos.':variant===2?' Preserve as pessoas mencionadas.':variant===3?' Registro pessoal desta pendência.':variant===4?' Não crie outras tarefas.':''}`,expected:{area:f[1],situation:f[2],dueDate:f[3],followUpDate:f[4],personId:f[5],labels:f[6]?[f[6]]:[]}};});
export async function evaluateCaptureBatch(key:string,profile:'free'|'luna'|'gemini'|'legacy-free',ids:number[]){
 const cases=ids.map(id=>evaluationCases.find(c=>c.id===id));if(!cases.length||cases.length>10||cases.some(c=>!c)||new Set(ids).size!==ids.length)throw new Error('Lote de avaliação inválido.');
 const input={text:cases.map(c=>c!.text).join('\n'),labels:evaluationLabels};
 const output=profile==='legacy-free'?await triageMany(input,key,'free','openrouter/free'):await capturePipeline(input,key,'free',profile,'2026-10-08',evaluationPeople);
 const sources=(output.audit as any).evidence?.map((m:any)=>m.sourceText)??(output.audit as any).items?.map((m:any)=>m.sourceText)??[];
 const rows=cases.map(c=>{const index=sources.findIndex((s:string)=>new RegExp(`Caso ${c!.id}:`).test(s)||c!.text.includes(s));const r=output.results[index] as CaptureResult|undefined;const e=c!.expected;const fields=r?{area:r.area===e.area,situation:r.situation===e.situation,dueDate:(r.dueDate??null)===e.dueDate,followUpDate:(r.followUpDate??null)===e.followUpDate,labels:JSON.stringify([...r.labelIds].sort())===JSON.stringify([...e.labels].sort()),personId:profile==='legacy-free'?null:(e.personId?r.people.some(p=>p.personId===e.personId):r.people.every(p=>p.personId===null))}:null;return {id:c!.id,phase:c!.phase,expected:e,result:r??null,fields,probabilities:(output.audit as any).answers?Object.fromEntries(Object.entries((output.audit as any).answers).filter(([name])=>name.startsWith(`task_${index}_`))):{}};});
 return {profile,rows,audit:output.audit};
}
