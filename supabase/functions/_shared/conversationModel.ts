export type Owner='me'|'other'|'unknown';
export type Agreement={id:string;title:string;owner:Owner;person:string;due:string;followUp:string;followUpSuggested:boolean;minutes:number;createTask:boolean;sourceText:string;dueEvidence:string;followUpEvidence:string;taskId?:string};
export type ConversationContent={raw_text:string;check_in:string;decisions:string;agreements:Agreement[]};
export function validDate(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function weekAfter(date:string){if(!validDate(date))throw new Error('Data da conversa inválida.');return new Date(Date.parse(date+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);}
export function conversationToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function emptyAgreement():Agreement{return {id:crypto.randomUUID(),title:'',owner:'unknown',person:'',due:'',followUp:'',followUpSuggested:false,minutes:30,createTask:false,sourceText:'',dueEvidence:'',followUpEvidence:''};}
export function validateConversationExtraction(value:any,text:string,date:string):ConversationContent{
 if(!text.trim()||text.length>20000||!validDate(date))throw new Error('Texto ou data inválidos.');
 const section=(v:any)=>{if(!Array.isArray(v)||v.length>40)throw new Error('Seção inválida da conversa.');return v.map((x:any)=>{if(typeof x?.text!=='string'||!x.text.trim()||x.text.length>2000||typeof x.sourceText!=='string'||!x.sourceText.trim()||!text.includes(x.sourceText))throw new Error('Informação sem referência ao texto original.');return x.text.trim();}).join('\n');};
 const check_in=section(value?.checkIn),decisions=section(value?.decisions);
 if(!Array.isArray(value?.agreements)||value.agreements.length>20)throw new Error('Até 20 combinados por conversa.');
 const seen=new Set<string>();
 const agreements=value.agreements.map((x:any)=>{
  if(typeof x?.title!=='string'||!x.title.trim()||x.title.length>180||!['me','other','unknown'].includes(x.owner)||typeof x.sourceText!=='string'||!x.sourceText.trim()||!text.includes(x.sourceText))throw new Error('Combinado sem referência válida.');
  if(x.person!==null&&(typeof x.person!=='string'||!x.person.trim()||x.person.length>180||!text.includes(x.person)))throw new Error('Responsável sem referência no texto.');
  const evidence=(d:any,e:any)=>{if(d===null)return '';if(!validDate(d)||typeof e!=='string'||!e.trim()||!x.sourceText.includes(e))throw new Error('Data sem referência ao combinado.');return d;};
  const due=evidence(x.dueDate,x.dueEvidence),follow=evidence(x.followUpDate,x.followUpEvidence);
  const key=x.title.trim().toLocaleLowerCase('pt-BR')+'|'+x.owner+'|'+(x.person??'');if(seen.has(key))throw new Error('Combinado duplicado na interpretação.');seen.add(key);
  const owner=x.owner==='other'&&!x.person?'unknown':x.owner;
  return {...emptyAgreement(),title:x.title.trim(),owner,person:x.person??'',due,followUp:owner==='other'?(follow||weekAfter(date)):'',followUpSuggested:owner==='other'&&!follow,createTask:owner!=='unknown',sourceText:x.sourceText,dueEvidence:x.dueEvidence??'',followUpEvidence:x.followUpEvidence??''};
 });
 return {raw_text:text,check_in,decisions,agreements};
}
