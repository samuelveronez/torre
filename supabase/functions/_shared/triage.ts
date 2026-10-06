export interface TriageInput {text:string;labels:{id:string;name:string;description:string}[]}
export interface TriageResult {title:string;description:string;labelIds:string[];area?:'personal'|'professional';durationMinutes?:number;dueDate?:string;situation?:'todo'|'waiting';waitingFor?:string;followUpDate?:string}
export interface TriageProvider {triage(input:TriageInput,credential:string,model:string):Promise<TriageResult>}
export function validateTriage(result:TriageResult,input:TriageInput):TriageResult {
 if(!result||typeof result.title!=='string'||!result.title.trim()||result.title.length>180||typeof result.description!=='string'||!Array.isArray(result.labelIds))throw new Error('Resposta de triagem inválida');
 if(result.labelIds.some(id=>!input.labels.some(label=>label.id===id)))throw new Error('Label não autorizada');
 if(result.area!==undefined&&!['personal','professional'].includes(result.area))throw new Error('Área inválida');
 if(result.durationMinutes!==undefined&&(!Number.isInteger(result.durationMinutes)||result.durationMinutes<5||result.durationMinutes>480||result.durationMinutes%5))throw new Error('Duração inválida');
 if(result.dueDate!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(result.dueDate)||new Date(result.dueDate).toISOString().slice(0,10)!==result.dueDate))throw new Error('Data inválida');
 if(result.situation!==undefined&&!['todo','waiting'].includes(result.situation))throw new Error('Situação inválida');
 if(result.situation==='waiting'&&(typeof result.waitingFor!=='string'||!result.waitingFor.trim()||result.waitingFor.length>180||typeof result.followUpDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(result.followUpDate)||!Number.isFinite(Date.parse(result.followUpDate))||new Date(result.followUpDate).toISOString().slice(0,10)!==result.followUpDate))throw new Error('Espera sem responsável ou acompanhamento válido');
 return {...result,labelIds:[...new Set(result.labelIds)]};
}
